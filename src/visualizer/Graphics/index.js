import modelShader from '../Shaders/ModelShader'
//GBwebGL


//GB graphics 
export var initialTime = 0;
export var initialFrequency = 0;  


//---------------------webGL--------------------------------        
let shaders=null;
let gl = null;
export function canvasSetup(id) {
            const canvas = document.querySelector(`#${id}`);

            if (!canvas) {
                console.log("fallo en canvas");
                return;
            }
            gl = canvas.getContext('webgl');
            gl.getExtension("OES_element_index_uint")
            
            if (!gl){
                console.log("fallo en contexto");
                return;
            }         

            shaders = new modelShader(gl);
            gl.useProgram(shaders.program);
            gl.viewport(0,0,gl.canvas.width,gl.canvas.height);

            return gl;
        }

export function renderSetup(setup,points, colors, indices){
    gl.uniformMatrix3fv(shaders.matrixUniform, false, setup.transformationMatrix);
    gl.uniform1f(shaders.brightnessUniform, setup.brightness);
    gl.useProgram(shaders.program);
    // let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shaders.positionBuffer);
    gl.enableVertexAttribArray(shaders.positionAttribute);
    gl.vertexAttribPointer(shaders.positionAttribute, 2, gl.FLOAT, false, 0,0) 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);

    // gl.vertexAttribPointer(shaders.colorAttribute, 1, gl.FLOAT, false, 0,0);
    // gl.enableVertexAttribArray(shaders.colorAttribute);
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);


    gl.bindBuffer(gl.ARRAY_BUFFER, shaders.colorBuffer);
    gl.enableVertexAttribArray(shaders.colorAttribute);
    gl.vertexAttribPointer(shaders.colorAttribute, 1, gl.FLOAT, false, 0,0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
            
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shaders.indexBuffer);
    gl.enableVertexAttribArray(shaders.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

}

// BORRAME PORFAVOR
var INDICES_CHACALOSO_BORRAME_YA = null;

export function renderSketch(setup,points,colors, indices) { //Primero debe cargarse información
    renderSetup(setup,points,colors, indices);

    // A MI TAMBIEN
    INDICES_CHACALOSO_BORRAME_YA = indices.length;

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0); //Por cada punto en points son 2 triangulos    
}

export function newRenderization(setup){
    gl.uniformMatrix3fv(shaders.matrixUniform, false, setup.transformationMatrix);
    gl.uniform1f(shaders.brightnessUniform, setup.brightness);
    // CUIDADO CON LOS INDICES CHACALOSOS
    gl.drawElements(gl.TRIANGLES, INDICES_CHACALOSO_BORRAME_YA, gl.UNSIGNED_INT, 0);
}


//---------------------------------------------------------------------------------





