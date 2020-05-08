import {
    VERTEX_SHADER, VERTEX_LOADING_SHADER,
    FRAGMENT_SHADER, FRAGMENT_LOADING_SHADER,
} from './Shaders/loadingShaders';
import colormapImage from './colormaps.png';

/**
* @param {Object} gl- webGL context of the visualizerCanvas
* @param {Object} program - webGL program.
* @param {string} vertexSource - source for the webGL vertexShader linked to program.
* @param {string} fragmentSource -source for the webGL fragmentShader linked to program.
* Execute the basic webGL comands to run a GL program.
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



function setupBackgroundMatrix(gl, program, locations, matrix) {
    const matrixLocation = locations.matrixUniformLocation;
    gl.uniformMatrix3fv(matrixLocation, false, matrix)
}
    

function setupBackgroundProgramLocations(gl, program) {
    const position = gl.getAttribLocation(program, 'al_position');
    const matrixUniform = gl.getUniformLocation(program, 'u_matrix');

    return {
        positionLocation: position,
        matrixUniformLocation: matrixUniform,
    };

    // gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    // gl.enableVertexAttribArray(positionLocation);
    // gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    // gl.drawArrays(gl.TRIANGLES, 0, 3);

}

/**
* @param {Object} gl - webGL context of the visualizerCanvas.
* @param {int} textureCoordinatesLocations - JS variable with memory location of
* a_texcoord, attribute with the vertices defining the bounding box and orientation
* of the spectrogram texture.
* Sets the typedArray vertices as such attribute.
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
* @param {Object} gl - webGL context of the visualizerCanvas.
* @param {Object} colorImage - bmp image used to define the colorMaps.
* @param {Object} colorTexture - webGL texture containing colorImage.
*/
function setupColorTextureImage(gl, colorImage, colorTexture) {
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


/**
* @param {Object} gl - webGL context of the visualizerCanvas.
* @param {Object} texture - webGL texture cointaining stft results.
* Actives texture unit 0 and bind in with texture variable.
*/
function bindArrayTexture(gl, texture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

/**
* @param {Object} gl - webGL context of the visualizerCanvas.
* @param {Object} texture - webGL texture.
* @param {Object} textureLocation - Corresponding to the memory location of the texture.
* Defines textureLocation unit  as 1 and binds texture to that unit.
*/
function bindColorTexture(gl, texture, textureLocation) {
    gl.uniform1i(textureLocation, 1); // texture unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}


//--------------------------------------------------------------------------


export default class webGLChalan {
    /**
    * Class used to handle the webGL actiona on the visualizerCanvas.
    */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        this.adjustCanvasViewport();
        this.init();
        this.initBackgroundProgram();
    }

    /**
    * Defines webGl viewport
    */
    adjustCanvasViewport() {
        this.gl.viewport(
            -this.canvas.width,
            -this.canvas.height,
            2 * this.gl.canvas.width,
            2 * this.gl.canvas.height,
        );
    }

    
    init() {
        this.program = this.gl.createProgram();
        shadersInit(this.gl, this.program, VERTEX_SHADER, FRAGMENT_SHADER);
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

    initBackgroundProgram() {
        this.loadingProgram = this.gl.createProgram();
        shadersInit(this.gl, this.loadingProgram, VERTEX_LOADING_SHADER, FRAGMENT_LOADING_SHADER);
        this.verticesBuffer = this.gl.createBuffer();
        this.backgroundLocations = setupBackgroundProgramLocations(this.gl, this.loadingProgram);
        this.matrixUniform2 = this.backgroundLocations.matrixUniformLocation;
    }

    setBackgroundVertices(finalTime, maxFrequency, transformationMatrix) {
        this.gl.useProgram(this.loadingProgram);
        const positionLocation = this.backgroundLocations.positionLocation;
        const positions = new Float32Array([
            0, -maxFrequency,
            finalTime, -maxFrequency,
            0, 2*maxFrequency,
            finalTime, -maxFrequency,
            0, 2*maxFrequency,
            finalTime, 2*maxFrequency,
        ]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.uniformMatrix3fv(this.matrixUniform2, false, transformationMatrix);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
    * Creates js variables for webgl attributes and uniforms locations.
    */
    setLocations() {
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        // coordinates and orientation of the shape bounded to texture (2 triangles)
        this.texcoordLocation = this.gl.getAttribLocation(this.program, 'a_texcoord');

        this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
        this.colorTextureLocation = this.gl.getUniformLocation(this.program, 'u_color');

        // matrix transformation
        this.matrixUniform = this.gl.getUniformLocation(this.program, 'u_matrix');
        // this.matrixUniform2 = this.gl.getUniformLocation(this.loadingProgram, 'u_matrix');     
        // number of line in the colorMap image
        this.columnUniform = this.gl.getUniformLocation(this.program, 'u_colorMap');
        // object with inferior and superior colorMap limits
        // this.limitsUniform = this.gl.getUniformLocation(this.program, 'u_limits');
        this.infFilterUniform = this.gl.getUniformLocation(this.program, 'u_minLim');
        this.supFilterUniform = this.gl.getUniformLocation(this.program, 'u_maxLim');
    }

    /**
    * First it binds the colorTexture to the location in shaders and then fill with data provided by
    * colorImage.
    * Then binds the texture containing array data with the texture unit that will be used later on
    * and fill that texture and set it with shape and orientation
    */
    setTextures() {
        this.gl.useProgram(this.program);
        bindColorTexture(this.gl, this.colorTexture, this.colorTextureLocation);
        setupColorTextureImage(this.gl, this.colorImage, this.colorTexture);
        bindArrayTexture(this.gl, this.texture);
        setupTextureCoordinatesBuffer(this.gl, this.texcoordLocation);
    }
 
    /**
    * @param {number} initTime - time corresponding to left border in Canvas
    * @param {number} finalTime - time corresponding to rigth border in Canvas
    * Positions the texture  such that [initTime,finalTime] occupies the whole
    * canvas base after matrix multiplication.
    * Complete frequencies range is loaded in texture. 
    */
    setupPositionBuffer(initTime, finalTime, maxFrequency) {
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
    * @param {array} textureArray - Contains stft data to load on texture.
    * @param {int} width - The number of points in the base of the texture.
    * @param {int} height - The number of points in the height of the texture.
    * Fills the texture containing the results of the stft. Those textures will
    * be used to obtain a color from the colorMap to each time and frequency.
    */
    setupArrayTexture(textureArray, width, height) {
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
    * @param {Object} transformationMatrix - Matrix transformation corresponding to
    * translations and scales in the time x frequencies space.
    */
    draw(transformationMatrix) {
        this.gl.useProgram(this.program);
        this.gl.uniformMatrix3fv(this.matrixUniform, false, transformationMatrix);
        // Draw the geometry.
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
    * @param {number} newColumn - number between 0 and 1 used to define the line of the
    * colorMap image.
    * The range [0,1] is translated to a range of color Maps.
    */
    setColor(newColumn) {
        this.gl.uniform1f(this.columnUniform, newColumn);
    }

    /**
    * @param {number} newValue - colorMap inferior filter value.
    */
    setMinFilter(newValue) {
        this.minFilter = newValue;
        this.gl.uniform1f(this.infFilterUniform, newValue);
    }

    /**
    * @param {number} newValue - colorMap superior filter value.
    */
    setMaxFilter(newValue) {
        this.maxFilter = newValue;
        this.gl.uniform1f(this.supFilterUniform, newValue);
    }

    resetTexture() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
}
