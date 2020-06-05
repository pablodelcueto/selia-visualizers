/**
* @module Visualizer
*/

import React from 'react';
import VisualizerBase from '@selia/visualizer';
import Artist from './Artist/artist';
import STFTHandler from './STFTHandler/STFTHandler';
import AudioFile from './Audio/audioFile';
import AudioPlayer from './Audio/reproductor';
import Tools from './Tools';

/**
* Short-time Fourier transform (STFT) configurations.
* @property {Object} stft - Short-Time Fourier Transform window configurations.
* @property {number} stft.window_size - Window length for stft computations.
* @property {number} stft.hop_length - Length between two consecutive computation windows.
* @property {string}  stft.window_type - Type of window used by tensor flow computations.
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

/** Seconds per canvas frame at initial state.
* @private
*/
const INITIAL_SECONDS_PER_WINDOW = 10;

const MAX_SECONDS_IN_CANVAS = 60;

function zoomLimit(sampleRate) {
    const limit = (MAX_SECONDS_IN_CANVAS * 48000) / sampleRate;
    return limit;
}
/**
* @property {Object} config - Visualization STFT and initial loading time configurations.
* @property {Class} audioFile - Audio data reader class.
* @property {Class} audioPlayer - Audio player class.
* @property {Class} stftHandler - Class computing and delivering STFT values.
* @property {Class} artist - Spectrogram sketching artist.
* @property {number} audioLength - Audio file duration.
* @property {Object} loaded - Data pictured. Used to avoid unnecesary work.
* @property {number} loaded.times.start - Start time spectrogram values pictured.
* @property {number} loaded.times.end - Final time spectrogram values pictured.
* @property {number} loaded.frequencies.start - Start frequency spectrogram values pictured.
* @property {number} loaded.frequencies.end - Final frequency spectrogram pictured.
* @property {boolean} forcingDraw - Used when configuration changes are done.
* @property {SVGmatrix} transformationMatrix - Translating or scaling image
* matrix transformation.
* @property {boolean} zoomSwitchPosition - True when zooming Tool is activated.
* @property {number} zoomLimit - Limit given to zoom acording to audio file sample rate.
* @property {boolean} dragging - True when dragging image.
* @property {SVGpoint} dragStart - Initial dragging point.
* @property {SVGmatrix} savedMatrix - transformationMatrix saved available for image restoration.
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
    * @private
    */
    init() {
        this.config = INIT_CONFIG;

        // Class dealing with raw audio file.
        this.audioFile = new AudioFile(this.itemInfo.url);

        // Audio Reproduction class
        this.audioPlayer = null;

        // Class computing the Discrete Fourior Transform of the WAV file
        this.stftHandler = new STFTHandler(this.audioFile, INIT_CONFIG);

        // Class dealing with webGL and axis responsabilities.
        this.artist = new Artist(this, this.stftHandler);
        this.transformationMatrix = this.svg.createSVGMatrix();

        // Auxiliary variables:
        this.audioLength = null;
        this.loaded = { times: { start: 0, end: 0 }, frequencies: { start: 0, end: 0 } };
        this.forcingDraw = false;
        this.zoomSwitchPosition = false;
        this.dragStart = null;
        this.dragging = false;

        // Creates transformation matrix with INITIAL_SECONDS_PER_WINDOW requirement.
        this.stftHandler.waitUntilReady()
            .then(() => {
                this.artist.maxFrequency = this.audioFile.mediaInfo.sampleRate / 2;
                this.transformationMatrix = this.transformationMatrix
                    .translate(1 / 2, 0)
                    .scaleNonUniform(
                        1 / INITIAL_SECONDS_PER_WINDOW,
                        2 / this.audioFile.mediaInfo.sampleRate,
                    );
                this.savedMatrix = this.transformationMatrix;
                this.updateAudioLength();
                this.toolBoxRef.current.addEventsToCanvas();
                this.zoomLimit = zoomLimit(this.audioFile.mediaInfo.sampleRate);
                this.startDrawing();
            });
    }

    /**
    * Adjust size of canvas after toolsBox is render.
    * It adjust webGL viewport with new sizes too.
    * @private
    */
    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('artist' in this) {
            this.artist.adjustSize();
        }
    }

    activator() {
        this.activator = true;
    }

    /**
    * Used to reset transformationMatrix to default transformation.
    * @public
    */
    resetMatrix() {
        this.activator();
        const conf = { stft: {}, startTime: 0 };
        this.stftHandler.setConfig(conf);
        this.transformationMatrix = this.savedMatrix;
    }

    /**
    * Updates audio file duration time dependencies.
    * @private
    */
    updateAudioLength() {
        const duration = this.audioFile.mediaInfo.durationTime;
        this.audioLength = duration.toString();
        this.toolBoxRef.current.updateAudioLength(duration);
        this.artist.axisHandler.audioLength = this.audioLength;
    }

    /**
    * Set this.config variable and call the required dependencies to compute STFT's.
    * @param {Object} config - Configuration object.
    * @private
    */
    setConfig(config) {
        if (config.stft !== undefined) {
            for (const conf in config.stft) {
                this.config.stft.conf = config.stft[conf];
            }
        }

        if (config.startTime !== undefined) {
            this.config.startTime = config.startTime;
        }

        this.stftHandler.config = this.config;
    }

    /**
    * @return {Object} Returns an Object with central configuration.
    * @private
    */
    getConfig() {
        return this.config;
    }

    /**
    * Method used to set all mouse events required.
    * @private
    */
    getEvents() {
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

    /**
    * Creates a toolbar component.
    * Takes visualizer methods for component props.
    * @return {ReactComponent} Toolbox component.
    * @public.
    */
    renderToolbar() {
        // Creates a React reference to apply some toolbox methods from visualizer class.
        this.toolBoxRef = React.createRef();
        this.toolBox = (
            <Tools
                ref={this.toolBoxRef}
                id="toolbox"
                // -----------Data---------------------------
                visualizerActivator={() => this.activator()}
                isActive={() => this.active}
                STFTconfig={this.config.stft}
                canvas={this.canvas}
                canvasTimes={() => this.timesInCanvas()}
                // -----------Methods-------------------------
                switchButton={() => { this.zoomSwitchPosition = !this.zoomSwitchPosition; }}
                home={() => this.resetMatrix()}
                revertAction={() => this.revertAction()}
                // ------------------STFT_configuration_methods-----------
                modifyWindowFunction={(newType) => this.modifyWindowFunction(newType)}
                modifyWindowSize={(newSize) => this.modifyWindowSize(newSize)}
                modifyHopLength={(newLength) => this.modifyHopLength(newLength)}
                // --------------Color methods-----------------
                modifyColorMap={(value) => this.modifyColorMap(value)}
                modifyInfFilter={(value) => this.modifyInfFilter(value)}
                modifySupFilter={(value) => this.modifySupFilter(value)}
                // ------------------Zoom_and_displacement_methods-------------
                moveToCenter={(time) => this.centerTime(time)}
                playAndPause={() => this.reproduceAndPause()}
                getDenormalizedTime={(event) => this.audioLength * this.getMouseEventPosition(event).x}
            />
        );

        return this.toolBox;
    }

    /**
    * Call this function when all settings are ready to start drawing the spectrogram.
    * @private
    */
    startDrawing() {
        this.draw();
        this.drawingId = setTimeout(() => this.startDrawing(), 100);
    }

    /**
    * Method used to sketch spectrogram.
    * It uses loaded propery to call artist draw method just in case new data has to be
    * sketched.
    * @private
    */
    draw() {
        const glArray = this.SVGmatrixToArray(this.transformationMatrix);
        const leftInferiorCorner = this.canvasToPointForNormalizedCanvas(this.createPoint(0, 0));
        const rightSuperiorCorner = this.canvasToPointForNormalizedCanvas(this.createPoint(1, 1));
        const leftCheckTime = Math.max(leftInferiorCorner.x, 0);
        const rightCheckTime = Math.min(rightSuperiorCorner.x, this.audioLength);

        if (Math.abs(leftCheckTime - this.loaded.times.start) > 0.01
            || leftInferiorCorner.y !== this.loaded.frequencies.start
            || Math.abs(rightCheckTime - this.loaded.times.end) > 0.01
            || rightSuperiorCorner.y !== this.loaded.frequencies.end
            || this.forcingDraw) {
            this.loaded = this.artist.draw(
                leftInferiorCorner.x,
                rightSuperiorCorner.x,
                leftInferiorCorner.y,
                rightSuperiorCorner.y,
                glArray,
            );
            this.forcingDraw = false;
        }
    }

    /**
    * Transforms a SVG matrix int Float32Array
    * @private
    */
    SVGmatrixToArray() {
        const matrixArray = new Float32Array([
            this.transformationMatrix.a,
            this.transformationMatrix.b,
            0,
            this.transformationMatrix.c,
            this.transformationMatrix.d,
            0,
            this.transformationMatrix.e,
            this.transformationMatrix.f,
            1,
        ]);
        return matrixArray;
    }

    canvasToPoint(p) {
        const normalCanvasPoint = this.createPoint(
            p.x / this.canvas.width,
            p.y / this.canvas.height,
        );
        const point = this.canvasToPointForNormalizedCanvas(normalCanvasPoint);
        return point;
    }

    pointToCanvas(p) {
        const normalCanvasPoint = this.pointToNormalizedCanvas(p);
        const realPoint = this.createPoint(
            normalCanvasPoint.x * this.canvas.width,
            normalCanvasPoint.y * this.canvas.height,
        );
        return realPoint;
    }

    /**
    * Transforms points from canvas space coordinates into time-frequency coordinates
    * @private
    */
    canvasToPointForNormalizedCanvas(p) {
        return p.matrixTransform(this.transformationMatrix.inverse());
    }

    /**
    * Transform points in time-frequency coordinates into canvas space coordinates.
    * @private
    */
    pointToNormalizedCanvas(p) {
        return p.matrixTransform(this.transformationMatrix);
    }

    /**
    * Return nearest point with time and frequency values coordinates.
    * @param {point} p - Point in time and frequency coordinates.
    * @return {point}
    * @private
    */
    validatePoints(p) {
        const maxFrequency = this.stftHandler.maxFreq;
        const time = Math.max(Math.min(p.x, this.audioLength), 0);
        const frequency = Math.max(Math.min(p.y, maxFrequency), 0);
        return this.createPoint(time, frequency);
    }

    /**
    * Computes canvas time and frequency ranges length.
    * @private
    */
    computeCanvasMeasures() {
        const time = this.canvasToPointForNormalizedCanvas(this.createPoint(1, 0)).x
                                        - this.canvasToPointForNormalizedCanvas(this.createPoint(0, 0)).x;
        const frec = this.canvasToPointForNormalizedCanvas(this.createPoint(0, 1)).y
                                        - this.canvasToPointForNormalizedCanvas(this.createPoint(0, 0)).y;
        return { canvasTime: time, canvasFrequency: frec };
    }

    /**
    * Multiplies transformationMatrix by scaling matrix.
    * @param {point} p - Indicates scaling factor for each direction.
    * @public
    */
    scale(p) {
        const matrix = this.transformationMatrix.scaleNonUniform(p.x, p.y);
        this.transformationMatrix = matrix;
    }

    /**
    * Used to make a time zoom or frequency zoom without moving the given point.
    * @param {point} factor - Indicates scaling factor for each direction.
    * @param {point} fixedPoint - Point to fix.
    * @public
    */
    zoomOnPoint(factor, fixedPoint) {
        let matrix = this.transformationMatrix.translate(fixedPoint.x, fixedPoint.y);

        // Condition to avoid too much increase or decrease in time scale.
        const condition1 = (
            (factor.x < 1 && this.transformationMatrix.a < 1 / MAX_SECONDS_IN_CANVAS)
            || (factor.x > 1 && this.transformationMatrix.a > 10)
        );

        // Condition to avoid too much increase or decrease in frequency space.
        const condition2 = ((
                factor.y < 1
                && (this.transformationMatrix.d < (3 / 2) / this.audioFile.mediaInfo.sampleRate))
            || (
                factor.y > 1
                && this.transformationMatrix.d > 10 / this.audioFile.mediaInfo.sampleRate)
        );

        if (condition1) {
            factor.x = 1;
        }

        if (condition2) {
            factor.y = 1;
        }

        matrix = matrix.scaleNonUniform(factor.x, factor.y);
        matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y);
        this.transformationMatrix = matrix;
    }

    /**
    * Multiplies transformationMatrix by translations matrix to move around the spectrogram.
    * @param {SVGpoint} p -  SVG point to create translation matrix.
    * @public
    */
    translation(p) {
        const q = this.createPoint(p.x, p.y);

        if (this.canvasToPointForNormalizedCanvas(this.createPoint(0, 1)).y >= this.audioFile.mediaInfo.sampleRate / 2 && p.y < 0) {
            q.y = 0;
        } else if (this.canvasToPointForNormalizedCanvas(this.createPoint(0, 0)).y <= 0 && p.y > 0) {
            q.y = 0;
        } else if (this.pointToNormalizedCanvas(this.createPoint(0, 0)).x >= 0.5 && p.x > 0) {
            q.x = 0;
        } else if (this.pointToNormalizedCanvas(this.createPoint(this.audioLength, 0)).x <= 0.5 && p.x < 0) {
            q.x = 0;
        }
        const matrix = this.transformationMatrix.translate(q.x, q.y);
        this.transformationMatrix = matrix;
    }

    /**
    * Translates spectrogram horizontally so the selected point reaches the left border of
    * canvas.
    * @param {point} p - SVG point moving to the border.
    * @private
    */
    translatePointToLeft(p) {
        const leftPoint = this.canvasToPointForNormalizedCanvas(this.createPoint(0, 0));
        const translationPoint = this.createPoint(leftPoint.x - p.x, leftPoint.y - p.y);
        this.translation(translationPoint);
    }

    centerTime(time) {
        const point = this.createPoint(time, 0);
        this.translatePointToCenter(point);
    }

    /**
    * Translates spectrogram horizontally so the selected point reaches the center of
    * canvas.
    * @param {point} p - SVG point moving to the center.
    * @private
    */
    translatePointToCenter(p) {
        const centerPoint = this.canvasToPointForNormalizedCanvas(this.createPoint(1 / 2, 0));
        const translationPoint = this.createPoint(centerPoint.x - p.x, 0);
        this.translation(translationPoint);
    }

    /**
    * Get canvas coordinates of event point.
    * @param {Event} event - HTML event.
    * @private
    */
    getMouseEventPosition(event) {
        const canvasContainer = this.canvas.parentNode;
        let x = event.offsetX || (event.pageX - canvasContainer.offsetLeft);
        let y = event.offsetY || (event.pageY - canvasContainer.offsetTop);

        x /= this.canvas.width;
        y = -y / this.canvas.height + 1;

        return this.createPoint(x, y);
    }

    /**
    * Method triggered with mouse click. Translate matrix following cursor movements.
    * @param {Event} event - HTML event.
    * @private
    */
    mouseDown(event) {
        if (!this.active) return;
        const last = this.getMouseEventPosition(event);
        console.log(last);
        const normalized = this.canvasToPointForNormalizedCanvas(last);
        console.log(this.pointToCanvas(normalized));
        this.dragStart = this.canvasToPointForNormalizedCanvas(last);
        this.dragging = true;
    }

    /**
    * Method to use when mouse is moving. Used to drag image or create zoom area.
    * @param {Event} event - HTML event.
    * @private
    */
    onMouseMove(event) {
        if (!this.active) return;

        if (this.dragging) {
            if (this.zoomSwitchPosition === false) {
                const last = this.getMouseEventPosition(event);
                const pt = this.canvasToPointForNormalizedCanvas(last);
                pt.x -= this.dragStart.x;
                pt.y -= this.dragStart.y;
                this.translation(pt);
                this.dragStart = this.canvasToPointForNormalizedCanvas(last);
            } else {
                this.forcingDraw = true;
                const last = this.pointToNormalizedCanvas(this.dragStart);
                const actualPoint = this.getMouseEventPosition(event);
                const rect = this.computeRectanglePixelsValues(last, actualPoint);
                this.artist.drawZoomRectangle(
                    rect.x,
                    rect.y,
                    rect.baseLength,
                    rect.heightLength,
                );
            }
        }

        this.toolBoxRef.current.moveSliderFromCanvas();
        this.fillInfoWindow(event);
    }

    /**
    * Turn false dragging and zooming auxiliar variables.
    * @private
    */
    mouseUp(event) {
        if (!this.active) return;

        if (this.zoomSwitchPosition === true) {
            const firstPoint = this.pointToNormalizedCanvas(this.dragStart);
            const secondPoint = this.getMouseEventPosition(event);
            this.zoomOnRectangle(firstPoint, secondPoint);
        }
        this.zoomSwitchPosition = false;
        this.dragging = false;
    }

    /**
    * Zooms on rectangle bounded by two points.
    * @param {point} firstPoint - Rectangle first corner.
    * @param {point} secondPoint - Rectangle corner opposite to first corner.
    * @public
    */
    zoomOnRectangle(firstPoint, secondPoint) {
        this.secondaryTransformation = this.transformationMatrix;

        const canvasMeasures = this.computeCanvasMeasures();
        const rectangle = this.computeRectangleTimeFreqValues(firstPoint, secondPoint);

        const factorPoint = this.createPoint(
            canvasMeasures.canvasTime / rectangle.timeLength,
            canvasMeasures.canvasFrequency / rectangle.frequencyLength,
        );

        this.scale(factorPoint);
        this.translatePointToLeft(this.createPoint(rectangle.x, rectangle.y));
        this.artist.axisHandler.isZooming = false;
    }

    /**
    * This method computes the left superior corner, the width, and the height of the rectangle
    * in pixels.
    * @param {point} firstPoint - Point inside canvas.
    * @param {point} secondPoint - Point inside canvas.
    * @return {Rectangle}
    * @private
    */
    computeRectanglePixelsValues(firstPoint, secondPoint) {
        const rightXcoordinate = Math.max(firstPoint.x, secondPoint.x) * this.canvas.width;
        const leftXcoordinate = Math.min(firstPoint.x, secondPoint.x) * this.canvas.width;
        const bottomYcoordinate = (1 - Math.max(firstPoint.y, secondPoint.y)) * this.canvas.height;
        const topYcoordinate = (1 - Math.min(firstPoint.y, secondPoint.y)) * this.canvas.height;
        const width = rightXcoordinate - leftXcoordinate;
        const height = topYcoordinate - bottomYcoordinate;
        return {
            x: leftXcoordinate, y: bottomYcoordinate, baseLength: width, heightLength: height,
        };
    }

    /**
    * This method computes the times and frequencies corresponding to a given rectangle in canvas.
    * @param {point} firstPoint - first Point of the rectangleZoomTool
    * @param {point} secondPoint - second point of the rectangleZoomTool
    * @private
    */
    computeRectangleTimeFreqValues(firstPoint, secondPoint) {
        const initialPoint = this.canvasToPointForNormalizedCanvas(firstPoint);
        const finalPoint = this.canvasToPointForNormalizedCanvas(secondPoint);
        const rightTime = Math.max(initialPoint.x, finalPoint.x);
        const leftTime = Math.min(initialPoint.x, finalPoint.x);
        const topFrequency = Math.max(initialPoint.y, finalPoint.y);
        const bottomFrequency = Math.min(initialPoint.y, finalPoint.y);
        const timeRangeLength = rightTime - leftTime;
        const frequencyRangeLength = topFrequency - bottomFrequency;

        return {
            x: leftTime,
            y: bottomFrequency,
            timeLength: timeRangeLength,
            frequencyLength: frequencyRangeLength,
        };
    }

    /**
    * Method used for mouse scrolling. Used to zoom on time scales or frequency
    * when Shiftkey is pressed.
    * @param {Event} event - HTML event.
    * @private
    */
    mouseScroll(event) {
        if (!this.active) return;

        const timeZoom = event.ctrlKey || event.metaKey;
        const freqZoom = event.shiftKey;

        // Do nothing if the correct keys are not pressed
        if (!timeZoom && !freqZoom) return;

        // Do not scroll window.
        event.preventDefault();

        const mousePosition = this.getMouseEventPosition(event);
        const fixedPoint = this.canvasToPointForNormalizedCanvas(mousePosition);
        const factorY = (event.deltaY < 0) ? 1.04 : 0.96;
        const factorX = (event.deltaX < 0) ? 1.04 : 0.96;
        const factor = Math.max(factorX, factorY);

        if (timeZoom && freqZoom) {
            const shift = event.wheelDelta / 1000.0;
            this.translation(this.createPoint(shift, 0));
        } else if (timeZoom) {
            // const factor = (event.deltaY < 0) ? 1.04 : 0.96;
            this.zoomOnPoint(this.createPoint(factor, 1), fixedPoint);
        } else {
            // const factor = (event.deltaX < 0) ? 1.04 : 0.96;
            this.zoomOnPoint(this.createPoint(1, factor), fixedPoint);
        }

        this.toolBoxRef.current.moveSliderFromCanvas();
    }

    /**
    * Double click event method. Moves clicked point to center of canvas.
    * @param {Event} event - HTML event.
    * @private
    */
    doubleClick(event) {
        if (!this.active) return;

        const point = this.canvasToPointForNormalizedCanvas(this.getMouseEventPosition(event));

        if (this.isPlaying) {
            this.reproduceAndPause();
            this.translatePointToCenter(point);
            this.toolBoxRef.current.moveSliderFromCanvas();
            this.reproduceAndPause();
            return;
        }

        this.translatePointToCenter(point);
        this.toolBoxRef.current.moveSliderFromCanvas();
    }

    /**
    * Get times matching left border, center and right border columns in canvas.
    * @return {Object}
    * @private
    */
    timesInCanvas() {
        return {
            leftTime: this.leftBorderTime(),
            centralTime: this.centralTime(),
            rightTime: this.rightBorderTime(),
        };
    }

    /**
    * Get time in right border of canvas.
    * @return {number}
    * @private
    */
    rightBorderTime() {
        return Math.min(this.canvasToPointForNormalizedCanvas(this.createPoint(1, 0)).x,
            this.audioFile.mediaInfo.durationTime);
    }

    /**
    * Get time in left border of canvas.
    * @return {number}
    * @private
    */
    leftBorderTime() {
        return Math.max(0, this.canvasToPointForNormalizedCanvas(this.createPoint(0, 0)).x);
    }


    /**
    * Get time in center of canvas.
    * @return {number}
    * @private
    */
    centralTime() {
        return this.canvasToPointForNormalizedCanvas(this.createPoint(1 / 2, 0)).x;
    }


    /**
    * Set time and frequency values for mouse position to fill information window.
    * @param {event} event - HTML event
    * @private
    */
    fillInfoWindow(event) {

        const value = this.canvasToPointForNormalizedCanvas(this.getMouseEventPosition(event));
        const time = `Tiempo: ${value.x.toFixed(2)} segundos.`;
        const frequency = `Frecuencia: ${value.y.toFixed(0)} Hz.`;
        this.toolBoxRef.current.setCursorInfo(time, frequency);
    }

    /**
    * Set SVGMatrix as secondaryTransformation to return to last zooming tool transformation.
    * @public
    */
    revertAction() {
        this.activator();
        if (this.secondaryTransformation != null) {
            this.transformationMatrix = this.secondaryTransformation;
        }
    }

    /**
    * Set window_function configuration and redraw.
    * @param {newWindowFunction} string- Name of the function type used to create the
    * window blocks
    * @public
    */
    modifyWindowFunction(newWindowFunction) {
        const conf = {
            stft: {
                window_function: newWindowFunction,
            },
            startTime: this.leftBorderTime(),
        };
        this.config.stft.window_function = newWindowFunction;
        this.stftHandler.setConfig(conf);
        this.forcingDraw = true;
        this.artist.reset();
    }

    /**
    * Set window_size configuration and redraw.
    * @param {number} newWindowSize -Block size used in each discrete fourier transformation
    * in the stftHandler
    * @public
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
        this.stftHandler.setConfig(conf);
        this.forcingDraw = true;
        this.artist.reset();
    }

    /**
    * Set hop_length configuration and redraw.
    * @param {number} newWindowHop - The discrete fourier transformation gap between each
    * block on data used on coefficents computations.
    * @public
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
        this.stftHandler.setConfig(conf);
        this.forcingDraw = true;
        this.artist.reset();
    }

    /**
    * Set color map.
    * @param {number} newColor - Number to pick a line in the image loaded to select
    * different color maps.
    * @public
    */
    modifyColorMap(newColor) {
        this.artist.setColor(newColor);
        this.forcingDraw = true;
    }

    /**
    * Set color map inferior filter.
    * @param {number} newValue - Number between 0 and 1 for new inferior filter.
    * @public
    */
    modifyInfFilter(newValue) {
        this.artist.setColorMapInfFilter(newValue);
        this.forcingDraw = true;
    }

    /**
    Set color map superior filter.
    * @param {number} newValue - Number between 0 and 1 for new superior filter.
    * @public
    */
    modifySupFilter(newValue) {
        this.artist.setColorMapSupFilter(newValue);
        this.forcingDraw = true;
    }

    /**
    * This method handles the play/pause button.
    * Initial reproduction time is time in center of canvas.
    * @public
    */
    reproduceAndPause() {
        this.activator();

        if (this.audioPlayer === null) {
            this.audioPlayer = new AudioPlayer(this.audioFile);
        }

        const time = this.centralTime();
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.audioPlayer.reproduce(time, () => {
                this.animatedMotion(time);
            });
        } else if (this.isPlaying) {
            this.isPlaying = false;
            this.stopReproduction();
        }
    }

    /**
    * The time is driven to the center of canvas and keeps advancing forward.
    * @private
    */
    animatedMotion(time) {
        const newTime = this.audioPlayer.getTime();
        this.translatePointToCenter(this.createPoint(newTime, 0));
        this.timeoutId = setTimeout(() => this.animatedMotion(time), 10);
        this.toolBoxRef.current.moveSliderFromCanvas();
    }

    /**
    * clears the setTimeout ID of the reproduction.
    * @private
    */
    stopReproduction() {
        this.isPaused = false;
        this.isPlaying = false;
        this.audioPlayer.stop();
        clearTimeout(this.timeoutId);
    }
}

export default Visualizer;
