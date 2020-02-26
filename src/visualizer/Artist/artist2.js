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
            width/2,
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

    drawAxis(initialTime, finalTime, zoomFactor){
        let presicion = this.computeTimePresicion(zoomFactor); // Depends on time coordinate expantion. 
        // let bordersTime = this.computeBordersTime();
        let leftValues = this.outsideCanvasLeftTimeAndPosition(presicion, initialTime);
        let rigthValues = this.outsideCanvasRigthTimeAndPosition(presicion, finalTime);
        let initOutsideTime = leftValues.outsideLeftTime;
        let finalOutsideTime = rigthValues.outsideRigthTime;
        let initOutsidePosition = leftValues.outsideLeftPosition;
        let finalOutsidePosition = rigthValues.outsideRigthPosition;
        
        let numberOfTicks = this.numberOfTicks(presicion, initOutsideTime, finalOutsideTime);
        
        this.axisHandler.adaptAxis(zoomFactor, initOutsidePosition, finalOutsidePosition, numberOfTicks, initOutsideTime, finalOutsideTime);
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

    computeBordersTime(){
        let initialCanvasPoint = this.visualizer.canvasToPoint(this.visualizer.createPoint(0,0)); 
        let finalCanvasPoint = this.visualizer.canvasToPoint(this.visualizer.createPoint(1,0));
        let leftBorderTime = this.visualizer.pointToTime(initialCanvasPoint);
        let rigthBorderTime = this.visualizer.pointToTime(finalCanvasPoint);
        return {leftTime:leftBorderTime, rigthTime: rigthBorderTime}
    }


    outsideCanvasLeftTimeAndPosition(presicion, leftBorderTime){
        // let adaptedTimeToPresicion = Math.floor(leftBorderTime);
        let adaptedTimeToPresicion = Math.floor(leftBorderTime*(10**presicion))/(10**presicion);
        // let adaptedTimeToPresicion = borderTime.toFixed(presicion);
        let positionOutsideCanvas = this.visualizer.pointToCanvas(this.visualizer.createPoint(adaptedTimeToPresicion,0));
        return {outsideLeftPosition: positionOutsideCanvas , outsideLeftTime: adaptedTimeToPresicion}
    }


    outsideCanvasRigthTimeAndPosition(presicion, rigthBorderTime){
        // let adaptedRigthTimeToPresicion = Math.ceil(rigthBorderTime);
        let adaptedRigthTimeToPresicion = Math.ceil(rigthBorderTime*(10**presicion))/(10**presicion);
        // let adaptedRigthTimeToPresicion = rigthBorderTime.toFixed(presicion);
        let positionOutsideCanvas = this.visualizer.pointToCanvas(this.visualizer.createPoint(adaptedRigthTimeToPresicion,0));
        return {outsideRigthPosition: positionOutsideCanvas , outsideRigthTime: adaptedRigthTimeToPresicion}
        }
    


    computeTimePresicion(factor){
         if (factor <= 2 ){
            return 0    
        }
        else if ( factor <= 5){
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