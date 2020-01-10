import VertexSource from './vertex';
import FragmentSource from './fragment';
import Locations from './locations'; 


export default class modelShader {
    constructor(gl){
        this.gl=gl;
        this.program = null;
    
        const vertexShader = this.gl.createShader(gl.VERTEX_SHADER);
        this.gl.shaderSource(vertexShader,VertexSource);
        this.gl.compileShader(vertexShader);
        // var vertexmessage = this.gl.getShaderInfoLog(vertexShader);
        // console.log(vertexmessage);
        // // if (vertexmessage.length>0) {
        //     console.log('Error al compilar vertex shader');
        //     throw vertexmessage;
        // }      

        var fragmentShader  = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragmentShader,FragmentSource);       
        this.gl.compileShader(fragmentShader);
        // var fragmessage = this.gl.getShaderInfoLog(fragmentShader);
        // console.log(fragmessage)
        // if (fragmessage.length>0){
        //     console.log('error al compilar fragment shader')
        //     throw fragmessage;
        // }

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program,fragmentShader);    
        this.gl.linkProgram(this.program);
        // if (!this.gl.getProgramParameter(this.program,this.gl.LINK_STATUS)){
        //     alert("Could not initialise shaders");
        //     var progmessage = this.gl.getProgramInfoLog(this.program)
        //     if (progmessage.length >0){
        //         console.log(progmessage);
        //     }
        // } 

        this.matrixUniform = this.gl.getUniformLocation(this.program, Locations.MATRIX);
        this.brightnessUniform = this.gl.getUniformLocation(this.program, Locations.BRIGHTNESS);
        this.positionAttribute=this.gl.getAttribLocation(this.program, Locations.POSITION);
        this.colorAttribute=this.gl.getAttribLocation(this.program, Locations.COLOR);
        this.positionBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();     
    }
}

