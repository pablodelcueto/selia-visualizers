/**
* Axis module.
*
* @module Artist/axis
* @see module: Artist/axis.js
*/

/**
* A relativePosition Object containng a time and its canvas pixel coordinates.
* @typedef module:Artist/axis.relativePosition
* @type {Object}
* @property {number} time - Time value.
* @property {number} position - Relative x-position in canvas corresponding to time.
*/

/** Number of mark lines on vertical axis. */
const FREQUENCY_LINES = 50;
/** Maximum pixels between two consecutive marks in horizontal axis. */
const MAX_PIXELS_MARK_STEP = 400;
/** Minimum pixels between two consecutive marks in horizontal axis. */
const MIN_PIXELS_MARK_STEP = MAX_PIXELS_MARK_STEP / 10;

/**
* Rounds a value to nearest number with only ceros after precision number of digits.
* @param {int} precision - Number of digits after point.
* @param {number} value - Value to round.
* @param {return} Value precision rounded.
*/
function roundValue(precision, value) {
    return Math.round(value * 10 ** precision) / 10 ** precision.toString();
}

/**
* Class used to sketch the axis lines and values.
* @class
* @property {boolean} isZooming - Control variable to avoid clearing context.
* @property {number} audioLentgh - Time audio duration.
* @property {number} precision - Digits precision indicator.
*/
class Axis {
    /**
    * Creates an axisHandler Object
    * @constructor
    * @param {class} visualizer - Class with time-canvas translator.
    * @param {Object} canvas - The 2d-context canvas.
    */
    constructor(visualizer, canvas, context) {
        this.visualizer = visualizer;
        this.canvas = canvas;
        this.ctx = context;
        this.isZooming = false;
        this.audioLength = 1;
        this.precision = 0;
        this.init();
    }

    /**
    * Sketch central vertical line and axis visibility rectangles.
    */
    init() {
        this.drawMarkLine();
        this.drawAxisRectangles();
    }

