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
        }

export function renderSetup(points,colors,indices){
    gl.useProgram(shaders.program);
    // let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shaders.positionBuffer);
    gl.vertexAttribPointer(shaders.positionAttribute, 2, gl.FLOAT, false, 0,0) // TENSOR TRIAL
    gl.enableVertexAttribArray(shaders.positionAttribute);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);

    gl.bindBuffer(gl.ARRAY_BUFFER, shaders.colorBuffer);
    gl.vertexAttribPointer(shaders.colorAttribute, 1, gl.FLOAT, false, 0,0);
    gl.enableVertexAttribArray(shaders.colorAttribute);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
            
    gl.enableVertexAttribArray(shaders.indexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shaders.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

}

export function columnsAdaption(file,numberOfColumnsInCanvas){ 
           return Math.min(file.length,numberOfColumnsInCanvas); // 600 es las columans que tendrá el canvas
       } 

export function renderSketch(points,colors,indices) { //Primero debe cargarse información
    renderSetup(points,colors,indices);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0); //Por cada punto en points son 2 triangulos
gl.finish();         
}

//---------------------------------------------------------------------------------





