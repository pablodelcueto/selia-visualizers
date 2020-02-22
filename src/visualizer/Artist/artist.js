import webGLchalan from './webGL.js';
import axisDrawer from './axis.js';

const COLUMNS_PER_STFT_COMPUTATION = 50;
const CHECK_BUFFER_DELAY = 1;
const BUFFER_LENGTH_IN_COLUMNS = 10000;
const RANGE_AMPLITUDE = BUFFER_LENGTH_IN_COLUMNS / 1000;   // We want it to be even.
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
        this.initialCanvasTime = 0;
        
    //las conf de dibujo:
    // colorMap, escalade aplitud(normal, cuadrada, log), escala de frecuencia(lineal  o log)
    // limitescolorMap (el filtrado)
    // initialTime de donde el buffer deberá comenzar a pedirle infomacion a STFTh.
        this.config = INIT_CONFIG;
        this.chalan = new webGLchalan();
        this.gl = this.chalan.gl;
        this.GLbuffer = { 
            initialGlobalColumn : 0, //first column in STFTbuffer used. 
            filledColumns: 0, // goes from 0 to buffer length.
            initX : 0, // this is the point used to translate the positionBuffer each time new bufferload is required.
            };
        this.dataArray = new Float32Array(BUFFER_LENGTH_IN_COLUMNS*this.stftHandler.bufferColumnHeight).fill();
        this.chalan.colorImage.onload = () =>{this.init()};    
    }

    init(){
        this.chalan.setupPositionBuffer(this.GLbuffer.initX)
        this.stftHandler.waitForAudioHandler()
            .then(()=>{
                this.GLbuffer.secondsInBuffer = BUFFER_LENGTH_IN_COLUMNS/this.stftHandler.columnsPerSecond();
                this.axisHandler = new axisDrawer(this.GLbuffer.secondsInBuffer);
                this.setGLdimensions(BUFFER_LENGTH_IN_COLUMNS,this.stftHandler.bufferColumnHeight);
            });
    }

    adjustSizes(){
        this.chalan.adjustSize();
    }

    getConfig(){ 

    }
    
    setGLdimensions(width, height){
        this.chalan.dimensions.width = Math.min(width, BUFFER_LENGTH_IN_COLUMNS);
        this.chalan.dimensions.height = Math.min(height, this.stftHandler.bufferColumnHeight);
    }

    setConfig(newConfig){
        //it probably must change shaders
        this.config = newConfig;
    }

    setShaderFromConfig(){
        //Picks shader file depending on config.
    }

    draw(initialTime, matrixTransformation){
        if(this.isShiftNeeded(matrixTransformation) || this.stillSpaceOnGLbuffer(this.GLbuffer)){
            this.realizeShift(matrixTransformation);
            let GLdata = this.getSTFTdata();
                this.setDataToGLbuffer(GLdata)
                    .then(()=>{                        
                        this.drawAxis(initialTime, 0, matrixTransformation[0], matrixTransformation[6]);
                        this.drawSpectrogram(matrixTransformation);
                    })
                    .catch(()=>{
                        // console.log('There is no more info in stftBuffer, it must shift.');    
                        this.drawAxis(initialTime, 0, matrixTransformation[0], matrixTransformation[6]);
                        this.drawSpectrogram(matrixTransformation);
                    });
        }
        else{
            this.drawAxis(initialTime, 0, matrixTransformation[0], matrixTransformation[6]);
            this.drawSpectrogram(matrixTransformation);
        }               
    }

    drawAxis(initialTime, numberOfTicks, zoomFactor, translation){
        this.axisHandler.adaptAxis(initialTime, numberOfTicks, zoomFactor, translation);
    }

    drawSpectrogram(matrixTransformation){ 
        this.chalan.draw(matrixTransformation);
    }


    stillSpaceOnGLbuffer(buffer){
            return (buffer.filledColumns < BUFFER_LENGTH_IN_COLUMNS - COLUMNS_PER_STFT_COMPUTATION -10)
    }

    spaceOnGLbufferForData(buffer, data){
        return (buffer.filledColumns + (data.end-data.start) <= BUFFER_LENGTH_IN_COLUMNS)           
    }

    isShiftNeeded(matrix){ //------------------------------------CAMBIAR
        let r = RANGE_AMPLITUDE;
        let initX = this.GLbuffer.initX;
           return (matrix[0]*initX + 2*matrix[0] + matrix[6] >=   initX + r/2 + 1  
            || matrix[0]*initX + r*matrix[0] - 2*matrix[0] + matrix[6] <=   initX + r/2 - 1 ) //shift to left || shift a la derecha

        // return (matrix[0]*initX + RANGE_AMPLITUDE*matrix[0] + matrix[6] <  2 
        //     || matrix[0]*initX - RANGE_AMPLITUDE*matrix[0] + matrix[6] >  -2)         
    }


    realizeShift(matrix){ //------------------------------------CAMBIAR
        let initX = this.GLbuffer.initX;
        let r = RANGE_AMPLITUDE;
         if (this.isShiftNeeded(matrix)){
            // console.log('shifting matrix',matrix);
            // if (matrix[0]*initX + RANGE_AMPLITUDE*matrix[0] -matrix[0] + matrix[6] <  1){
                if (matrix[0]*initX + r*matrix[0] - 2*matrix[0] + matrix[6] <= initX + r/2 -1 ){
                this.shiftToRight(matrix);
            }
            else if(matrix[0]*initX + 2*matrix[0] + matrix[6] >= initX + r/2 +1  && initX >0){
                this.shiftToLeft(matrix);
            }         
            // else if(matrix[0]*initX - RANGE_AMPLITUDE*matrix[0] + matrix[0] + matrix[6] >  -1 && this.GLbuffer.initX>RANGE_AMPLITUDE){
            //     this.shiftToLeft(matrix);
            // }

            this.chalan.setupPositionBuffer(this.GLbuffer.initX);
            // this.chalan.setupTextureCoordinatesBuffer();
        }            
    }

    shiftToRight(matrix){ //In case canvas is mpving to the right.  //------------------------------------CAMBIAR
        // console.log('shifting rigth with matrix:', matrix);
        if (this.GLbuffer.initialGlobalColumn+BUFFER_LENGTH_IN_COLUMNS < this.stftHandler.lastComputedBufferColumn){
            this.resetDataArray();
            this.readaptMatrixToRigth(matrix);
            this.GLbuffer.initX = this.GLbuffer.initX + RANGE_AMPLITUDE/2 - 1; 
            this.GLbuffer.initialGlobalColumn = this.GLbuffer.initialGlobalColumn + 
                                                (RANGE_AMPLITUDE-2)*BUFFER_LENGTH_IN_COLUMNS/RANGE_AMPLITUDE;
            console.log('initX', this.GLbuffer.initX);
            console.log('initial Global Column', this.GLbuffer.initialGlobalColumn);
        }
    }

    shiftToLeft(matrix){   //------------------------------------CAMBIAR
        if (this.GLbuffer.initialGlobalColumn > 0){
            this.resetDataArray();
            // this.readaptMatrixToLeft(matrix);
            let numberOfTextureFractions = 4 //entre  - RANGE_AMPLITUDE Y -1
            this.GLbuffer.initX = this.GLbuffer.initX - RANGE_AMPLITUDE/2 -1;
            this.GLbuffer.initialGlobalColumn = this.GLbuffer.initialGlobalColumn - 
                                                (RANGE_AMPLITUDE-2)*BUFFER_LENGTH_IN_COLUMNS/RANGE_AMPLITUDE;
            console.log('initX', this.GLbuffer.initX);
            console.log('initial Global Column', this.GLbuffer.initialGlobalColumn);
            }    
        
    }

    newinitialGlobalColumn(newInitX, matrix){

    }


    readaptMatrixToRigth(matrix){  //------------------------------------CAMBIAR
        let initX = this.GLbuffer.initX;
        matrix[6] = initX*(1-matrix[0]) + RANGE_AMPLITUDE*(1/2 - matrix[0]) + 2*matrix[0]-1;
    }

    readaptMatrixToLeft(matrix){
        let initX = this.GLbuffer.initX;
        matrix[6] = initX*(1-matrix[0]) + RANGE_AMPLITUDE/2 - 2*matrix[0] + 1;
        // this.drawAxis(matrix);
        // this.drawSpectrogram(matrix);
    }

    resetDataArray(){
        this.dataArray.fill(1);
        this.GLbuffer.filledColumns = 0; 
    }

    readSTFTdata({startColumn=0, endColumn=-1}={}){
        // Debe solicitar informacion a STFT para dichos momentos
    }

    getSTFTdata(){
        this.isDrawing = false;
        let start_Column = this.GLbuffer.initialGlobalColumn + this.GLbuffer.filledColumns;  
        return this.stftHandler.read({
                            startColumn:start_Column,
                            durationColumns:BUFFER_LENGTH_IN_COLUMNS-this.GLbuffer.filledColumns});
              
    }

   
    setDataToGLbuffer(data){ 
        return new Promise((resolve,reject)=>{
            if (this.spaceOnGLbufferForData(this.GLbuffer, data) && this.isDataNew(data)){     
                this.arraySet(data.data, this.GLbuffer.filledColumns); // Puede ir cambiando para no tener que repetir lecturas en STFT
                this.GLbuffer.filledColumns = data.end - this.GLbuffer.initialGlobalColumn;
                this.chalan.setTextures(this.dataArray);
                resolve();
            }   
            else {
                reject();
            }
        });
    }



    isDataNew(data){
        return (data.end-this.GLbuffer.initialGlobalColumn > this.GLbuffer.filledColumns)
    }
    arraySet(data, columnPosition){
        this.dataArray.set(data, columnPosition*this.stftHandler.bufferColumnHeight);
    }

    checkIfGLbufferIsFull() {
    // Este método debe de regresar una promesa que se resuelve cuando el stftbuffer
    // esté lleno
    return new Promise ((resolve,reject)=>{
      let checkIfGLbufferIsFull = () => {
        if (this.GLbuffer.filledColumns == BUFFER_LENGTH_IN_COLUMNS){
          console.log('GLbuffer is ready')
          resolve();
        }
        else {setTimeout(checkIfGLbufferIsFull,CHECK_BUFFER_DELAY)}
      }
      checkIfGLbufferIsFull();
    })
  }

}

export {RANGE_AMPLITUDE}