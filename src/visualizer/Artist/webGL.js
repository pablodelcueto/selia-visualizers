/**
* Sketching module.
*
* @module Artist/webGL
* @see module:visualizer/Artist/webGL
*/
import {
    VERTEX_SHADER, VERTEX_LOADING_SHADER,
    FRAGMENT_SHADER, FRAGMENT_LOADING_SHADER,
} from './Shaders/loadingShaders';
import colormapImage from './colormaps.png';

const TIME_BUFFER = 0.2;

/**
* Create GL program with the given shaders.
* @param {Object} gl - webGL context.
* @param {Object} program - webGL program.
* @param {string} vertexSource - source for the webGL vertexShader linked to program.
* @param {string} fragmentSource -source for the webGL fragmentShader linked to program.
*/
function createProgram(gl, vertexSource, fragmentSource) {
    if (!gl) {
        throw new Error('No webgl context');
    }

    const program = gl.createProgram();

    const floatTextures = gl.getExtension('OES_texture_float');
    if (!floatTextures) {
        throw new Error('no floating point texture support');
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(vertexShader);
        throw new Error(`Vertex shader compilation error: ${error}`);
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(fragmentShader);
        throw new Error(`Fragment shader compilation error: ${error}`);
    }

    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
}


/**
 * Create GL program that handles background drawing.
 */
function createBackgroundProgram(gl) {
    const program = createProgram(
        gl,
        VERTEX_LOADING_SHADER,
        FRAGMENT_LOADING_SHADER,
    );

    return {
        program,
        buffers: {
            vertices: gl.createBuffer(),
        },
        locations: {
            positions: gl.getAttribLocation(program, 'al_position'),
            matrix: gl.getUniformLocation(program, 'u_matrix'),
        },
    };
}

/**
 * Create spectrogram program.
 */
function createSpectrogramProgram(gl) {
    const program = createProgram(
        gl,
        VERTEX_SHADER,
        FRAGMENT_SHADER,
    );

    const spectrogram = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, spectrogram);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const color = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, color);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return {
        program,
        textures: {
            spectrogram,
            color,
        },
        buffers: {
            specCoords: gl.createBuffer(),
            specPos: gl.createBuffer(),
        },
        locations: {
            specPos: gl.getAttribLocation(program, 'a_position'),
            specCoords: gl.getAttribLocation(program, 'a_texcoord'),
            specTex: gl.getUniformLocation(program, 'u_texture'),
            colorTex: gl.getUniformLocation(program, 'u_color'),
            matrix: gl.getUniformLocation(program, 'u_matrix'),
            colormap: gl.getUniformLocation(program, 'u_colorMap'),
            filterInf: gl.getUniformLocation(program, 'u_minLim'),
            filterSup: gl.getUniformLocation(program, 'u_maxLim'),
        },
    };
}


function setBufferData(gl, location, buffer, data, type) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, type);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}


function bindBuffer(gl, location, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}


/**
* Class used to handle the webGL actions on the visualizerCanvas.
* Create two programs using webGL context. backgroundProgram takes care of sketching gray
* backgraound each time specProgram fills texture with new data for the spectrogram.
* @class
* @property {Object} specProgram - webGL program dealing with spectrogram layer.
* @property {Object} gl - webGL context.
* @property {Object} colorImage - bmp image.
* @property {int} matrixUniform - specProgram matrix transformation uniform location.
*/
class webGLHandler {
    /**
    * Creates a webGL handler.
    * @constructor
    * @param {Object} canvas - webGL context canvas.
    */
    constructor(canvas, stftHandler) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        this.stftHandler = stftHandler;

        this.spectrogram = createSpectrogramProgram(this.gl);
        this.background = createBackgroundProgram(this.gl);

        // Data used to avoid extra computations.
        this.loaded = {
            start: 0,
            end: 0,
        };

