/**
* @module visualizer
* @see  visualizer
*/

import React from 'react';
import VisualizerBase from '../VisualizerBase';
import Artist from './Artist/artist';
import STFTHandler from './STFTHandler/STFTHandler';
import AudioFile from './Audio/audioFile';
import audioPlayer from './Audio/reproductor';
import Tools from './Tools';

/**
* Short-Time Fourier Transform configurations
* @property {Object} stft - Short-Time Fourier Transform window configurations.
* @property {number} stft.window_size - Window length for stft computations.
* @property {number} stft.hop_length - Length between two consecutive computation windows.
* @property {string}  stft.window_type - Type of window used on tensor flow computations.
* @property {number}  startTime - Initial time for stft computations.
*/
const INIT_CONFIG = {
    stft: {
        window_size: 512,
        hop_length: 256,
        window_function: 'hann',
    },
    startTime: 0.0,
};

/** Seconds per canvas frame at initial state. */
const INITIAL_SECONDS_PER_WINDOW = 10;

/**
* @property {Object} config - Visualization STFT and initial loading time configurations.
* @property {Class} audioFile - Audio data reader class.
* @property {Class} audioPlayer - Audio player class.
* @property {Class} STFTRetriever - Class computing and delivering STFT values.
* @property {Class} artist - Spectrogram sketching artist.
* @property {number} audioLength - Audio file duration.
* @property {Object} loaded - Data pictured. Used to avoid unnecesary work.
* @property {number} loaded.times.start - Start time spectrogram values pictured.
* @property {number} loaded.times.end - Final time spectrogram values pictured.
* @property {number} loaded.frequencies.start - Start frequency spectrogram values pictured.
* @property {number} loaded.frequencies.end - Final frequency spectrogram pictured.
* @property {boolean} forcingDraw - Used when configuration changes are done.
* @property {SVGmatrix} SVGtransformationMatrix - Translating or scaling image
* matrix transformation.
* @property {boolean} zoomSwitchPosition - True when zooming Tool is activated.
* @property {boolean} dragging - True when dragging image.
* @property {SVGpoint} dragStart - Initial dragging point.
* @property {SVGmatrix} savedMatrix - SVGtransformationMatrix saved available for image restoration.
* @class
*/

