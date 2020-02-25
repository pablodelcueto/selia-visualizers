import webGLchalan from './webGL.js';
import axisDrawer from './axis.js';

export default class Artist{
    constructor(visualizer, stftHandler){
        this.stftHandler = stftHandler;
        this.visualizer = visualizer;
        // this.config = INIT_CONFIG;
        this.glHandler = new webGLchalan();
        this.axisHandler = new axisDrawer();
        this.glHandler.colorImage.onload = () => {this.init()}
        this.stftLoadedValues = {
            initialTime : 0,
            finalTime : 0,
        }
        this.matrix = null;
    }

    init(){
        this.glHandler.setTextures();
    }

    adjustSize(){
        this.glHandler.adjustSize();
    }

    setTexture(initialTime, finalTime){
        let data = this.stftHandler.read({startTime:initialTime, endTime:finalTime});
        // console.log()
        let resultInitialTime = this.WAVtoTime(this.columnToWAV(data.start));
        let resultFinalTime = this.WAVtoTime(this.columnToWAV(data.end));
        this.setLoadedData(resultInitialTime, resultFinalTime);
        const width = data.end-data.start;
        const height = this.stftHandler.bufferColumnHeight;
        this.glHandler.setupPositionBuffer(resultInitialTime, resultFinalTime, 0, this.stftHandler.bufferColumnHeight);
        this.glHandler.setupArrayTexture(
            data.data,
            width,
            height);
        return {resultInitialTime: initialTime, resultFinalTime: finalTime}
    } 

    draw(initialTime, finalTime, matrix){
        if (this.requiredNewDataOnTexture(initialTime, finalTime)){
            if (this.matrix != matrix){
                this.setTexture(initialTime, finalTime)
                this.glHandler.draw(matrix);
                this.matrix = matrix;
            }
        }
        else{
            if (this.matrix!=matrix){
                this.glHandler.draw(matrix)              
            }
        }
        this.matrix = matrix;
    }

    requiredNewDataOnTexture(initialTime, finalTime){
        return (initialTime != this.stftLoadedValues.initialTime || finalTime != this.stftLoadedValues.finalTime)
    }

    setLoadedData(initialTime, finalTime){
        this.stftLoadedValues.initialTime = initialTime;
        this.stftLoadedValues.finalTime = finalTime;
    }

    columnToWAV(column){
        return this.stftHandler.getWavIndexFromStftColumn(column)
    }

    timeToWAV(time){
        return this.visualizer.audioFile.getIndex(time)
    }

    WAVtoColumn(index){
        return this.stftHandler.getStftColumnFromWavIndex(index) 
    }

    WAVtoTime(index){
        return this.visualizer.audioFile.getTime(index)
    }

    numberColumn(time){
        let WAVindex = this.timeToWAV(time);
        return this.WAVtoColumn(WAVindex);
    }

    columnToTime(column){
        return this.WAVtoTime(this.columnToWAV(column));

    }

    setGLdimensions(width, height){
        this.glHandler.dimensions.width = width;
        this.glHandler.dimensions.height = height;
    }




}