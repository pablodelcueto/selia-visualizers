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


/**
* Object with attribute and uniform locations for background program.
* @typedef module:Artist/webGL.backgroundLocations
* @type {Object}
* @property {number} positionLocation - gl attribute location.
* @property {number} matrixUniformLocation - gl uniform location.
*/

/**
* Links shaders source to a webGL program.
* @param {Object} gl - webGL context.
* @param {Object} program - webGL program.
* @param {string} vertexSource - source for the webGL vertexShader linked to program.
* @param {string} fragmentSource -source for the webGL fragmentShader linked to program.
*/
function shadersInit(gl, program, vertexSource, fragmentSource) {
    if (!gl) {
        alert('No webgl context');
        return;
    }

    const floatTextures = gl.getExtension('OES_texture_float');
    if (!floatTextures) {
        alert('no floating point texture support');
        return;
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(vertexShader));
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(fragmentShader));
    }

    gl.linkProgram(program);
    gl.useProgram(program);
}

/**
* Gets background program locations.
* @param {Object} gl - webGL context.
* @program {Object} program -Program to load locations from.
* @return {Object}  Object with attribute and uniform locations given by webGL background program.
*/
function getBackgroundProgramLocations(gl, program) {
    const position = gl.getAttribLocation(program, 'al_position');
    const matrixUniform = gl.getUniformLocation(program, 'u_matrix');

    return {
        positionLocation: position,
        matrixUniformLocation: matrixUniform,
    };
}

/**
* Sets texture abstact coordinates defining shape and orientation to its respective location.
* @param {Object} gl - webGL context.
* @param {int} textureCoordinatesLocations - Abstract texture coordinates location.
*/
function setupTextureCoordinatesBuffer(gl, textureCoordinatesLocation) {
    const vertices = new Float32Array([
        0, 0,
        0, 1,
        1, 0,
        1, 1,
        0, 1,
        1, 0,
    ]);
    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(textureCoordinatesLocation);
    gl.vertexAttribPointer(textureCoordinatesLocation, 2, gl.FLOAT, false, 0, 0);
}