class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";

    /**
    * Initialize Visualizer instance with required classes and once its posible, add
    * events to canvas required for motion.
    */
    init() {
        this.config = INIT_CONFIG;
        // Class dealing with raw audio file.
        this.audioFile = new AudioFile(this.itemInfo.url);
        // Audio Reproduction class
        this.audioPlayer = null,
        // Class computing the Discrete Fourior Transform of the WAV file
        this.STFTRetriever = new STFTHandler(this.audioFile, INIT_CONFIG);
        // Class dealing with webGL and axis responsabilities.
        this.artist = new Artist(this, this.STFTRetriever);

        this.getEvents()
            .then((events) => this.bindEvents(events))
            .catch((error) => console.error(error));

        // Auxiliar variables:
        this.audioLength = null;
        //
        this.loaded = { times: { start: 0, end: 0 }, frequencies: { start: 0, end: 0 } };
        this.forcingDraw = false;
        this.zoomSwitchPosition = false;
        this.dragStart = null;
        this.dragging = false;


        // Creates transformation matrix with INITIAL_SECONDS_PER_WINDOW requirement.
        this.STFTRetriever.waitUntilReady()
            .then(() => {
                this.artist.maxFrequency = this.audioFile.mediaInfo.sampleRate / 2;
                this.SVGtransformationMatrix = this.svg.createSVGMatrix()
                    .translate(1 / 2, 0)
                    .scaleNonUniform(
                        1 / INITIAL_SECONDS_PER_WINDOW,
                        2 / this.audioFile.mediaInfo.sampleRate,
                    );
                this.savedMatrix = this.SVGtransformationMatrix;
                this.upgradeAudioLength();
                this.startDrawing();
            });
    }

    /**
    * Adjust size of canvas after toolsBox is render.
    * It adjust webGL viewport with new sizes too.
    */
    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('artist' in this) {
            this.artist.adjustSize();
        }
    }

    /**
    * Used to set transformationMatrix as at begginings of the time.
    * @public
    */
    resetMatrix() {
        const conf = { stft: {}, startTime: 0 };
        this.STFTRetriever.setConfig(conf);
        this.SVGtransformationMatrix = this.savedMatrix;
    }

    /**
    * Upgrades audio file duration time dependencies.
    * @private
    */
    upgradeAudioLength() {
        const duration = this.audioFile.mediaInfo.durationTime;
        this.audioLength = duration.toString();
        this.toolBoxRef.current.upgradeAudioLength(duration);
        this.artist.axisHandler.audioLength = this.audioLength;
    }

    /**
    * Set this.config variable and call the required dependencies to compute STFT's.
    * @param {Object} config - Configuration object.
    * @private
    */
    setConfig(config) {
        if (config.stft != undefined) {
            for (const conf in config.stft) {
                this.config.stft.conf = config.stft.conf;
            }
        }
        if (config.startTime != undefined) {
            this.config.startTime = config.startTime;
        }

        this.STFTRetriever.config = this.config;
    }

    /**
    * @return {Object} Returns an Object with central configuration.
    */
    getConfig() {
        return this.config;
    }

    /**
    * Method used to set all mouse events required.
    */
    getEvents() {
        let counts = 0;
        return new Promise((resolve, reject) => {
            const checkForAudioFileClass = () => {
                if (this.audioFile === undefined) {
                    if (counts === 1000) {
                        reject('Undefined audioFile');
                    } else {
                        counts += 1;
                        setTimeout(() => this.getEvents(), 10);
                    }
                } else {
                    this.audioFile.waitUntilReady()
                        .then(() => {
                            this.getMouseEventPosition = this.getMouseEventPosition.bind(this);
                            this.mouseDown = this.mouseDown.bind(this);
                            this.mouseUp = this.mouseUp.bind(this);
                            this.onMouseMove = this.onMouseMove.bind(this);
                            this.mouseScroll = this.mouseScroll.bind(this);
                            this.doubleClick = this.doubleClick.bind(this);
                            resolve({
                                mousedown: this.mouseDown,
                                mousemove: this.onMouseMove,
                                mouseup: this.mouseUp,
                                mousewheel: this.mouseScroll,
                                wheel: this.mouseScroll,
                                dblclick: this.doubleClick,
                            });
                        });
                }
            };
            checkForAudioFileClass();
        });
    }

    /**
    * Creates a toolbar component.
    * Takes visualizer methods for component props.
    * @return {ReactComponent} Toolbox component.
    * @public.
    */
    renderToolbar() {
        const actionButtons = {
            home: () => this.resetMatrix(),
            revertAction: () => this.revertAction(),
        };
        const stftConfMethods = {
            modifyWindowSize: (newSize) => this.modifyWindowSize(newSize),
            modifyWindowFunction: (newType) => this.modifyWindowFunction(newType),
            modifyHopLength: (newHopLength) => this.modifyHopLength(newHopLength),
        }
        const colorMethods = {
            modifyColorMap: (newColor) => this.modifyColorMap(newColor),
            modifyInfFilter: (newValue) => this.modifyInfFilter(newValue),
            modifySupFilter: (newValue) => this.modifySupFilter(newValue),
        };

        const movementMethods = {
            sliderCoords: (event) => this.audioLength * this.getMouseEventPosition(event).x,
            moveToCenter: (time) => this.translatePointToCenter(this.createPoint(time, 0)),
            zoomOnRectangle: (event) => this.zoomOnRectangle(event),
        };
        const toogleZoomButton = () => {
            if (this.zoomSwitchPosition = false) {
                this.zoomSwitchPosition = true;
            }
        }
        // Creates a React reference to apply some toolbox methods from visualizer class.
        this.toolBoxRef = React.createRef();
        this.toolBox = (
            <Tools
                ref={this.toolBoxRef}
                id="toolbox"
                //-----------Data---------------------------
                STFTconfig={this.config.stft}
                canvas={this.canvas}
                canvasTimes={() => this.timesInCanvas()}
                //-----------Methods-------------------------
                switchButton={() => this.zoomSwitchPosition =! this.zoomSwitchPosition}
                actionButtons={actionButtons}
                setSTFT={stftConfMethods}
                setColorMap={colorMethods}
                playAndPause={() => this.reproduceAndPause()}
                movement={movementMethods}
                sliderCoords={(event) => this.audioLength * this.getMouseEventPosition(event).x} />
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

    /**
    * Method used to sketch spectrogram.
    * It uses loaded propery to call artist draw method just in case new data has to be
    * sketched.
    * @public
    */
    draw() {
        const glArray = this.SVGmatrixToArray(this.SVGtransformationMatrix);
        const leftInferiorCorner = this.canvasToPoint(this.createPoint(0, 0));
        const rigthSuperiorCorner = this.canvasToPoint(this.createPoint(1, 1));
        const leftCheckTime = Math.max(leftInferiorCorner.x, 0);
        const rigthCheckTime = Math.min(rigthSuperiorCorner.x, this.audioLength);
        if (Math.abs(leftCheckTime - this.loaded.times.start) > 0.01
            || leftInferiorCorner.y !== this.loaded.frequencies.start
            || Math.abs(rigthCheckTime - this.loaded.times.end) > 0.01
            || rigthSuperiorCorner.y !== this.loaded.frequencies.end
            || this.forcingDraw ) {
            this.loaded = this.artist.draw(
                leftInferiorCorner.x,
                rigthSuperiorCorner.x,
                leftInferiorCorner.y,
                rigthSuperiorCorner.y,
                glArray,
            );
            this.forcingDraw = false;
        }
    }

    /**
    * Transforms a SVG matrix int Float32Array
    */
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

    /**
    * Transforms points from canvas space coordinates into time-frequency coordinates
    * @public
    */
    canvasToPoint(p) {
        return p.matrixTransform(this.SVGtransformationMatrix.inverse());
    }

    /**
    * Transform points in time-frequency coordinates into canvas space coordinates.
    * @public
    */
    pointToCanvas(p) {
        return p.matrixTransform(this.SVGtransformationMatrix);
    }

    /**
    * Return nearest point with time and frequency values coordinates.
    * @param {point} p - Point in time and frequency coordinates.
    * @return  {point}
    * @public
    */
    validatePoints(p) {
        const maxFrequency = this.stftHandler.maxFreq;
        const time = Math.max(Math.min(p.x, this.audioLength), 0);
        const frequency = Math.max(Math.min(p.y, maxFrequency), 0);
        return this.createPoint(time,frequency);
    }

    /**
    * Computes canvas time and frequency ranges length.
    * @private
    */
    computeCanvasMeasures() {
        const time = this.canvasToPoint(this.createPoint(1, 0)).x
                                        - this.canvasToPoint(this.createPoint(0, 0)).x;
        const frec = this.canvasToPoint(this.createPoint(0, 1)).y
                                        - this.canvasToPoint(this.createPoint(0, 0)).y;
        return { canvasTime: time, canvasFrequency: frec };
    }

    /**
    * Multiplies SVGtransformationMatrix by scaling matrix.
    * @param {point} p - Indicates scaling factor for each direction.
    * @private
    */
    scale(p) {
        const matrix = this.SVGtransformationMatrix.scaleNonUniform(p.x, p.y);
        this.SVGtransformationMatrix = matrix;
    }

    /**
    * Used to make a zoom with a fixed Point.
    * @param {point} factor - Indicates scaling factor for each direction.
    * @param {point} fixedPoint - Point to fix.
    * @private
    */
    zoomOnPoint(factor, fixedPoint) {
        let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x, fixedPoint.y);
        // Condition to avoid too much increase or decrease in time scale.
        const condition1 = (factor.x < 1 && this.SVGtransformationMatrix.a < 1 / 60)
        || (factor.x > 1 && this.SVGtransformationMatrix.a > 10);
        // Condition to avoid too much increase or decrease in frequency space.
        const condition2 = (factor.y < 1
            && (this.SVGtransformationMatrix.d  < (3 / 2) / this.audioFile.mediaInfo.sampleRate)
            || (factor.y>1
            && this.SVGtransformationMatrix.d > 10 / this.audioFile.mediaInfo.sampleRate));

        if (condition1) {
            factor.x = 1;
        }
        if (condition2) {
            factor.y = 1;
        }

        matrix = matrix.scaleNonUniform(factor.x, factor.y);
        matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y);
        this.SVGtransformationMatrix = matrix;
    }

    /**
    * Multiplies SVGtransformationMatrix by translations matrix to move around the spectrogram.
    * @param {SVGpoint} p -  SVG point to create translation matrix.
    * @private
    */
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

    /**
    * Translates spectrogram horizontally so the selected point reaches the left border of
    * canvas.
    * @param {point} p - SVG point moving to the border.
    * @private
    */
    translatePointToLeft(p) {
        const leftPoint = this.canvasToPoint(this.createPoint(0, 0));
        const translationPoint = this.createPoint(leftPoint.x - p.x, leftPoint.y-p.y);
        this.translation(translationPoint);
        // const timeSelector = document.getElementById('timeSelector');
        // timeSelector.value = p.x;
    }

     /**
    * Translates spectrogram horizontally so the selected point reaches the center of
    * canvas.
    * @param {point} p - SVG point moving to the center.
    * @private
    */
    translatePointToCenter(p) {
        const centerPoint = this.canvasToPoint(this.createPoint(1 / 2, 0));
        const translationPoint = this.createPoint(centerPoint.x - p.x, 0);
        this.translation(translationPoint);
    }


    getMouseEventPosition(event) {
        const canvasContainer = this.canvas.parentNode;
        let x = event.offsetX || (event.pageX - canvasContainer.offsetLeft);
        let y = event.offsetY || (event.pageY - canvasContainer.offsetTop);
        x = x / this.canvas.width;
        y = (-1 * y) / this.canvas.height + 1;
        const point = this.createPoint(x, y);
        return point;
    }

    mouseDown(event) {
        const last = this.getMouseEventPosition(event);
        this.dragStart = this.canvasToPoint(last);
        this.dragging = true;
    }

    onMouseMove(event) {
        if (this.dragging) {
            if (this.zoomSwitchPosition === false) {
                const last = this.getMouseEventPosition(event);
                var pt = this.canvasToPoint(last);
                pt.x -= this.dragStart.x;
                pt.y -= this.dragStart.y;
                this.translation(pt);
                this.dragStart = this.canvasToPoint(last);
            } else {
                this.forcingDraw=true;
                const last = this.pointToCanvas(this.dragStart);
                const actualPoint = this.getMouseEventPosition(event);
                const rect = this.computeRectanglePixelsValues(last, actualPoint);
                this.artist.drawZoomRectangle(rect.x, rect.y, rect.baseLength, rect.heightLength);
            }
        } else {
            // Nothing to be done here.
        }
        this.moveSliderDiv();
        this.fillInfoWindow(event);
    }

    mouseUp(event) {
        if (this.dragging === true) {
            this.dragging = false;
        }
        this.zoomSwitchPosition = false;
    }

    zoomOnRectangle(event) {
        this.secondaryTransformation = this.SVGtransformationMatrix;
        const firstPoint = this.pointToCanvas(this.dragStart);
        const secondPoint = this.getMouseEventPosition(event)
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
        return this.canvasToPoint(this.createPoint(1 / 2, 0)).x;
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
        this.forcingDraw=true;
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
        this.forcingDraw=true;
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
        this.forcingDraw=true;
        this.artist.reset();
    }

    /**
    * @param {number} newColor - number to pick a line in the image loaded to select
    * different color maps.
    */
    modifyColorMap(newColor) {
        this.artist.setColor(newColor);
        this.forcingDraw=true;
    }

    // Modifies min lim of the color map.
    modifyInfFilter(newValue) {
        this.artist.setColorMapInfFilter(newValue);
        this.forcingDraw=true;
    }

    // Modifies max lim of the color map.
    modifySupFilter(newValue) {
        this.artist.setColorMapSupFilter(newValue);
        this.forcingDraw=true;
    }

    /**
    * {number} time - Time where reproduction should start
    * This method handles the play/pause button.
    * If play is pressed in pause mode it starts reproducing where it left before, if its pressed while
    * reproducing then in pause reproduction and if its pressed without being reproducing or paused, then
    * it starts reproduction in time value.
    */
    reproduceAndPause() {
        if(this.audioPlayer === null) {
            this.audioPlayer = new audioPlayer(this.audioFile);
        }
        const time = this.centralTime();
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.audioPlayer.reproduce(time, () => {
                this.initialAnimationTime = this.audioPlayer.getTime();
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
        const newTime = time + this.audioPlayer.getTime() - this.initialAnimationTime;
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
        this.audioPlayer.stop();
        clearTimeout(this.timeoutId);
    }
}

export default Visualizer;
