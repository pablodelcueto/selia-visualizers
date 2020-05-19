/**
* @module visualizer
* @see  visualizer
*/

import React from 'react';
import VisualizerBase from '../VisualizerBase';
import Artist from './Artist/artist';
import STFTHandler from './STFTHandler/STFTHandler';
import AudioFile from './Audio/audioFile';
import Reproductor from './Audio/reproductor';
import Tools from './Tools';

/** STFT configurations */
const INIT_CONFIG = {
    stft: {
        window_size: 516,
        hop_length: 256,
        window_function: 'hann',
    },
    startTime: 0.0,
};

/** Seconds per canvas frame */
const INITIAL_SECONDS_PER_WINDOW = 10;

/**
* @property {Object} config - Visualization cnfigurations.
* @property {Class} audioFile - Audio data reader class.
* @property {Class} audioReproductor - Audio reproductor class.
* @property {Class} STFTRetriever - STFT computation results deliver.
* @property {Node} canvasContainer - Document node containing canvas.
* @property {Class} artist - Spectrogram sketches artist.
* @property {SVGmatrix} - SVGtransformationMatrix - Matrix to translate or scale image.
* @property {ActionVariable} zoomSwitchPosition - Indicates zooming Tool state.
* @property {Object} draggingState - Variables needed for dragging spectogram.
* @property {Point} draggingState.last - Initial dragging point.
* @property {boolen} draggingState.dragging - Indicates if dragging is been 
*
* @class 
*/

