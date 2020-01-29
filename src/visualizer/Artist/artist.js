import webGLchalan from './webGL.js';

const CHECK_BUFFER_DELAY = 1;
const INIT_CONFIG = {
    colorMap : 'blueGum',
    amplitudScale : 'logaritmo',
    FrequenciesScale: 'lineal',
    colorFilter : null,
    initialTime : 0, 
};

export default class Artist{
    constructor(stftHandler){
        this.stftHandler = stftHandler;
    //las conf de dibujo:
    // colorMap, escalade aplitud(normal, cuadrada, log), escala de frecuencia(lineal  o log)
    // limitescolorMap (el filtrado)
    // initialTime de donde el buffer deberá comenzar a pedirle infomacion a STFTh.
        this.config = INIT_CONFIG;
        this.chalan = new webGLchalan();
        this.gl = this.chalan.gl;
        this.chalan.colorImage.onload = () =>this.init();    

    }

    init(){
        
        this.GLbuffer = { 
            initialIndex : this.stftHandler.startWAVindex,
            lengthInColumns : 2000,
        };
        this.stftHandler.waitForAudioHandler()
        // .then(()=> this.draw(new Float32Array([1,0,0,0,1,0,0,0,1])))
        .then(()=>{setTimeout(()=>this.draw(new Float32Array([1,0,0,0,1,0,0,0,1])),1000)})
    }

    getConfig(){ 

    }
    
    setGLdimensions(width, height){
        this.chalan.dimensions.width = Math.min(width, this.stftHandler.lastComputedBufferColumn);
        this.chalan.dimensions.height = Math.min(height, this.stftHandler.bufferColumnHeight);
    }

    setConfig(newConfig){
        //it probably must change shaders
        this.config = newConfig;
    }

    setShaderFromConfig(){
        //Picks shader file depending on config.
    }

    drawLoading(){
        let chalan = this.chalan;
        let array = chalan.createRandomArray(50*510)
        chalan.texturesSketch(50,50,array);
    }

    draw(matrixTransformation){
        //Llamará a drawAxis y a drawSpectrogram.
        if(!this.isShiftNeeded(matrixTransformation)){
                this.drawAxis(matrixTransformation);
                this.drawSpectrogram(matrixTransformation);  
        }
        else{
            this.setGLdimensions(2000,513);
            this.realizeShift(matrixTransformation);
            let GLdata = this.getSTFTData(matrixTransformation);
            this.setDataToWebGLbuffer(GLdata)
                .then(()=>this.draw(matrixTransformation));
        }
    }

    drawAxis(matrixTransformation){
        // console.log('Dibujando Ejes');
    }

    drawSpectrogram(matrixTransformation){ 
        this.chalan.draw(matrixTransformation);
    }

    checkIfBufferIsFilled(){
        //Los buffer que se encuentran en WebGL.

    }

    isShiftNeeded(matrixTransformation){
        if (matrixTransformation[6]==0){
            matrixTransformation[6]=0.01;
            return true            
        }
        else {
            return false
        }
    }

    realizeShift(matrixTransformation){
        return
    }

    readSTFTdata({startTime=0, endTime=-1}={}){
        // Debe solicitar informacion a STFT para dichos momentos
    }

    getSTFTData(matrixTransformation){
        this.setBufferIndices(matrixTransformation); // change which should be the new 
        //se deben obtener indices para leer en audioFile.
        return this.stftHandler.read({startIndex:this.GLbuffer.initialIndex, durationColumns:this.GLbuffer.lengthInColumns}).data //poner las condiciones adecuadas para la lectura,

        // los indices vienen de la funcion anterior. 
              
    }

    setBufferIndices(matrix){
        //depende de this.config.initialTime (o bien donde el GLbuffer está comenzando);

        this.GLbuffer.initialIndex = 0;
        return 
    }
    setDataToWebGLbuffer(data){
        return new Promise((resolve,reject)=>{
            // console.log('data', data);
            this.chalan.setTextures(data);
            resolve();
        })   
    }


    checkIfSTFTBufferIsDone() {
    // Este método debe de regresar una promesa que se resuelve cuando el stftbuffer
    // esté lleno
    return new Promise ((resolve,reject)=>{
      let checkForSTFTdata = () => {
        if (this.stftHandler.isDone()){
          console.log('stftHandler is done')
          resolve();
        }
        else {setTimeout(checkForSTFTdata,CHECK_BUFFER_DELAY)}
      }
      checkForSTFTdata();
    })
  }

}