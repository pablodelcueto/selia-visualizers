import webGLchalan from './webGL.js';
import axisDrawer from './axis.js';

const COLUMNS_PER_STFT_COMPUTATION = 50;
const CHECK_BUFFER_DELAY = 1;
const BUFFER_LENGTH_IN_COLUMNS = 14000;
const RANGE_AMPLITUDE = BUFFER_LENGTH_IN_COLUMNS / 700;   // We want it to be multiple of 4.
const INIT_CONFIG = {
    colorMap : 'blueGum',
    amplitudScale : 'logaritmo',
    FrequenciesScale: 'lineal',
    colorFilter : null,
    initialTime : 0, 
};

export default class Artist{
    constructor(visualizer, stftHandler){
        this.stftHandler = stftHandler;
        this.initialPosition = 0;
        this.finalPosition = 0;
        this.outsideCanvasLeftTime = 0;
        this.outsideCanvasRigthTime = 0;
        this.visualizer = visualizer;
        
    //las conf de dibujo:
    // colorMap, escalade aplitud(normal, cuadrada, log), escala de frecuencia(lineal  o log)
    // limitescolorMap (el filtrado)
    // initialTime de donde el buffer deberá comenzar a pedirle infomacion a STFTh.
        this.config = INIT_CONFIG;
        this.chalan = new webGLchalan();
        this.gl = this.chalan.gl;
        this.GLbuffer = { 
            initialGlobalColumn : 1709, //first column in STFTbuffer used. 
            filledColumns: 0, // goes from 0 to buffer length.
            initX : 0, // this is the point used to translate the positionBuffer each time new bufferload is required.
            };
        // this.initialTime = this.visualizer.audioFile()
        this.dataArray = new Float32Array(BUFFER_LENGTH_IN_COLUMNS*this.stftHandler.bufferColumnHeight).fill(1);
        this.chalan.colorImage.onload = () =>{this.init()};    
    }

    init(){
        this.chalan.setupPositionBuffer(this.GLbuffer.initX)
        this.stftHandler.waitForAudioHandler()
            .then(()=>{
                this.GLbuffer.secondsInBuffer = BUFFER_LENGTH_IN_COLUMNS/this.stftHandler.columnsPerSecond();
                this.axisHandler = new axisDrawer();
                this.setGLdimensions(BUFFER_LENGTH_IN_COLUMNS,this.stftHandler.bufferColumnHeight);
            });
    }