class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";

    /**
    * Initialize Visualizer instance.
    */
    init() {
        this.config = INIT_CONFIG;
        // Class dealing with raw audio file. 
        this.audioFile = new AudioFile(this.itemInfo.url);
        // Audio Reproduction class
        this.audioReproductor = new Reproductor(this.audioFile);
        // Class computing the Discrete Fourior Transform of the WAV file
        this.STFTRetriever = new STFTHandler(this.audioFile, INIT_CONFIG);
       
        this.canvasContainer = document.getElementById('canvasContainer');
        // Class dealing with webGL and axis responsabilities.
        this.artist = new Artist(this, this.STFTRetriever);
       
        this.audioLength = null;
        // Used to enable/disable rectangles zoom tool.
        this.zoomSwitchPosition = false;
      
        // this.initialMousePosition = null;
        this.last = null;
        this.dragStart = null; 
        this.dragged = false;
        this.STFTRetriever.waitUntilReady()
            .then(() => {
                this.artist.maxFrequency = this.audioFile.mediaInfo.sampleRate / 2;
                this.SVGtransformationMatrix = this.svg.createSVGMatrix()
                    .translate(1 / 2, 0)
                    .scaleNonUniform(
                        1 / INITIAL_SECONDS_PER_WINDOW,
                        2 / this.audioFile.mediaInfo.sampleRate,
                    );
                this.initMatrix = this.SVGtransformationMatrix;
                this.upgradeAudioLength();
                this.startDrawing();
            });
    }

    /**
    * Adjust size of canvas after toolsBox make some modifications.
    * It adjust webGL viewport with new sizes too.
    */
    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('artist' in this) {
            this.artist.adjustSize();
        }
    }

    /**
    * Used to set Image as when page just loaded.
    */
    resetMatrix() {
        const conf = { stft: {}, startTime: 0 };
        this.STFTRetriever.setConfig(conf);
        this.SVGtransformationMatrix = this.initMatrix;
    }

    /**
    * Used to upgrade audioLength, which is used in slider tool and axis drawer class.
    */
    upgradeAudioLength() {
        this.audioLength = this.audioFile.mediaInfo.durationTime.toString();
        this.artist.axisHandler.audioLength = this.audioLength;
    }   

    /**
    * @param {Object} config - Object to fill this.config variable.
    * set this.config variable and call the required dependencies to recompute DFT and redraw.
    */
    setConfig(config) {   
        this.STFTRetriever.config = this.config;
    }

    /**
    * @return {Object} Returns an Object with central configuration.
    */
    getConfig() {
        //Debe hacer una lectura del estado del toolbox 
        return this.config;
    }

    /**
    * Method used to set all mouse events required.
    */
    getEvents() {
        // document.addEventListener('keydown', this.checkZoomAction);
        this.getMouseEventPosition = this.getMouseEventPosition.bind(this);   
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.mouseScroll = this.mouseScroll.bind(this);
        this.doubleClick = this.doubleClick.bind(this);
        return {
            mousedown: this.mouseDown,
            mousemove: this.onMouseMove,
            mouseup: this.mouseUp,
            mousewheel: this.mouseScroll,
            wheel: this.mouseScroll,
            dblclick: this.doubleClick,
        };
    }

    renderToolbar() {
        this.toolBoxRef = React.createRef();
        this.toolBox = (
            <Tools
                ref={this.toolBoxRef}
                id="toolbox"
                //-----------Data---------------------------
                config={this.config}
                audioFile={this.audioFile}
                canvasContainer={this.canvasContainer}
                canvas={this.canvas}
                canvasTimes={() => this.timesInCanvas()}
                //-----------Methods-------------------------
                switchButton={() => this.zoomSwitchPosition = !this.zoomSwitchPosition}
                revertAction={() => this.revertAction()}
                home={() => this.resetMatrix()}
                showInfoWindow={() => this.showInfoWindow()}
                modifyWindowFunction={
                    (newWindowFunction) => this.modifyWindowFunction(newWindowFunction)
                }
                modifyHopLength={(newLength) => this.modifyHopLength(newLength)}
                modifyWindowSize={(newWindowSize) => this.modifyWindowSize(newWindowSize)}
                modifyColorMap={(newColor) => this.modifyColorMap(newColor)}
                modifyInfFilter={(newValue) => this.modifyInfFilter(newValue)}
                modifySupFilter={(newValue) => this.modifySupFilter(newValue)}
                moveToCenter={(newTime) => this.translatePointToCenter(this.createPoint(newTime, 0))}
                reproduceAndPause={(time) => this.reproduceAndPause(time)} 
                stopReproduction={() => this.stopReproduction()} 
                canvasCoords={(event) => this.getMouseEventPosition(event).x} />
        );
        return this.toolBox  
    }

    /**
    * Call this function when all settings are ready to start drawing the spectrogram.
    */
    startDrawing() {
        this.draw();
        this.drawingId = setTimeout(() => this.startDrawing(), 100);
    }

    // startDrawing() {
    //     this.draw();
    //     requestAnimationFrame(this.startDrawing());
    // }

    draw() {
        const glArray = this.SVGmatrixToArray(this.SVGtransformationMatrix);
        const leftInferiorCorner = this.canvasToPoint(this.createPoint(0, 0));
        const rigthSuperiorCorner = this.canvasToPoint(this.createPoint(1, 1));
        this.artist.draw(
            leftInferiorCorner.x,
            rigthSuperiorCorner.x,
            leftInferiorCorner.y,
            rigthSuperiorCorner.y,
            glArray);
    }

    SVGmatrixToArray() {
        const matrixArray = new Float32Array([
            this.SVGtransformationMatrix.a,
            this.SVGtransformationMatrix.b,
            0,
            this.SVGtransformationMatrix.c,
            this.SVGtransformationMatrix.d,
            0,
            this.SVGtransformationMatrix.e,
            this.SVGtransformationMatrix.f,
            1,
        ]);
        return matrixArray;
    }

    canvasToPoint(p) {
        return p.matrixTransform(this.SVGtransformationMatrix.inverse());
    }

    pointToCanvas(p) {
        return p.matrixTransform(this.SVGtransformationMatrix);
    }


    validatePoints(p) {
        // abstract method
    }

    computeCanvasMeasures() {
        const time = this.canvasToPoint(this.createPoint(1, 0)).x
                                        - this.canvasToPoint(this.createPoint(0, 0)).x;
        const frec = this.canvasToPoint(this.createPoint(0, 1)).y
                                        - this.canvasToPoint(this.createPoint(0, 0)).y;
        return { canvasTime: time, canvasFrequency: frec };
    }

    scale(p) {
        const matrix = this.SVGtransformationMatrix.scaleNonUniform(p.x, p.y);
        this.SVGtransformationMatrix = matrix;
    }

    zoomOnPoint(factor, fixedPoint) {
        const condition1 = (factor.x < 1 && this.SVGtransformationMatrix.a > 1 / 60)
        || (factor.x > 1 && this.SVGtransformationMatrix.a < 30);
        const condition2 = (factor.y < 1)
            && (this.SVGtransformationMatrix.d  < (3 / 2) / this.audioFile.mediaInfo.sampleRate);

        if (!condition2) {
            let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x, fixedPoint.y);
            matrix = matrix.scaleNonUniform(factor.x, factor.y);
            matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y);
            this.SVGtransformationMatrix = matrix;
        }

        // // console.log('zoomY', this.SVGtransformationMatrix.d, 1/12000);
        // if ((factor.x < 1 && this.SVGtransformationMatrix.a > 1 / 60)
        // || (factor.x > 1 && this.SVGtransformationMatrix.a < 30)) {
        //     console.log('Algo1', factor, this.SVGtransformationMatrix.a)
        // } else if ((factor.y < 1)
        //     && (this.SVGtransformationMatrix.d > 1 / this.audioFile.mediaInfo.sampleRate)) {
        //     console.log('Algo2')
        // } else {
        // let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x, fixedPoint.y);
        // matrix = matrix.scaleNonUniform(factor.x, factor.y);
        // matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y);
        // this.SVGtransformationMatrix = matrix;
        // }
    }

    translation(p) {
        if (this.canvasToPoint(this.createPoint(0, 1)).y >= this.audioFile.mediaInfo.sampleRate/2 && p.y < 0) {
            p.y = 0;
        } else if (this.canvasToPoint(this.createPoint(0, 0)).y <= 0 && p.y > 0) {
            p.y = 0;
        } else if (this.pointToCanvas(this.createPoint(0, 0)).x >= 0.5 && p.x > 0) {
            p.x = 0;
        } else if (this.pointToCanvas(this.createPoint(this.audioLength, 0)).x <= 0.5 && p.x < 0) {
            p.x = 0;
        }
        const matrix = this.SVGtransformationMatrix.translate(p.x, p.y);
        this.SVGtransformationMatrix = matrix;
    }

    translatePointToLeft(p) {
        const leftPoint = this.canvasToPoint(this.createPoint(0, 0));
        const translationPoint = this.createPoint(leftPoint.x - p.x, leftPoint.y-p.y);
        this.translation(translationPoint);
        // const timeSelector = document.getElementById('timeSelector');
        // timeSelector.value = p.x;
    }

    translatePointToCenter(p) {
        const centerPoint = this.canvasToPoint(this.createPoint(1 / 2, 0));
        const translationPoint = this.createPoint(centerPoint.x - p.x, 0);
        this.translation(translationPoint);
    }


    getMouseEventPosition(event) {
        const canvasContainer = this.canvasContainer;
        let x = event.offsetX || (event.pageX - canvasContainer.offsetLeft);    
        let y = event.offsetY || (event.pageY - canvasContainer.offsetTop);      
        x = x / this.canvas.width;
        y = (-1 * y) / this.canvas.height + 1;
        const point = this.createPoint(x, y);
        return point;
    }

    mouseDown(event) {
        this.initialClick = this.getMouseEventPosition(event);
        this.last = this.getMouseEventPosition(event);
        this.dragStart = this.canvasToPoint(this.last);
        this.dragged = true;
    }

    onMouseMove(event) {
        if (this.dragged) {
            if (this.zoomSwitchPosition === false) {
                this.last = this.getMouseEventPosition(event);
                var pt = this.canvasToPoint(this.last);
                pt.x -= this.dragStart.x;
                pt.y -= this.dragStart.y;
                this.translation(pt);
                this.dragStart = this.canvasToPoint(this.last);
            } else {
                const actualPoint = this.getMouseEventPosition(event);
                const rect = this.computeRectanglePixelsValues(this.last, actualPoint);
                this.artist.drawZoomRectangle(rect.x, rect.y, rect.baseLength, rect.heightLength);
            }
        } else {
            // Nothing to be done here.
        }
        this.moveSliderDiv();
        this.fillInfoWindow(event);
    }

    mouseUp(event) {  
        if (this.dragged === true) {
            this.dragged = false;

            if (this.zoomSwitchPosition === true) {
                this.secondaryTransformation = this.SVGtransformationMatrix;
                const secondPoint = this.getMouseEventPosition(event);
                this.zoomOnRectangle(this.last, secondPoint);
            }
        }
    }

    zoomOnRectangle(firstPoint, secondPoint) {
        const canvasMeasures = this.computeCanvasMeasures();
        const rectangle = this.computeRectangleTimeFreqValues(firstPoint, secondPoint);

        const factorPoint = this.createPoint(
            canvasMeasures.canvasTime / rectangle.timeLength,
            canvasMeasures.canvasFrequency / rectangle.frequencyLength
        );

        this.scale(factorPoint);
        this.translatePointToLeft(this.createPoint(rectangle.x, rectangle.y));
        this.artist.axisHandler.isZooming = false;
    }

    /**
    * @param {point} firstPoint - first Point of the rectangleZoomTool
    * @param {point} secondPoint - second point of the rectangleZoomTool
    * This method computes the left superior corner, the width, and the height of the rectangle
    * selected to zoom it.
    */ 
    computeRectanglePixelsValues(firstPoint, secondPoint) {
        const rigthXcoordinate = Math.max(firstPoint.x, secondPoint.x) * this.canvas.width;
        const leftXcoordinate = Math.min(firstPoint.x, secondPoint.x) * this.canvas.width;
        const bottomYcoordinate = (1 - Math.max(firstPoint.y, secondPoint.y)) * this.canvas.height;
        const topYcoordinate = (1 - Math.min(firstPoint.y, secondPoint.y)) * this.canvas.height;
        const width = rigthXcoordinate - leftXcoordinate;
        const height = topYcoordinate - bottomYcoordinate;
        return {
            x: leftXcoordinate, y: bottomYcoordinate, baseLength: width, heightLength: height,
        };
    }

    /**
    * @param {point} firstPoint - first Point of the rectangleZoomTool
    * @param {point} secondPoint - second point of the rectangleZoomTool
    * This method computes the times and frequencies corresponding to a canvas rectangle, values
    * used to fit the rectangle on the whole canvas.
    */
    computeRectangleTimeFreqValues(firstPoint, secondPoint) {
        const initialPoint = this.canvasToPoint(firstPoint);
        const finalPoint = this.canvasToPoint(secondPoint);
        const rigthTime = Math.max(initialPoint.x, finalPoint.x);
        const leftTime = Math.min(initialPoint.x, finalPoint.x);
        const topFrequency = Math.max(initialPoint.y, finalPoint.y);
        const bottomFrequency = Math.min(initialPoint.y, finalPoint.y);
        const timeRangeLength = rigthTime - leftTime;
        const frequencyRangeLength = topFrequency - bottomFrequency;
        return {
            x: leftTime, y: bottomFrequency, timeLength: timeRangeLength, frequencyLength: frequencyRangeLength,
        };
    }


    mouseScroll(event) {
        let factorPoint;
        const mousePosition = this.getMouseEventPosition(event);
        const fixedPoint = this.canvasToPoint(mousePosition);
        const dir = this.createPoint(event.deltaX, event.deltaY);
        if (dir.x !== 0) {
            this.translation(this.createPoint(dir.x / 50.0, 0));
        } else if (dir.y !== 0) {
            const factor = (dir.y < 0) ? 1.04 : 0.96;
            if (!event.shiftKey) {
                factorPoint = this.createPoint(factor, 1);
                // this.zoomOnPoint(factorPoint,fixedPoint)
            } else {
                factorPoint = this.createPoint(1, factor);

            }
            this.zoomOnPoint(factorPoint, fixedPoint);
        }
        this.moveSliderDiv();
    }


    doubleClick(event) {
        const point = this.canvasToPoint(this.getMouseEventPosition(event));
        if (this.isPlaying) {
            this.reproduceAndPause();
            this.translatePointToCenter(point);
            this.moveSliderDiv();
            this.reproduceAndPause();
            return 
        }
        this.translatePointToCenter(point);
        this.moveSliderDiv();
    }
  
    moveSliderDiv() {
        this.toolBoxRef.current.moveSliderFromCanvas();
    }

    timesInCanvas() {
        return {
            leftTime: this.leftBorderTime(),
            centralTime: this.centralTime(),
            rigthTime: this.rigthBorderTime(),
        };
    }

    rigthBorderTime() {
        return Math.min(this.canvasToPoint(this.createPoint(1, 0)).x,
            this.audioFile.mediaInfo.durationTime);
    }

    leftBorderTime() {
        return Math.max(0, this.canvasToPoint(this.createPoint(0, 0)).x);
    }

    centralTime() {
        return this.canvasToPoint(this.createPoint(1 / 2, 0)).x
    }

    
    fillInfoWindow(event) {
        const value = this.canvasToPoint(this.getMouseEventPosition(event));
        const time = `Tiempo: ${value.x.toFixed(2)} segundos.`;
        const frequency = `Frecuencia: ${value.y.toFixed(0)} Hz.`;
        this.toolBoxRef.current.setCursorInfo(time, frequency);
    }

    revertAction() {
        if (this.secondaryTransformation != null) {
            this.SVGtransformationMatrix = this.secondaryTransformation;
        }
    }

    /**
    * @param {newWindowFunction} string- Name of the function type used to create the 
    * window blocks
    */    
    modifyWindowFunction(newWindowFunction) {
        const conf = {
            stft: {
                window_function: newWindowFunction,
            },
            startTime: this.leftBorderTime(),
        };
        this.config.stft.window_function = newWindowFunction;
        this.STFTRetriever.setConfig(conf);
        this.artist.reset();
    }

    /**
    * @param {number} newWindowSize -Block size used in each discrete fourier transformation
    * in the stftHandler
    */
    modifyWindowSize(newWindowSize) {
        const realValue = Math.max(newWindowSize, this.config.stft.hop_length);
        const conf = {
            stft: {
                window_size: parseInt(realValue, 10),
            },
            startTime: this.leftBorderTime(),
        };   
        this.config.stft.window_size = realValue;
        this.STFTRetriever.setConfig(conf);
        this.artist.reset();
    }

    /**
    * @param {number} newWindowHop - The discrete fourier transformation gap between each
    * block on data used on coefficents computations.
    */ 
    modifyHopLength(newWindowHop) {
        const realValue = Math.min(newWindowHop, this.config.stft.window_size);
        const conf = {
            stft: {
                hop_length: realValue,
            },
            startTime: this.leftBorderTime(),
        };
        this.config.stft.hop_length = realValue;
        this.STFTRetriever.setConfig(conf);
        this.artist.reset();
    }

    /**
    * @param {number} newColor - number to pick a line in the image loaded to select 
    * different color maps.
    */
    modifyColorMap(newColor) {
        this.artist.setColor(newColor);
        this.artist.forcingDraw=true;
    }

    // Modifies min lim of the color map.
    modifyInfFilter(newValue) {
        this.artist.setColorMapInfFilter(newValue); 
        this.artist.forcingDraw=true;
    }

    // Modifies max lim of the color map.
    modifySupFilter(newValue) {
        this.artist.setColorMapSupFilter(newValue);
        this.artist.forcingDraw=true;
    }

    /**
    * {number} time - Time where reproduction should start
    * This method handles the play/pause button. 
    * If play is pressed in pause mode it starts reproducing where it left before, if its pressed while
    * reproducing then in pause reproduction and if its pressed without being reproducing or paused, then 
    * it starts reproduction in time value.
    */ 
    reproduceAndPause() { 
        const time = this.centralTime();
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.audioReproductor.reproduce(time, () => {
                this.initialAnimationTime = this.audioReproductor.getTime();
                this.animatedMotion(time);
            });
        } else if (this.isPlaying) { 
            this.isPlaying = false;
            this.stopReproduction();
        }
    }

    /**
    * The time is driven to the center of canvas and keeps advancing forward.
    */ 
    animatedMotion(time) {
        const newTime = time + this.audioReproductor.getTime() - this.initialAnimationTime;
        this.translatePointToCenter(this.createPoint(newTime, 0));
        this.timeoutId = setTimeout(() => this.animatedMotion(time), 10);
        this.moveSliderDiv();
    }

    /**
    * clears the setTimeout ID of the reproduction.
    */
    stopReproduction() {
        this.isPaused = false;
        this.isPlaying = false;
        this.audioReproductor.stop();
        clearTimeout(this.timeoutId);
    }
}

export default Visualizer;
