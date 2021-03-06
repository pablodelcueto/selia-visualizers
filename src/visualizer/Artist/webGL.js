/**
* Module that contains all WebGL functionalities.
*
* @module Artist/webGL
* @see module:visualizer/Artist/webGL
*/
import {
    VERTEX_SHADER, VERTEX_LOADING_SHADER,
    FRAGMENT_SHADER, FRAGMENT_LOADING_SHADER,
} from './Shaders/loadingShaders';
import colormapImage from './colormaps.png';


/**
* Create GL program with the given shaders.
* @param {WebGLRenderingContext} gl - webGL context.
* @param {string} vertexSource - source for the webGL vertexShader linked to the program.
* @param {string} fragmentSource - source for the webGL fragmentShader linked to
* the program.
* @return {WebGLProgram} - The compiled GL program.
* @throws Will throw an error if compilation isn't successful.
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
 * WebGL Program resources object.
 * Objects of this type contain all the webGL references required in the program,
 * including textures, buffers and locations.
 * @typedef {Object} ProgramResources
 * @property {WebGLProgram} program - The webGL program.
 * @property {Object.<string, WebGLBuffer>} buffers - An object containing all
 * buffers required in the program.
 * @property {Object.<string, number|WebGLUniformLocation>} locations - An object
 * containing all the locations required in the program.
 * @property {Object.<string, WebGLTexture>} [textures] - An object containing all
 * the textures required in the program.
 */

/**
 * Create GL program that handles background drawing.
 * @param {WebGLRenderingContext} gl - webGL context.
 * @return {module:Artist/webGL~ProgramResources} - Web GL program object containing the
 * GL program, textures, locations and buffers corresponding to GL Program that draws
 * the background.
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
 * @param {WebGLRenderingContext} gl - webGL context.
 * @return {module:Artist/webGL~ProgramResources} - Web GL program object containing the
 * GL program, textures, locations and buffers corresponding to GL Program that draws
 * the spectrogram.
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

/**
 * Set data to WebGLBuffer and bind attribute to buffer data.
 * @param {WebGLRenderingContext} gl - The rendering context.
 * @param {number} location - Vertex attribute location.
 * @param {WebGLBuffer} buffer - Buffer to which data is being set.
 * @param {Float32Array} data - Floating array with data to set.
 * @param {GLenum} usage - A GLenum specifying the intended usage pattern of the data
 * store for optimization purposes.
 */
function setBufferData(gl, location, buffer, data, usage) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

/**
 * Set bind vertex attribute to buffer.
 * @param {WebGLRenderingContext} gl - The rendering context.
 * @param {number} location - Vertex attribute location.
 * @param {WebGLBuffer} buffer - Buffer containing attribute data.
 */
function bindBuffer(gl, location, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}


/**
* Class used to handle the webGL actions on the visualizerCanvas.
* Create two programs using webGL context. backgroundProgram takes care of sketching gray
* backgraound each time specProgram fills texture with new data for the spectrogram.
* @property {HTMLCanvasElement} canvas - HTML Canvas on which to draw the spectrogram.
* @property {WebGLRenderingContext} gl - webGL context.
* @property {module:STFTHandler/STFTHandler~STFTHandler} stftHandler - A STFTHandler that
* contains the spectrogram data.
* @property {module:Artist/webGL~ProgramResources} spectrogram - ProgramResources object
* that contains the spectrogram program resources.
* @property {module:Artist/webGL~ProgramResources} background - ProgramResources object
* that contains the background program resources.
* @property {Object} loaded - Object that tracks the bounding times currently loaded
* within the WebGLTexture of the spectrogram.
* @property {number} loaded.start - Time of first SFTF column loaded into the
* spectrogram texture.
* @property {number} loaded.end - Time of last SFTF column loaded into the
* spectrogram texture.
*/
class WebGLHandler {
    /**
    * Creates a webGL handler.
    * @constructor
    * @param {HTMLCanvasElement} canvas - webGL context canvas.
    * @param {module:STFTHandler/STFTHandler~STFTHandler} stftHandler -
    * A STFTHandler that contains the spectrogram data.
    */
    constructor(canvas, stftHandler) {
        this.canvas = canvas;
        this.stftHandler = stftHandler;

        this.gl = canvas.getContext('webgl');

        this.spectrogram = createSpectrogramProgram(this.gl);
        this.background = createBackgroundProgram(this.gl);

        // Keep track of first and last spectrogram columns loaded into webgl buffer.
        this.loaded = {
            start: 0,
            end: 0,
        };

        this.ready = false;

        // Image used to extract the colorMaps.
        const colorImage = new Image(100, 100);
        colorImage.src = colormapImage;
        colorImage.onload = () => this.init(colorImage);
    }