    adjustSizes(){
        this.chalan.adjustSize();
        this.axisHandler.resizeAxisCanvas();
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

    draw(matrixTransformation){
        if(this.isShiftNeeded(matrixTransformation) || this.stillSpaceOnGLbuffer(this.GLbuffer)){
            this.realizeShift(matrixTransformation);
            let GLdata = this.getSTFTdata();
                this.setDataToGLbuffer(GLdata)
                    .then(()=>{                        
                        this.drawAxis(matrixTransformation[0]);
                        this.drawSpectrogram(matrixTransformation);
                    })
                    .catch(()=>{
                        // console.log('There is no more info in stftBuffer, it must shift STFTBuffer.');    
                        this.drawAxis(matrixTransformation[0]);
                        this.drawSpectrogram(matrixTransformation);
                    });
        }
        else{
            this.drawAxis(matrixTransformation[0]);
            this.drawSpectrogram(matrixTransformation);
        }               
    }

    drawAxis(zoomFactor){
        let presicion = this.computeTimePresicion(zoomFactor); // Depends on time coordinate expantion. 
      
        let bordersTime = this.computeBordersTime();
        let leftValues = this.outsideCanvasLeftTimeAndPosition(presicion, bordersTime.leftTime);
        let rigthValues = this.outsideCanvasRigthTimeAndPosition(presicion, bordersTime.rigthTime);
        
        let initTime = leftValues.outsideLeftTime;
        let finalTime = rigthValues.outsideRigthTime;
        let initOutsidePosition = leftValues.outsideLeftPosition;
        let finalOutsidePosition = rigthValues.outsideRigthPosition;
        
        let numberOfTicks = this.numberOfTicks(presicion, initTime, finalTime);
        
        this.axisHandler.adaptAxis(zoomFactor, initOutsidePosition, finalOutsidePosition, numberOfTicks, initTime, finalTime);
    }

    drawSpectrogram(matrixTransformation){ 
        this.chalan.draw(matrixTransformation);
    }


    stillSpaceOnGLbuffer(buffer){
            return (buffer.filledColumns < BUFFER_LENGTH_IN_COLUMNS - COLUMNS_PER_STFT_COMPUTATION -10)
    }


    gotRequestedStartColumn(newData){
        return (this.GLbuffer.initialGlobalColumn + this.GLbuffer.filledColumns == newData.start)
    }


    spaceOnGLbufferForData(buffer, data){
        return (buffer.filledColumns + (data.end-data.start) <= BUFFER_LENGTH_IN_COLUMNS)           
    }

    isShiftNeeded(matrix){ 
        let r = RANGE_AMPLITUDE;
        let initX = this.GLbuffer.initX;
           return (matrix[0]*initX + r/2*matrix[0] + matrix[6] >=  1  
            || matrix[0]*initX + r*matrix[0] - r/2*matrix[0] + matrix[6] <=  - 1 ) //shift to left || shift a la derecha
    }


    realizeShift(matrix){ 
        let initX = this.GLbuffer.initX;
        let r = RANGE_AMPLITUDE;
         if (this.isShiftNeeded(matrix)){
                if (matrix[0]*initX + r*matrix[0] - (r/2)*matrix[0] + matrix[6] <=  -1 ){
                this.shiftToRight(matrix);
            }
            else if(matrix[0]*initX + (r/2)*matrix[0] + matrix[6] >= 1  && initX >0){
                this.shiftToLeft(matrix);
            }         

            this.chalan.setupPositionBuffer(this.GLbuffer.initX);
        }            
    }

    shiftToRight(matrix){ //In case canvas is mpving to the right.  //------------------------------------CAMBIAR
        if (this.GLbuffer.initialGlobalColumn+BUFFER_LENGTH_IN_COLUMNS < this.stftHandler.lastComputedBufferColumn){
            this.resetDataArray();
            this.GLbuffer.initX = this.GLbuffer.initX + 3/2*(RANGE_AMPLITUDE/4); 
            this.GLbuffer.initialGlobalColumn = this.GLbuffer.initialGlobalColumn + 3/2*BUFFER_LENGTH_IN_COLUMNS/4;
        }
    }

    shiftToLeft(matrix){
        if (this.GLbuffer.initialGlobalColumn > 0){
            this.resetDataArray();
            this.GLbuffer.initX = this.GLbuffer.initX - 3/2*(RANGE_AMPLITUDE/4);
            this.GLbuffer.initialGlobalColumn = this.GLbuffer.initialGlobalColumn - 3/2*BUFFER_LENGTH_IN_COLUMNS/4; 
        }    
    }


    resetDataArray(){
        this.dataArray.fill();
        this.GLbuffer.filledColumns = 0; 
    }

    readSTFTdata({startColumn=0, endColumn=-1}={}){
        // Debe solicitar informacion a STFT para dichos momentos
    }

    getSTFTdata(){
        let start_Column = this.GLbuffer.initialGlobalColumn + this.GLbuffer.filledColumns;  
        return this.stftHandler.read({
                            startColumn:start_Column,
                            durationColumns:BUFFER_LENGTH_IN_COLUMNS-this.GLbuffer.filledColumns});
              
    }

    //data tiene start, end and data
    setDataToGLbuffer(data){ 
        return new Promise((resolve,reject)=>{
            if (this.gotRequestedStartColumn(data)){
                this.arraySet(data.data, data.start-this.GLbuffer.initialGlobalColumn);
                this.chalan.setTextures(this.dataArray);
                resolve();
            } 

            else if (this.spaceOnGLbufferForData(this.GLbuffer, data) && this.isDataNew(data)){     
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



    computeBordersTime(){
        let initialCanvasPoint = this.visualizer.canvasToPoint(this.visualizer.createPoint(0,0)); 
        let finalCanvasPoint = this.visualizer.canvasToPoint(this.visualizer.createPoint(1,0));
        let leftBorderTime = this.visualizer.pointToTime(initialCanvasPoint);
        let rigthBorderTime = this.visualizer.pointToTime(finalCanvasPoint);
        return {leftTime:leftBorderTime, rigthTime: rigthBorderTime}
    }


    outsideCanvasLeftTimeAndPosition(precision, leftBorderTime){
        let adaptedTimeToPresicion = Math.floor(leftBorderTime);
        // let adaptedTimeToPresicion = Math.floor(leftBorderTime*(10**presicion))/(10**presicion);
        // let adaptedTimeToPresicion = borderTime.toFixed(presicion);
        let adaptedPoint = this.visualizer.timeToPoint(Number(adaptedTimeToPresicion));
        let outPosition = this.visualizer.pointToCanvas(adaptedPoint);
        let outTime = this.visualizer.pointToTime(adaptedPoint);
        return {outsideLeftPosition: outPosition , outsideLeftTime: outTime}
    }


    outsideCanvasRigthTimeAndPosition(precision, rigthBorderTime){
        let adaptedRigthTimeToPresicion = Math.ceil(rigthBorderTime);
        // let adaptedRigthTimeToPresicion = Math.ceil(rigthBorderTime*(10**presicion))/(10**presicion);
        // let adaptedRigthTimeToPresicion = rigthBorderTime.toFixed(presicion);
        let adaptedRigthPoint = this.visualizer.timeToPoint(Number(adaptedRigthTimeToPresicion));
        let outPosition = this.visualizer.pointToCanvas(adaptedRigthPoint);
        let outTime = this.visualizer.pointToTime(adaptedRigthPoint);
        return {outsideRigthPosition: outPosition , outsideRigthTime: outTime}
        }
    


    computeTimePresicion(factor){
         if (factor <= 2 ){
            return 0    
        }
        else if ( factor <= 4){
            console.log(factor);
            return 1
        }
        else {
            return 2
        }
    }

    numberOfTicks(presicion,outsideLeftTime, outsideRigthTime){
        return (outsideRigthTime-outsideLeftTime)*10**presicion;
    }

}

export {RANGE_AMPLITUDE}