/**
* Binds texture unit 0 with texture.
* @param {Object} gl - webGL context.
* @param {Object} texture - webGL texture (will cointain stft results).
*/
function bindArrayTexture(gl, texture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

/**
* Binds textures unit 1 with texture.
* @param {Object} gl - webGL context.
* @param {Object} texture - webGL texture.
* @param {Object} location - Corresponding to the memory location of the colorTexture.
*/
function bindColorTexture(gl, texture, location) {
    gl.uniform1i(location, 1); // texture unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

/**
* Sets bmp image to extract color maps as texture.
* @param {Object} gl - webGL context.
* @param {Object} colorImage - bmp image used to define the colorMaps.
* @param {Object} colorTexture - webGL texture created to contain colorImage.
*/
function setupImageAsColorTexture(gl, colorImage, colorTexture) {
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.FLOAT,
        colorImage,
    );
}


//--------------------------------------------------------------------------

/**
* Class used to handle the webGL actions on the visualizerCanvas.
* Create two programs using webGL context. backgroundProgram takes care of sketching gray
* backgraound each time specProgram fills texture with new data for the spectrogram.
* @class
* @property {Object} specProgram - webGL program dealing with spectrogram layer.
* @property {Object} backgroundProgram - webGL program dealing with background layer.
* @property {Object} gl - webGL context.
* @property {Object} texture - To fill with STFT values.
* @property {Object} colorImage - bmp image.
* @property {Object} colorTexture - colorImage texture.
* @property {Object} backgroundLocations - backgroundProgram locations.
* @property {int} positionLocation - specProgram position attribute location.
* @property {int} texcoordLocation - specProgram texture coordinates attribute location.
* @property {int} colorTextureLocation - specProgram colorTexture uniform location.
* @property {int} matrixUniform - specProgram matrix transformation uniform location.
* @property {Number} columnUniform - specProgram column uniform location for color map.
* @property {Number} infFilterUniform - specProgram inferior filter uniform location.
* @property {Number} supFilterUniform - specProgram superior filter uniform location.
*/
class webGLHandler {
    /**
    * Creates a webGL handler.
    * @constructor
    * @param {Object} canvas - webGL context canvas.
    */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        this.adjustCanvasViewport();
        this.initSpecProgram();
        this.initBackgroundProgram();
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
     * Initialize specProgram.
    */
    initSpecProgram() {
        this.specProgram = this.gl.createProgram();

        shadersInit(
            this.gl,
            this.specProgram,
            VERTEX_SHADER,
            FRAGMENT_SHADER,
        );

        // Texture containing results of stft.
        this.texture = this.gl.createTexture();

        // Texture containing image for colorMap
        this.colorTexture = this.gl.createTexture();

        // Image used to extract the colorMaps.
        this.colorImage = new Image(100, 100);
        this.colorImage.src = colormapImage;
        this.colorImage.onload = () => this.setTextures();

        this.setLocations();
        this.setMinFilter(0);
        this.setMaxFilter(1);
    }

    /**
    * Initializer backgroundProgram.
    */
    initBackgroundProgram() {
        this.backgroundProgram = this.gl.createProgram();

        shadersInit(
            this.gl,
            this.backgroundProgram,
            VERTEX_LOADING_SHADER,
            FRAGMENT_LOADING_SHADER,
        );

        this.verticesBuffer = this.gl.createBuffer();
        this.backgroundLocations = getBackgroundProgramLocations(this.gl, this.backgroundProgram);
        this.matrixUniform2 = this.backgroundLocations.matrixUniformLocation;
    }

    /**
    * Draws gray background.
    * @param {number} finalTime - finalTime loaded on specProgram texture.
    * @param {number} maxFrequency - maxFrequency loaded on specProgram texture.
    * @param {Object} transformationMatrix - Matrix uniform loaded in specProgram.
    */
    drawBackground(finalTime, maxFrequency, transformationMatrix) {
        this.gl.useProgram(this.backgroundProgram);
        const { positionLocation } = this.backgroundLocations;
        const positions = new Float32Array([
            0, -maxFrequency,
            finalTime, -maxFrequency,
            0, 2 * maxFrequency,
            finalTime, -maxFrequency,
            0, 2 * maxFrequency,
            finalTime, 2 * maxFrequency,
        ]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.uniformMatrix3fv(this.matrixUniform2, false, transformationMatrix);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
    * Set variables to access the adress for webgl attribute and uniform locations
    * used in specProgram.
    */
    setLocations() {
        this.positionLocation = this.gl.getAttribLocation(this.specProgram, 'a_position');

        // coordinates and orientation of the shape bounded to texture (2 triangles)
        this.texcoordLocation = this.gl.getAttribLocation(this.specProgram, 'a_texcoord');

        this.textureLocation = this.gl.getUniformLocation(this.specProgram, 'u_texture');
        this.colorTextureLocation = this.gl.getUniformLocation(this.specProgram, 'u_color');

        // matrix transformation
        this.matrixUniform = this.gl.getUniformLocation(this.specProgram, 'u_matrix');

        // this.matrixUniform2 = this.gl.getUniformLocation(this.backgroundProgram, 'u_matrix')
        // number of line in the colorMap image
        this.columnUniform = this.gl.getUniformLocation(this.specProgram, 'u_colorMap');

        // object with inferior and superior colorMap limits
        // this.limitsUniform = this.gl.getUniformLocation(this.specProgram, 'u_limits');
        this.infFilterUniform = this.gl.getUniformLocation(this.specProgram, 'u_minLim');
        this.supFilterUniform = this.gl.getUniformLocation(this.specProgram, 'u_maxLim');
    }

    /**
     * Sets spectrogram textures, the one asigning stft values to (time,frequency) coordinates and
     * the other assigns color to those values.
     */
    setTextures() {
        this.gl.useProgram(this.specProgram);
        bindColorTexture(this.gl, this.colorTexture, this.colorTextureLocation);
        setupImageAsColorTexture(this.gl, this.colorImage, this.colorTexture);
        bindArrayTexture(this.gl, this.texture);
        setupTextureCoordinatesBuffer(this.gl, this.texcoordLocation);
    }

    /**
    * Positions the texture in order to appear on canvas.
    * Complete frequencies range is always loaded on texture.
    * @param {number} initTime - time corresponding to initial time in texture.
    * @param {number} finalTime - time corresponding to final time in texture.
    * @param {number} maxFrequency - Highest frequency in stft computations.
    */
    setupPositionBuffer(initTime, finalTime, maxFrequency) {
        //console.log({
            //method: 'setupPositionBuffer',
            //initTime,
            //finalTime,
            //maxFrequency,
        //});
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        const positions = new Float32Array([
            initTime, 0,
            finalTime, 0,
            initTime, maxFrequency,
            finalTime, maxFrequency,
            finalTime, 0,
            initTime, maxFrequency,
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    /**
    * Fills the texture containing the results of the stft. These texture will
    * be used to obtain a color from the colorMap for each time and frequency pair.
    * @param {array} textureArray - Contains stft data to load on texture.
    * @param {int} width - The number of points in the base of the texture.
    * @param {int} height - The number of points in the height of the texture.
    */
    setupArrayTexture(textureArray, width, height) {
        //console.log({
            //method: 'setupArrayTexture',
            //textureArray,
            //width,
            //height,
        //});
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.LUMINANCE,
            height,
            width,
            0,
            this.gl.LUMINANCE,
            this.gl.FLOAT,
            textureArray,
        );
    }

    /**
    * Draws part of spectrogram matching matrix transformation results.
    * @param {Object} transformationMatrix - Matrix transformation corresponding to
    * translations and scales in the [Time, Frequencies] space.
    */
    draw(transformationMatrix) {
        this.gl.useProgram(this.specProgram);
        this.gl.uniformMatrix3fv(this.matrixUniform, false, transformationMatrix);
        // Draw the geometry.
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
    * Turns one column from colorTexture the colorMap.
    * The range [0,1] is translated into a range of colors depending on this column.
    * @param {number} newColumn - Column number.
    */
    setColor(newColumn) {
        this.gl.uniform1f(this.columnUniform, newColumn);
    }

    /**
    * Set inferior filter value for colorMap.
    * @param {number} newValue - Inferior value used by colorMap.
    */
    setMinFilter(newValue) {
        this.minFilter = newValue;
        this.gl.uniform1f(this.infFilterUniform, newValue);
    }

    /**
    * Set superior filter value for colorMap.
    * @param {number} newValue - Superior value used by colorMap.
    */
    setMaxFilter(newValue) {
        this.maxFilter = newValue;
        this.gl.uniform1f(this.supFilterUniform, newValue);
    }
}

export default webGLHandler;