    /**
     * Initialize drawing.
     *
     * Sets colormap image into texture and initializes all uniforms.
     * @param {Image} colorImage - Image containing colormap info.
     * @async
     * @private
     */
    init(colorImage) {
        this.stftHandler.waitUntilReady().then(() => {
            this.adjustCanvasViewport();
            this.initSpectrogramProgram(colorImage);
            this.initBackgroundProgram();
            this.ready = true;
        });
    }

    /**
     * Initializes buffers, textures and uniforms of the spectrogram program.
     * @param {Image} colorImage - Image containing colormap info.
     * @private
     */
    initSpectrogramProgram(colorImage) {
        this.gl.useProgram(this.spectrogram.program);

        this.setInfFilter(0);
        this.setSupFilter(1);

        this.setColorData(colorImage);
        this.setSpectrogramCoords();
    }

    /**
     * Initializes buffers and uniforms of the background program.
     * @private
     */
    initBackgroundProgram() {
        this.gl.useProgram(this.background.program);
        this.setBackgroundPositions();
    }

    /**
    * Adjust webGl viewport to canvas dimensions.
    * @private
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
     * Draw the spectrogram and background.
     *
     * A background will be drawn for the whole duration of the file, but
     * the only the portion of the spectrogram contained in the requested interval
     * will be drawn.
     *
     * Warning: This method might be called while the STFT data is incomplete
     * and might not be able to draw the full requested temporal range. It will
     * draw all current data contained within the requested interval. This method
     * returns the interval that *was* drawn so the user can handle partial draws.
     *
     * @param {number} initialTime - Time of first spectrogram column that
     * should be drawn (in seconds).
     * @param {number} finalTime - Time of last spectrogram column that should
     * be drawn (in seconds).
     * @param {Float32Array} transformationMatrix - Matrix transformation corresponding to
     * translations and scalings in the [Time, Frequencies] space.
     * @public
     */
    draw(initialTime, finalTime, transformationMatrix) {
        if (!this.ready) {
            // Do not draw until stft metadata is ready
            return this.loaded;
        }

        this.drawBackground(transformationMatrix);
        this.drawSpectrogram(initialTime, finalTime, transformationMatrix);
        return this.loaded;
    }

