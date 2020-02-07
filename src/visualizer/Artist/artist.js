import webGLchalan from './webGL.js';

const COLUMNS_PER_STFT_COMPUTATION = 10;
const BUFFER_LENGTH_IN_COLUMNS = 10000;
const CHECK_BUFFER_DELAY = 1;
const RANGE_AMPLITUDE = 10;
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
        this.GLbuffer = { 
            initialGlobalColumn : 0, //first column in STFTbuffer used. 
            filledColumns: 0, // goes from 0 to buffer length.
            initX : 0, // this is the point used to translate the positionBuffer each time new bufferload is required.
            };
        this.dataArray = new Float32Array(BUFFER_LENGTH_IN_COLUMNS*this.stftHandler.bufferColumnHeight).fill(1);
        this.chalan.colorImage.onload = () =>this.init();    
    }

    init(){
        this.chalan.setupPositionBuffer(this.GLbuffer.initX)
        this.stftHandler.waitForAudioHandler()
            .then(()=>{
                this.setGLdimensions(BUFFER_LENGTH_IN_COLUMNS,this.stftHandler.bufferColumnHeight);
                setTimeout(()=>this.draw(new Float32Array([1,0,0,0,1,0,0,0,1])),100)})
    }

    getConfig(){ 

    }
    
    setGLdimensions(width, height){
        // this.chalan.dimensions.width = Math.min(width, this.stftHandler.lastComputedBufferColumn);
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

    draw(matrixTransformation){
        if(this.isShiftNeeded(matrixTransformation) || this.stillSpaceOnGLbuffer(this.GLbuffer)){
            this.realizeShift(matrixTransformation);
            let GLdata = this.getSTFTdata();
                this.setDataToGLbuffer(GLdata)
                    .then(()=>{                        
                        this.drawAxis(matrixTransformation);
                        this.drawSpectrogram(matrixTransformation);
                    })
                    .catch(()=>{
                        // console.log('There is no more info in stftBuffer, it must shift.');    
                        // this.drawAxis(matrixTransformation);
                        // this.drawSpectrogram(matrixTransformation);
                    });
        }
        else{
            this.drawAxis(matrixTransformation);
            this.drawSpectrogram(matrixTransformation);
        }               
    }

    secondDraw(matrixTransformation){
        if(this.isShiftNeeded(matrixTransformation) || this.stillSpaceOnGLbuffer(this.GLbuffer)){
            this.realizeShift(matrixTransformation);
            let GLdata = this.getSTFTdata();
                this.secondSetDataToGLbuffer(GLdata);                    
                    this.drawAxis(matrixTransformation);
                    this.drawSpectrogram(matrixTransformation);
        }
        else{
            this.chalan.setTextures(this.dataArray);
            this.drawAxis(matrixTransformation);
            this.drawSpectrogram(matrixTransformation);
        }
    }

    drawAxis(matrixTransformation){
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

    isShiftNeeded(matrix){
        let initX = this.GLbuffer.initX;
        return (matrix[0]*initX + RANGE_AMPLITUDE*matrix[0] + matrix[6] <  1 
            || matrix[0]*initX - RANGE_AMPLITUDE*matrix[0] + matrix[6] >  -1)         
    }


    realizeShift(matrix){
        let initX = this.GLbuffer.initX;
         if (this.isShiftNeeded(matrix)){
            console.log('shifting matrix',matrix);
            if (matrix[0]*initX + RANGE_AMPLITUDE*matrix[0] + matrix[6] <  1){
                this.shiftToRight(matrix);
            }
            else if(matrix[0]*initX - RANGE_AMPLITUDE*matrix[0] + matrix[6] >  -1){
                this.shiftToLeft(matrix);
            }
            console.log('initX', this.GLbuffer.initX)
            this.chalan.setupPositionBuffer(this.GLbuffer.initX);
            // this.chalan.setupTextureCoordinatesBuffer();
        }            
    }

    shiftToRight(matrix){ //In case canvas is mpving to the right.
        console.log('shifting rigth with matrix:', matrix);
        if (this.GLbuffer.initialGlobalColumn+BUFFER_LENGTH_IN_COLUMNS < this.stftHandler.lastComputedBufferColumn){
            this.resetDataArray();
            console.log('doing shift');
            this.readaptMatrix(matrix);
            console.log('adapted matrix', matrix);
            this.GLbuffer.initX = (1-matrix[6]-matrix[0])/matrix[0]; 
            this.GLbuffer.initialGlobalColumn = this.GLbuffer.initialGlobalColumn + 
                                        (RANGE_AMPLITUDE-1)*(BUFFER_LENGTH_IN_COLUMNS)/(RANGE_AMPLITUDE*2);                                       
        }
    }

    shiftToLeft(matrix){
        console.log('shifting left with matrix:', matrix);
        if (this.GLbuffer.initialGlobalColumn > 0){
            this.resetDataArray();
            this.readaptMatrix(matrix);
            this.GLbuffer.initX = (-1-matrix[6]+matrix[0])/matrix[0]; 
            this.GLbuffer.initialGlobalColumn = this.GLbuffer.initialGlobalColumn -
                                    (RANGE_AMPLITUDE-1)*(BUFFER_LENGTH_IN_COLUMNS)/(RANGE_AMPLITUDE*2);
        }    
        
    }


    readaptMatrix(matrix){
        let initX = this.GLbuffer.initX;
        if (matrix[0]*initX + RANGE_AMPLITUDE*matrix[0] + matrix[6] <  1){ // Se esta haciendo traslacion negativa
            matrix[6] = 1 - matrix[0]*(initX+RANGE_AMPLITUDE);
        }

        else if(matrix[0]*initX - RANGE_AMPLITUDE*matrix[0] + matrix[6] > - 1){
            matrix[6]= -1 + matrix[0]*(RANGE_AMPLITUDE-initX);
        }
        this.drawAxis(matrix);
        this.drawSpectrogram(matrix);
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
                console.log('data', data);
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