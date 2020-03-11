import {PROGRAMS} from './Shaders/sourcesDictionary';

export default class webGLChalan {
    constructor() {
        this.canvas = document.getElementById('visualizerCanvas');


        this.gl = this.canvas.getContext('webgl');
        this.adjustSize();

        this.program = this.gl.createProgram();
        this.dimensions = { width: null, height: null };
        this.init();
    }

    adjustSize() {  
        this.gl.viewport(-this.canvas.width, -this.canvas.height, 2 * this.gl.canvas.width, 2 * this.gl.canvas.height);
    }

    init() {
        this.colorImage = new Image(100,100)
        this.colorImage.src = './colormaps.bmp';
        this.color = 0.6;
        this.minFilter = 0.0;
        this.maxFilter = 1.0;

        var floatTextures = this.gl.getExtension( 'OES_texture_float' );
        if (!this.gl) {
            alert('No webgl context');
            return;
        }
        if (!floatTextures) {
            alert('no floating point texture support');
            return;
        }
        const gl = this.gl;
        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.shadersInit(gl, 'Using Textures');
        gl.linkProgram(this.program);
        gl.useProgram(this.program)
        this.setLocations();
        this.setColor(0.5);
        this.setFilters(0.0, 1.0);
    }

    shadersInit(gl, programType) {
        gl = this.gl;
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const vertexSource = this.vertexSourceMap(programType);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        gl.attachShader(this.program, vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(vertexShader));
            return null;
        }
              
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        this.fragmentSource = this.fragmentSourceMap(programType);
        gl.shaderSource(fragmentShader, this.fragmentSource);
        gl.compileShader(fragmentShader);
        gl.attachShader(this.program, fragmentShader);    
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(fragmentShader));
            return null;
        }
    }


    vertexSourceMap(programTypeName) {
        return PROGRAMS[programTypeName][0];
    }

    fragmentSourceMap(programTypeName) {
        return PROGRAMS[programTypeName][1];
    }

    setLocations() { 
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.texcoordLocation = this.gl.getAttribLocation(this.program, 'a_texcoord');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
        this.colorTextureLocation = this.gl.getUniformLocation(this.program, 'u_color');
        this.matrixUniform = this.gl.getUniformLocation(this.program, 'u_matrix');
        
        this.columnUniform = this.gl.getUniformLocation(this.program, 'u_colorMap');
        this.limitsUniform = this.gl.getUniformLocation(this.program, 'u_limits');
    }

    setTextures(array) { 
        const gl = this.gl;      
        this.setupTextureCoordinatesBuffer();
        this.setupTextures(array);
    }

    setupTextureCoordinatesBuffer() {
        const gl = this.gl;
        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                0, 0,
                0, 1,
                1, 0,
                1, 1,
                0, 1,
                1, 0,
            ]),
            gl.STATIC_DRAW,
        );
        gl.enableVertexAttribArray(this.texcoordLocation);
        gl.vertexAttribPointer(this.texcoordLocation, 2, gl.FLOAT, false, 0, 0);
    }

    setupPositionBuffer(initTime, finalTime, initFrequency, finalFrequency) {
        const gl = this.gl;

        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const maxFreq = 1;
        const positions = new Float32Array([
            initTime, 0,
            finalTime, 0,
            initTime, maxFreq,
            finalTime, maxFreq,
            finalTime, 0,
            initTime, maxFreq,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    setupTextures() {
        this.setupColorTexture();
        this.bindTextures();
    }
  

    setupArrayTexture(textureArray, width, height) {
        const gl = this.gl;

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.LUMINANCE,
            height,
            width, 
            0, 
            gl.LUMINANCE,
            gl.FLOAT,
            textureArray,
        );
        this.bindTextures();
    }

    setupColorTexture() {
        const gl = this.gl;

        this.colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
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
            this.colorImage
        );
    }

    bindTextures() {
        const gl = this.gl;

        gl.uniform1i(this.textureLocation, 0);  // texture unit 0
        gl.uniform1i(this.colorTextureLocation, 1);  // texture unit 1

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    }

    draw(transformationMatrix) {
        const gl = this.gl;
        gl.uniformMatrix3fv(this.matrixUniform, false, transformationMatrix);
        // Draw the geometry.
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    setColor(newColumn) {
        this.gl.uniform1f(this.columnUniform, newColumn);
    }

    setFilters() {
        this.gl.uniform2f(this.limitsUniform, this.minFilter, this.maxFilter);
    }

    setMinFilter(newValue) {
        this.minFilter = newValue;
    }

    setMaxFilter(newValue) {
        this.maxFilter = newValue;
    }

    resetTexture() {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
    }  
}