    /**
     * Draw the spectrogram portion contained in the requested interval.
     *
     *
     * @param {number} initialTime - Time of first spectrogram column that
     * should be drawn (in seconds).
     * @param {number} finalTime - Time of last spectrogram column that should
     * be drawn (in seconds).
     * @param {Float32Array} transformationMatrix - Matrix transformation corresponding to
     * translations and scales in the [Time, Frequencies] space.
     * @private
     */
    drawSpectrogram(initialTime, finalTime, transformationMatrix) {
        this.useSpectrogramProgram();

        if (this.shouldUpdateSpectrogram(initialTime, finalTime)) {
            // Only update spectrogram buffer if needed.
            this.updateSpectrogram(initialTime, finalTime);
        }

        if (this.loaded.start === this.loaded.end) {
            // Do not draw if no data has been loaded into spectrogram buffer
            return;
        }

        this.setSpectrogramMatrix(transformationMatrix);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
     * Draw gray background.
     * @param {Float32Array} transformationMatrix - Matrix uniform loaded in specProgram.
     * @private
     */
    drawBackground(transformationMatrix) {
        this.useBackgroundProgram();
        this.setBackgroundMatrix(transformationMatrix);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
     * Change current GL Program to the spectrogram program.
     * @private
     */
    useSpectrogramProgram() {
        this.gl.useProgram(this.spectrogram.program);
        this.bindSpectrogramBuffers();
        this.bindSpectorgramTextures();
    }

    /**
     * Change current GL Program to the background program.
     * @private
     */
    useBackgroundProgram() {
        this.gl.useProgram(this.background.program);
        this.bindBackgroundBuffers();
    }

    /**
     * Check if the interval has been previously loaded into the spectrogram texture.
     * @param {number} initialTime
     * @param {number} finalTime
     * @return {boolean} - Returns true if the spectrogram fraction
     * contained in the interval [intialTime, finalTime] has been previously loaded
     * into the webgl spectrogram texture.
     * @private
     */
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

    /**
     * Resents all loaded data when stft configurations changed.
     * @private
     */
    resetSpectrogramTexture() {
        this.loaded.end = this.loaded.start;
    }

    /**
     * Update spectrogram texture data to contain the requested interval.
     *
     * This method will request the spectrogram data to the STFTHandler
     * and set any results into the webgl spectrogram buffer. Since computation
     * of the spectrogram might not have finished the results might be partial.
     *
     * @param {number} initialTime
     * @param {number} finalTime
     * @private
     */
    updateSpectrogram(initialTime, finalTime) {
        const range = finalTime - initialTime;
        const startTime = initialTime - range / 2;
        const endTime = finalTime + range / 2;
        const data = this.stftHandler.read({ startTime, endTime });

        // Store the bounds of the requested spectrogram data for future
        // reference.
        this.loaded.start = data.startTime;
        this.loaded.end = data.endTime;


        if (data.start - data.end === 0) {
            // Do not try to set any data if empty.
            // this.setEmptySpectrogram();
            return;
        }

        this.setSpectrogramPositions(data.startTime, data.endTime);
        this.setSpectrogramData(data.data);
    }

    setEmptySpectrogram() {
        const columnSize = this.stftHandler.bufferColumnHeight;
        const emptyColumn = new Float32Array(4 * columnSize);

        this.setSpectrogramPositions(0, 1);
        this.setSpectrogramData(emptyColumn);
    }

    /**
     * Bind spectrogram programm buffers and attributes.
     * @private
     */
    bindSpectrogramBuffers() {
        const coordsLocation = this.spectrogram.locations.specCoords;
        const coordsBuffer = this.spectrogram.buffers.specCoords;
        bindBuffer(this.gl, coordsLocation, coordsBuffer);

        const posLocation = this.spectrogram.locations.specPos;
        const posBuffer = this.spectrogram.buffers.specPos;
        bindBuffer(this.gl, posLocation, posBuffer);
    }

    /**
     * Bind background programm buffers and attributes.
     * @private
     */
    bindBackgroundBuffers() {
        const location = this.background.locations.positions;
        const buffer = this.background.buffers.vertices;

        bindBuffer(this.gl, location, buffer);
    }

    /**
     * Set background positions to cover the whole file.
     * @private
     */
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

    /**
     * Set transformation matrix to adequately display the background.
     * @param {Float32Array} matrix - Transformation matrix.
     * @private
     */
    setBackgroundMatrix(matrix) {
        const location = this.background.locations.matrix;
        this.gl.uniformMatrix3fv(location, false, matrix);
    }

    /**
    * Set spectrogram position in canvas.
    * @param {number} startTime - time at which to start placement of the
    * spectrogram texture.
    * @param {number} endTime - time at which to end placement of the
    * spectrogram texture.
    * @private
    */
    setSpectrogramPositions(startTime, endTime) {
        const { maxFreq } = this.stftHandler;
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
    * Set data into the webgl spectrogram texture.
    * @param {array} data - The stft data to set on texture.
    * @private
    */
    setSpectrogramData(data) {
        const { gl } = this;
        const height = this.stftHandler.bufferColumnHeight;
        const width = Math.floor(data.length / height);
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

        this.bindSpectorgramTextures();
    }

    /**
     * Set transformation matrix to adequately display the spectrogram.
     * @param {Float32Array} matrix - Transformation matrix.
     * @private
     */
    setSpectrogramMatrix(matrix) {
        const location = this.spectrogram.locations.matrix;
        this.gl.uniformMatrix3fv(location, false, matrix);
    }

    /**
    * Set colormap.
    *
    * Colormaps are numbered.
    * @param {number} colormap - Colormap number.
    * @public
    */
    setColor(colormap) {
        this.gl.uniform1f(this.spectrogram.locations.colormap, colormap);
    }

    /**
    * Set inferior filter value for colormap.
    * @param {number} value - Inferior value used by colorMap.
    * @public
    */
    setInfFilter(value) {
        this.gl.uniform1f(this.spectrogram.locations.filterInf, value);
    }

    /**
    * Set superior filter value for colormap.
    * @param {number} value - Superior value used by colormap.
    * @public
    */
    setSupFilter(value) {
        this.gl.uniform1f(this.spectrogram.locations.filterSup, value);
    }

    /**
     * Sets spectrogram texture abstact coordinates defining shape and orientation.
     * @private
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

    /**
     * Bind spectrogram program textures to the corresponding texture unit.
     * @private
     */
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
     * Sets colormap image to texture.
     * @param {Image} colorImage - bmp image used to define the colorMaps.
     * @private
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

export default WebGLHandler;
