import VertexSource from './vertex';
import FragmentSource from './fragment';
import Locations from './locations'; 


export default class modelShader {
    constructor(gl){
        this.gl=gl;
        this.program = null;
    
        const vertexShader = this.gl.createShader(gl.VERTEX_SHADER);
        // GLC.addShaderSource(vertexShader, VertexSource); //Asocias información de VertexSource al "vertexshader"
        this.gl.shaderSource(vertexShader,VertexSource);
        // GLC.compileShader(vertexShader);
        this.gl.compileShader(vertexShader);
        // var vertexmessage = this.gl.getShaderInfoLog(vertexShader);
        // console.log(vertexmessage);
        // // if (vertexmessage.length>0) {
        //     console.log('Error al compilar vertex shader');
        //     throw vertexmessage;
        // } 

        // const fragmentShader = GLC.createFragmentShader();
        var fragmentShader  = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        // GLC.addShaderSource(fragmentShader, FragmentSource);
        this.gl.shaderSource(fragmentShader,FragmentSource);       
        // GLC.compileShader(fragmentShader);
        this.gl.compileShader(fragmentShader);
        // var fragmessage = this.gl.getShaderInfoLog(fragmentShader);
        // console.log(fragmessage)
        // if (fragmessage.length>0){
        //     console.log('error al compilar fragment shader')
        //     throw fragmessage;
        // }

        
        
       
        // const program = GLC.createShaderProgram();
        this.program = this.gl.createProgram();
        // GLC.attachShaderToProgram(program, vertexShader);
        this.gl.attachShader(this.program, vertexShader);
        // GLC.attachShaderToProgram(program, fragmentShader);
        this.gl.attachShader(this.program,fragmentShader);    
        // GLC.linkProgram(program);
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
        // this.texcoordAttribute = GLC.getAttribLocation(program, 'a_texcoord') // Variables de los shaders a donde los datos 
        this.colorAttribute=this.gl.getAttribLocation(this.program, Locations.COLOR);
        //irán a dar para poder ser usados. 
        this.positionBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();     
    }
}