        // Image used to extract the colorMaps.
        const colorImage = new Image(100, 100);
        colorImage.src = colormapImage;
        colorImage.onload = () => this.init(colorImage);
    }

    /**
     * Sets spectrogram textures, the one asigning stft values to (time,frequency) coordinates and
     * the other assigns color to those values.
     */
    init(colorImage) {
        this.stftHandler.waitUntilReady().then(() => {
            this.adjustCanvasViewport();
            this.initSpectrogramProgram(colorImage);
            this.initBackgroundProgram();
        });
    }

    initSpectrogramProgram(colorImage) {
        this.gl.useProgram(this.spectrogram.program);

        this.setMinFilter(0);
        this.setMaxFilter(1);

        this.setColorData(colorImage);
        this.setSpectrogramCoords();
    }

    initBackgroundProgram() {
        this.gl.useProgram(this.background.program);
        this.setBackgroundPositions();
    }

    /**
    * Adjust webGl viewport
    */
    adjustCanvasViewport() {
        this.gl.viewport(
            -this.canvas.width,
            -this.canvas.height,
            2 * this.gl.canvas.width,
            2 * this.gl.canvas.height,
        );
    }

    /**
     * Draws part of spectrogram matching matrix transformation results.
     * @param {Object} transformationMatrix - Matrix transformation corresponding to
     * translations and scales in the [Time, Frequencies] space.
     */
    draw(initialTime, finalTime, transformationMatrix) {
        this.drawBackground(transformationMatrix);
        this.drawSpectrogram(initialTime, finalTime, transformationMatrix);
        return this.loaded;
    }

    drawSpectrogram(initialTime, finalTime, transformationMatrix) {
        this.useSpectrogramProgram();

        if (this.shouldUpdateSpectrogram(initialTime, finalTime)) {
            this.updateSpectrogram(initialTime, finalTime);
            this.borrame = true;
        }

        if (this.loaded.start === this.loaded.end) {
            // Do not draw if no data has been loaded into spectrogram buffer
            return;
        }

        this.setSpectrogramMatrix(transformationMatrix);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
     * Draws gray background.
     * @param {number} endTime - Largest time loaded on specProgram texture.
     * @param {number} maxFreq - Maximum frequency loaded on specProgram texture.
     * @param {Object} transformationMatrix - Matrix uniform loaded in specProgram.
     */
    drawBackground(transformationMatrix) {
        this.useBackgroundProgram();
        this.setBackgroundMatrix(transformationMatrix);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    useSpectrogramProgram() {
        this.gl.useProgram(this.spectrogram.program);

        this.bindSpectrogramBuffers();
        this.bindSpectorgramTextures();
    }

    useBackgroundProgram() {
        this.gl.useProgram(this.background.program);
        this.bindBackgroundBuffers();
    }

    shouldUpdateSpectrogram(initialTime, finalTime) {
        const startTime = Math.max(Math.min(initialTime, this.stftHandler.duration), 0);
        const endTime = Math.max(Math.min(finalTime, this.stftHandler.duration), 0);

        if (startTime < this.loaded.start || startTime > this.loaded.end) {
            return true;
        }

        if (endTime < this.loaded.start || endTime > this.loaded.end) {
            return true;
        }

        return false;
    }

    updateSpectrogram(initialTime, finalTime) {
        const startTime = initialTime - TIME_BUFFER;
        const endTime = finalTime + TIME_BUFFER;

        const data = this.stftHandler.read({ startTime, endTime });

        if (data.start - data.end === 0) {
            return;
        }

        const width = data.end - data.start;
        const { bufferColumnHeight, maxFreq } = this.stftHandler;

        this.setSpectrogramPositions(data.startTime, data.endTime, maxFreq);
        this.setSpectrogramData(data.data, width, bufferColumnHeight);

        this.loaded.start = data.startTime;
        this.loaded.end = data.endTime;
    }

    bindSpectrogramBuffers() {
        const coordsLocation = this.spectrogram.locations.specCoords;
        const coordsBuffer = this.spectrogram.buffers.specCoords;
        bindBuffer(this.gl, coordsLocation, coordsBuffer);

        const posLocation = this.spectrogram.locations.specPos;
        const posBuffer = this.spectrogram.buffers.specPos;
        bindBuffer(this.gl, posLocation, posBuffer);
    }

    bindBackgroundBuffers() {
        const location = this.background.locations.positions;
        const buffer = this.background.buffers.vertices;
        bindBuffer(this.gl, location, buffer);
    }

    setBackgroundPositions() {
        const { duration, maxFreq } = this.stftHandler;
        const location = this.background.locations.positions;
        const buffer = this.background.buffers.vertices;
        const positions = new Float32Array([
            0, -maxFreq,
            duration, -maxFreq,
            0, 2 * maxFreq,
            duration, -maxFreq,
            0, 2 * maxFreq,
            duration, 2 * maxFreq,
        ]);

        setBufferData(this.gl, location, buffer, positions, this.gl.STATIC_DRAW);
    }

    setBackgroundMatrix(matrix) {
        const location = this.background.locations.matrix;
        this.gl.uniformMatrix3fv(location, false, matrix);
    }

    /**
    * Positions the texture in order to appear on canvas.
    * Complete frequencies range is always loaded on texture.
    * @param {number} startTime - time corresponding to initial time in texture.
    * @param {number} endTime - time corresponding to final time in texture.
    * @param {number} maxFreq - Highest frequency in stft computations.
    */
    setSpectrogramPositions(startTime, endTime, maxFreq) {
        const location = this.spectrogram.locations.specPos;
        const buffer = this.spectrogram.buffers.specPos;
        const positions = new Float32Array([
            startTime, 0,
            endTime, 0,
            startTime, maxFreq,
            endTime, maxFreq,
            endTime, 0,
            startTime, maxFreq,
        ]);

        setBufferData(this.gl, location, buffer, positions, this.gl.DYNAMIC_DRAW);
    }

    /**
    * Fills the texture containing the results of the stft. These texture will
    * be used to obtain a color from the colorMap for each time and frequency pair.
    * @param {array} data - Contains stft data to load on texture.
    * @param {int} width - The number of points in the base of the texture.
    * @param {int} height - The number of points in the height of the texture.
    */
    setSpectrogramData(data, width, height) {
        const { gl } = this;
        const texture = this.spectrogram.textures.spectrogram;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.LUMINANCE,
            height,
            width,
            0,
            gl.LUMINANCE,
            gl.FLOAT,
            data,
        );
    }

    setSpectrogramMatrix(matrix) {
        const location = this.spectrogram.locations.matrix;
        this.gl.uniformMatrix3fv(location, false, matrix);
    }

    /**
    * Turns one column from colorTexture the colorMap.
    * The range [0,1] is translated into a range of colors depending on this column.
    * @param {number} newColumn - Column number.
    */
    setColor(newColumn) {
        this.gl.uniform1f(this.spectrogram.locations.colormap, newColumn);
    }

    /**
    * Set inferior filter value for colorMap.
    * @param {number} newValue - Inferior value used by colorMap.
    */
    setMinFilter(newValue) {
        this.minFilter = newValue;
        this.gl.uniform1f(this.spectrogram.locations.filterInf, newValue);
    }

    /**
    * Set superior filter value for colorMap.
    * @param {number} newValue - Superior value used by colorMap.
    */
    setMaxFilter(newValue) {
        this.maxFilter = newValue;
        this.gl.uniform1f(this.spectrogram.locations.filterSup, newValue);
    }

    /**
     * Sets texture abstact coordinates defining shape and orientation to its respective location.
     * @param {Object} gl - webGL context.
     * @param {int} textureCoordinatesLocations - Abstract texture coordinates location.
     */
    setSpectrogramCoords() {
        const location = this.spectrogram.locations.specCoords;
        const buffer = this.spectrogram.buffers.specCoords;
        const vertices = new Float32Array([
            0, 0,
            0, 1,
            1, 0,
            1, 1,
            0, 1,
            1, 0,
        ]);

        setBufferData(this.gl, location, buffer, vertices, this.gl.STATIC_DRAW);
    }

    bindSpectorgramTextures() {
        const { gl } = this;

        gl.uniform1i(this.spectrogram.locations.specTex, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.spectrogram.textures.spectrogram);

        gl.uniform1i(this.spectrogram.locations.colorTex, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.spectrogram.textures.color);
    }

    /**
     * Sets bmp image to extract color maps as texture.
     * @param {Object} gl - webGL context.
     * @param {Object} colorImage - bmp image used to define the colorMaps.
     * @param {Object} colorTexture - webGL texture created to contain colorImage.
     */
    setColorData(colorImage) {
        const { gl } = this;

        gl.bindTexture(gl.TEXTURE_2D, this.spectrogram.textures.color);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.FLOAT,
            colorImage,
        );
    }
}

export default webGLHandler;
