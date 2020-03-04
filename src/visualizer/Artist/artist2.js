import webGLchalan from './webGL.js';
import axisDrawer from './axis.js';

export default class Artist{
    constructor(visualizer, stftHandler){
        this.stftHandler = stftHandler;
        this.visualizer = visualizer;
        this.glHandler = new webGLchalan();
        this.axisHandler = new axisDrawer(this.visualizer.canvas);
        this.glHandler.colorImage.onload = () => {this.init()}
        this.stftLoadedValues = {
            initialTime : 0,
            finalTime : 0,
        }
        this.matrix = null;
        this.color = null;
        this.limFilter = 0;
        this.maxFilter = 1;
        this.maxPixelsMarkStep = 300;
        this.minPixelsMarkStep = this.maxPixelsMarkStep / 10 - 10;
        this.presicion = 0; // 0 means mark will be each second, 1 means there will be ten marks each second.
        this.pixelsForSecond = 0;
    }

    init(){
        this.glHandler.setTextures();
    }

    resetArtist(){

    }

    setupConfig(newConfig){
        if ('color' in newConfig){
            this.glHandler.changeColor(newConfig.color);
        }

        //TODO
    }

    adjustSize(){
        this.glHandler.adjustSize();
        this.axisHandler.resizeAxisCanvas();
    }

    setTexture(initialTime, finalTime){
        let data = this.stftHandler.read({startTime:initialTime, endTime:finalTime});
        if (data.start == data.end){
            return
        }
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
        this.drawAxis(initialTime, finalTime, matrix[0])
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

    drawAxis(initialTime, finalTime, zoomFactor, initialFrequency, finalFrequency){
        this.computeTimePresicion(zoomFactor);
        this.drawHorizontalAxis(initialTime, finalTime, zoomFactor);
        this.drawVerticalAxis(0, 24);
    }

    drawHorizontalAxis(initialTime, finalTime){
        let presicion = this.presicion;
        let leftValues = this.outsideCanvasLeftTimeAndPosition(presicion, initialTime);
        let rigthValues = this.outsideCanvasRigthTimeAndPosition(presicion, finalTime);

        let width = rigthValues.outsidePosition.x - leftValues.outsidePosition.x;
        let duration = (rigthValues.outsideTime - leftValues.outsideTime);
        let numSteps = Math.floor(duration * 10**this.presicion);


        // console.log({numSteps, duration, precision: this.presicion, initOutsideTime, finalOutsideTime})
        let pixelStep = width * this.visualizer.canvas.width / numSteps;
        let timeStep = duration / numSteps;

        this.axisHandler.adaptHorizontalAxis(leftValues.outsidePosition, pixelStep, leftValues.outsideTime, timeStep, presicion, numSteps);
    }

    drawVerticalAxis(initialFrequency, finalFrequency, scale){ 

        this.axisHandler.adaptVerticalAxis(initialFrequency, finalFrequency, 50);
    }

    





    requiredNewDataOnTexture(initialTime, finalTime){
        return (initialTime != this.stftLoadedValues.initialTime || finalTime != this.stftLoadedValues.finalTime)
    }

    setLoadedData(initialTime, finalTime){
        if (initialTime == finalTime){
            return
        }
        else{
            this.stftLoadedValues.initialTime = initialTime;
            this.stftLoadedValues.finalTime = finalTime;          
        }
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


    outsideCanvasLeftTimeAndPosition(presicion, leftBorderTime){
        // let adaptedTimeToPresicion = Math.floor(leftBorderTime);
        let adaptedTimeToPresicion = Math.floor(leftBorderTime*(10**presicion))/(10**presicion);
        
        let positionOutsideCanvas = this.visualizer.pointToCanvas(this.visualizer.createPoint(adaptedTimeToPresicion,0));
        return {outsidePosition: positionOutsideCanvas , outsideTime: adaptedTimeToPresicion}
    }


    outsideCanvasRigthTimeAndPosition(presicion, rigthBorderTime){
        // let adaptedRigthTimeToPresicion = Math.ceil(rigthBorderTime);
        let adaptedRigthTimeToPresicion = Math.floor(rigthBorderTime*(10**presicion))/(10**presicion);

        let positionOutsideCanvas = this.visualizer.pointToCanvas(this.visualizer.createPoint(adaptedRigthTimeToPresicion,0));
        return {outsidePosition: positionOutsideCanvas , outsideTime: adaptedRigthTimeToPresicion}
        }
    


    computeTimePresicion(zoomFactor){
        if (this.visualizer.canvas.width/(10**this.presicion)*zoomFactor < this.minPixelsMarkStep){
            console.log('afinando escla')
            this.presicion = this.presicion - 1;
        }

        else if(this.visualizer.canvas.width/(10**this.presicion)*zoomFactor > this.maxPixelsMarkStep){
             this.presicion = this.presicion + 1;
        }
        
    }

}