    /**
    * Draws shady white rectangles to improve scales visibility.
    */
    drawAxisRectangles() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, .6)';
        this.ctx.fillRect(0, 0, 80, this.canvas.height);
        this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
        this.ctx.fillStyle = '#000000';
    }

    /**
    *Draws time axis base line.
    */
    drawBaseLine() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 0.6;
        this.ctx.moveTo(0, this.canvas.height - 30);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 30);
        this.ctx.stroke();
    }

    /**
    * Draws the red middle line corresponding to execution time.
    */
    drawMarkLine() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        this.ctx.lineWidth = 1.5;
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    /**
    * Draws axis.
    * @param {number} initialTime - Requested initial time.
    * @param {number} finalTime - Requested final time.
    * @param {number} initialFrequency - Requested initial frequency.
    * @param {number} finalFrequency - Requested final frequency.
    * @param {number} zoomFactor - Visualizer matrix transformation time factor.
    */
    drawAxis(initialTime, finalTime, zoomFactor, initialFrequency, finalFrequency) {
        this.computeTimePrecision(zoomFactor);
        this.adjustHorizontalAxis(initialTime, finalTime);
        this.adjustVerticalAxis(initialFrequency / 1000, finalFrequency / 1000); // To express in kH.
    }

    /** Clears sketched data.
    * @param {boolean} zooming - Boolean used to avoid clear zooming rectangles.
    */
    clear(zooming) {
        if (!zooming) {
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }

    /**
     * Ajust the temporal axis in the requested range.
     *
     * Computes left time and position nearest to requested times and uses those values to compute
     * initialPixelTraslation, pixelStep, timeStep, and number of ticks.
     * Calls tickHorizontalScale to sketch the horizontal axis with corresponding values.
     * @param {Number} initialTime - Requested initial time.
     * @param {Number} finalTime - Requested final time.
    */
    adjustHorizontalAxis(initialTime, finalTime) {
        const leftValues = this.leftTimeAndPositionWithPrecision(initialTime);
        const rightValues = this.leftTimeAndPositionWithPrecision(finalTime);
        // Number of pixels between outside precise times.
        const width = rightValues.relativePosition - leftValues.relativePosition;
        // const width = this.visualizer.canvas.width;
        // Total time between outside precise times.
        const duration = (rightValues.precisionTime - leftValues.precisionTime);
        // Number of marks fitting on horizontal axis according to duration and precision
        // considering every time with precision digit gets a mark.
        const numSteps = duration * 10 ** this.precision;
        const timeStep = 1 / (10 ** this.precision);
        const pixelStep = width / numSteps;


        this.tickHorizontalScale(
            leftValues.precisionTime,
            timeStep,
            Math.floor(leftValues.relativePosition),
            pixelStep,
            numSteps,
            this.precision,
        );
    }

    /**
     * Draws all the ticks and time values for some of them.
     *
     * @param {number} initialTime - First time to appear in the horizontal Axis.
     * @param {number} timeStep - Time between one time mark and the next one.
     * @param {int} initialPixelTraslation - Number of pixels to the left of
     * canvas where initialTime should be positioned.
     * @param {int} pixelStep - Number of pixels between one time mark and the next one.
     * @param {int} numberOfTicks - Number of marks in x-Axis inside Canvas.
     * @param {int} precision - Number of decimals precision in time values.
    */
    tickHorizontalScale(initialTime, timeStep, initPixelTranslation, pixelStep, numberOfTicks, precision) {
        let timeValue = initialTime;
        const preciseTimeStep = roundValue(precision, timeStep);
        const tagOffset = (precision < 1 ? 1 : 5);
        this.clear(this.isZooming);
        this.drawAxisRectangles();
        this.drawBaseLine();
        this.drawMarkLine();
        this.ctx.beginPath();
        this.ctx.lineWidth = 0.4;
        for (let i = 0; i < numberOfTicks + 1; i++) {
            if (timeValue >= 0 && timeValue <= this.audioLength) {
                // Used to let some numbers in bigger size.
                if (Math.round(timeValue * 10 ** precision) % 10 === 0 ) {
                    this.ctx.font = '24px serif';
                }
                this.ctx.fillText(
                    roundValue(precision, timeValue),
                    // timeValue,
                    initPixelTranslation + i * pixelStep + 3, this.canvas.height - 5,
                );
                this.ctx.moveTo(initPixelTranslation + i * pixelStep, this.canvas.height - 30);
                this.ctx.lineTo(initPixelTranslation + i * pixelStep, this.canvas.height - 5);
                // this.ctx.font = (20 - precision * 3).toString() + 'px serif';
                this.ctx.font = '17px serif';
            }
            timeValue = timeValue + preciseTimeStep;
        }
        this.ctx.stroke();
        this.ctx.closePath();
    }

     /**
     * Adjust frequency values in the requested range.
     *
     * Computes number of pixels each mark should skip to fill
     * linearly the vertical Axis and the frequency step for each skip.
     * Calls tickVerticalScale to sketch values.
     * @param {number} initialFrequency - Frequency value of the inferior border in sketch.
     * @param {number} finalFrequency - Frequency value of the superior border in sketch.
    */
    adjustVerticalAxis(initialFrequency, finalFrequency) {
        const frequencyStep = (finalFrequency - initialFrequency) / FREQUENCY_LINES;
        const pixelStep = this.visualizer.canvas.height / FREQUENCY_LINES;
        this.tickVerticalScale(
            initialFrequency,
            finalFrequency,
            FREQUENCY_LINES,
            frequencyStep,
            pixelStep,
        );
    }

    /**
    * Draws all the ticks and frequency values for some of them.
    * @param {number} initialFrequency - Frequency initializing bottom of canvas.
    * @param {number} finalFrequency - Frequency for canvas top.
    * @param {int} numOfTicks - Number of marks or ticks in vertical scale.
    * @param {number} frequencyStep - Frequency difference between consecutive marks
    * in vertical scale.
    * @param {int} pixelStep - Number of pixels between consecutive marks in vertical scale.
    */
    tickVerticalScale(initialFrequency, finalFrequency, numOfTicks, frequencyStep, pixelStep) {
        let frequencyValue = initialFrequency;
        this.ctx.beginPath();
        this.ctx.lineWigdth = 0.4;
        this.ctx.font = '15px serif';
        for (let i = 0; i < numOfTicks + 1; i++) {
            const pixel = this.canvas.height - i * pixelStep;
            if (pixel < this.canvas.height - 30) {
                if (i % 5 === 0) {
                    this.ctx.fillText(
                        frequencyValue.toFixed(2) + " kHz",
                        20,
                        this.canvas.height - i * pixelStep -5,
                    );
                    this.ctx.moveTo(0, this.canvas.height - i * pixelStep);
                    this.ctx.lineTo(25, this.canvas.height - i * pixelStep);
                } else {
                    this.ctx.moveTo(0, this.canvas.height - i * pixelStep);
                    // this.ctx.lineTo(10+(numOfTicks-i)**2*.01, this.canvas.height - i * pixelStep);
                    this.ctx.lineTo(
                        50 * ((numOfTicks/2 - i) * 0.02) ** 2 + 5,
                        this.canvas.height - i * pixelStep
                    );
                }
            }
            frequencyValue = frequencyValue + frequencyStep;
        }
        this.ctx.stroke();
        this.ctx.closePath();
    }

    /**
     * Round time (to the left) to the given precision and return its corresponding canvas position.
     *
     * Nearest left time considering digits precision to a given time and its
     * relative position in canvas.
     * @param {int} precision - Defines how many digits after decimal point will be considered in
     * time values.
     * @param {number} time - Time without considering digits precision.
     * @return {module:Artist/axis.relativePosition} Left precision time and
     * its relative position in canvas.
    */
    leftTimeAndPositionWithPrecision(time) {
        const leftPreciseTime = Math.floor(time * (10 ** this.precision)) / (10 ** this.precision);
        const timePosition = this.visualizer.pointToCanvas(
            this.visualizer.createPoint(leftPreciseTime, 0),
        );
        const relativeLeftValues = {
            relativePosition: timePosition.x * this.visualizer.canvas.width,
            precisionTime: leftPreciseTime,
        };
        return relativeLeftValues;
    }

    /**
    * This method evaluates the distance between consecutive time marks and modifies
    * precision property so consecutive lines don't get too apart nor too close.
    * In case zoomOut makes consecutive marks to be too apart,
    * precision increases so more marks are sketched.
    * In case zoomIn makes consecutive marks to be too close,
    * precision decreaces so less marks are sketched.
    * @param {number} zoomFactor - Visualizer transformation time scale zoom factor.
    */
    computeTimePrecision(zoomFactor) {
        if ((this.visualizer.canvas.width / (10 ** this.precision)) * zoomFactor
            < MIN_PIXELS_MARK_STEP) {
            this.precision = this.precision - 1;
        } else if ((this.visualizer.canvas.width / (10 ** this.precision)) * zoomFactor
                    > MAX_PIXELS_MARK_STEP) {
            this.precision = this.precision + 1;
        }
    }
}

export default Axis;
