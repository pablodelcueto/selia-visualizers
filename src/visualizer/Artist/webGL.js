import {PROGRAMS, PROGRAM_1, PROGRAM_2} from './Shaders/sourcesDictionary';
import {RANGE_AMPLITUDE} from './artist';


export default class webGLChalan{
    constructor(){
    this.canvas = document.getElementById('visualizerCanvas');


    this.gl = this.canvas.getContext('webgl');
    this.adjustSize();
    
    this.program = this.gl.createProgram();
    this.dimensions = {width:null, height: null}
    this.init();    
    }

    adjustSize() {    
      this.gl.viewport(-this.canvas.width,-this.canvas.height, 2*this.gl.canvas.width, 2*this.gl.canvas.height);
    }

    init(){
      this.colorImage = new Image(100,100)
      this.colorImage.src = './colormaps.bmp';

      var floatTextures = this.gl.getExtension('OES_texture_float');
      if (!this.gl) {
        alert('No webgl context');
        return;
      }
      if (!floatTextures) {
        alert('no floating point texture support');
        return;
      }
      let gl = this.gl;
      // Clear the canvas
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.shadersInit(gl,'Using Textures');
      gl.linkProgram(this.program);
      gl.useProgram(this.program)
      this.setLocations();
    }

    shadersInit(gl, programType){
      gl = this.gl
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const vertexSource = this.vertexSourceMap(programType);
        gl.shaderSource(vertexShader,vertexSource);
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
        gl.attachShader(this.program,fragmentShader);    
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(fragmentShader));
        return null;
        }
    }


    vertexSourceMap(programTypeName){
        return PROGRAMS[programTypeName][0];
    }

    fragmentSourceMap(programTypeName){
        return PROGRAMS[programTypeName][1];
    }





    setLocations(){ 
        this.positionLocation=this.gl.getAttribLocation(this.program, 'a_position');
        this.texcoordLocation=this.gl.getAttribLocation(this.program, 'a_texcoord');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
        this.colorTextureLocation = this.gl.getUniformLocation(this.program, 'u_color');
        this.matrixUniform = this.gl.getUniformLocation(this.program, 'u_matrix');
    }

//------------------------------------------------------------------------   

    setTextures(array){ //Using Santigo script of textures
      let gl = this.gl;      

      // this.setupPositionBuffer();
      this.setupTextureCoordinatesBuffer();
      this.setupTextures(array);

    }

    
// ------------Santiago's code ------------------
    setupTextureCoordinatesBuffer() {
      let gl = this.gl;
      var texcoordBuffer = gl.createBuffer();
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
        gl.STATIC_DRAW);
      gl.enableVertexAttribArray(this.texcoordLocation);
      gl.vertexAttribPointer(this.texcoordLocation, 2, gl.FLOAT, false, 0, 0);
    }

    setupPositionBuffer(initTime, finalTime, initFrequency, finalFrequency) {
      // console.log('Times:', initTime, finalTime);
      // console.log('Frequencies:', initFrequency, finalFrequency);
      // let l = RANGE_AMPLITUDE;
      let gl = this.gl;

      var positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const maxFreq = 1;
      var positions = new Float32Array([
        initTime, 0,
        finalTime, 0,
        initTime, maxFreq,
        finalTime, maxFreq,
        finalTime, 0,
        initTime, maxFreq,

        // initX, -1,
        // l+initX, -1,
        // initX, 1,
        // l+initX, 1,
        // l+initX, -1,
        // initX, 1,

        // -l+initX, -1,
        //  l+initX, -1,
        // -l+initX, 1,
        //  l+initX, 1,
        //  l+initX, -1,
        // -l+initX, 1,
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  setupTextures(){
    // this.setupArrayTexture(textureArray, width, height);
    this.setupColorTexture();
    this.bindTextures();
  }
  

  setupArrayTexture(textureArray, width, height) {
    let gl = this.gl;

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // console.log({
    //   dimensions: this.dimensions,
    //   height,
    //   width, 
    //   textureArray,
    //   size: height * width,
    //   arraySize: textureArray.length,
    //   heightType: typeof(height),
    //   widthType: typeof(width)
    // });



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
      textureArray);
      // bufferArray);
    this.bindTextures();

  }

  setupColorTexture() {
    let gl = this.gl;

    this.colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);

    // gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
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
      this.colorImage);
  }

   bindTextures() {
    let gl = this.gl;

    gl.uniform1i(this.textureLocation, 0);  // texture unit 0
    gl.uniform1i(this.colorTextureLocation, 1);  // texture unit 1

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
  }

  draw(transformationMatrix){
    let gl = this.gl;
    // gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix3fv(this.matrixUniform, false, transformationMatrix);
    // Draw the geometry.
    setTimeout(()=>gl.drawArrays(gl.TRIANGLES, 0, 6),0);

  }

  resetTexture(){
    let gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
  } 

  createRandomArray(n) {
    let array = new Float32Array(n);
    for (let i = 0; i < n; i++){
      array[i] = Math.random();
    }
    return array;
  }

  createNonRandomArray(n){
    let array = new Float32Array(n);
    for (let i = 0; i< n/4-1; i++){
      array[4*i+0] = 0;
      array[4*i+1] = .33;
      array[4*i+2] = .66;
      array[4*i+3] = .99;
    }
  return array;
  }

  createDecreasingArray(n){
    let array = new Float32Array(n);
    for (let i=0; i < n; i++){
       array[i] = i/n;
    }
    return array;
  }



}
