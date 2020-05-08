/**
Artist Module.

@module ArtistModule
@see module: visualizer/Artist/artist
*/

import WebGLhandler from './webGL';
import AxisDrawer from './axis';

// Number on mark lines on vertical Axis.
const FREQUENCY_LINES = 50;

/**
 * Class that handles sketch jobs.
 * @class
 *
 * When visualizer ask the artist to draw, artist asks for requested data to the
 * stftHandler and fills the webGL texture used on the glHandler and sketch a gray background
 * to point areas where spectogram could be draw when data completes loading.
 * Also handle computations needed by the axisHandler to draw in a second canvas the vertical 
 * and horizontal axis based on times and frequencies requested.
*/
class Artist {
    /**
    * @param {Object} visualizer - Visualizer object asking for changes in sketch.
    * @param {class} stftHandler - Class retrieving STFTData to the artist.
    */
    constructor(visualizer, stftHandler) {
        this.stftHandler = stftHandler;
        this.visualizer = visualizer;
        // Class used to fill proper data in a GL program in order to sketch parts of the
        // spectrogram in a webGL context.
        this.glHandler = new WebGLhandler(visualizer.canvas);
        // Class used to sketch axis using a second canvas with a 2d context.
        this.axisHandler = new AxisDrawer(visualizer.canvas, visualizer.canvasContainer);
        // Data used to avoid extra computations.
        this.textureLoadedValues = {
            initialTime: 0,
            finalTime: 0,
        };
        this.matrix = {};

        // Data to sketch the axis scales.
        // Maximun space between two consecutive marks in horizontal axis.
        this.maxPixelsMarkStep = 400;
        // Minimum space between two consecutive marks in horizontal axis.
        this.minPixelsMarkStep = this.maxPixelsMarkStep / 10;
        // Number of places after decimal point to be considered on time values.
        // 0 means mark will be each second, 1 means there will be ten marks each second
        // and 2 there will be 100 marks each second.
        this.precision = 0;
        // Used to make the draw method work in cases STFTHandler change configurations.
        this.forcingDraw = false;
    }

    /**
     * Commands glHandler to change the color map.
     * @param {number} newColor - number to pick a line color in the
     * glHandler image loaded to select different color maps.
    */
    setColor(newValue) {
        this.glHandler.setColor(newValue);
    }

    /**
     * Calls glHandler setMinFilter method to change minFilter value and save values in the
     * filters object.
     * @param {number} newValue - ColorMap inferior limit value.
    */
    setColorMapMinFilter(newValue) {
        this.glHandler.setMinFilter(newValue);
    }

    /**
     * Calls glHandler setMinFilter method to change maxFilter value and save values in the
     * filters object.
     * @param {number} newValue - ColorMap superior limit value.
    */
    setColorMapMaxFilter(newValue) {
        this.glHandler.setMaxFilter(newValue);
    }

    /**
     * Used to set axisHandler Canvas size same as visualizer Canvas.
    */
    adjustSize() {
        this.glHandler.adjustCanvasViewport();
        this.axisHandler.resizeAxisCanvas();
    }

    /**
     * Visualizer calls this method to draw. Just in case new data is needed on the 
     * glHandler texture it calls setGLhandler method to completes this task.
     * @param {number} initialTime - Time requested in Canvas left border.
     * @param {number} finalTime - Time requested in Canvas rigth border.
     * @param {number} initialFrequency - Frequency requested in Canvas bottom border.
     * @param {number} finalFrequency - Frequency requested in Canvas top border.
     * @param {Object} matrix - Float32Array containing the matrix used as transformation uniform
     * by the webGL program linked.
    */
    draw(initialTime, finalTime, initialFrequency, finalFrequency, matrix) {
        this.drawAxis(initialTime, finalTime, matrix[0], initialFrequency, finalFrequency);
        this.setGLhandler(initialTime, finalTime, matrix)
            .then(() => this.glHandler.draw(matrix))
            .catch((error) => {
                if (error !== 'Texture is empty') console.error(error);
            });
    }

    /**
     * Sets data in glHandler to draw background between initialTime and finalTime.
     * Used to send setTextureAndDreaw promuise to draw method.
     *
     * @param {number} initialTime - Time corresponding the the iniialTime in texture.
     * @param {number} finalTime - Time corresponding at end of texture.
     * @param {Object} matrix - Float32Array useds to set matrix as uniform for the 
     * webGL background program.
     * @return {Promise} Resolves when STFTHandler returns a non empty STFTData Object.
     * @async
    */
    setGLhandler(initialTime, finalTime, matrix) {
        const timeLength = finalTime - initialTime;
        this.glHandler.setBackgroundVertices(this.visualizer.audioLength, this.maxFrequency, matrix);
        return this.setTextureAndDraw(
            initialTime - (0.5 * timeLength),
            finalTime + (0.5 * timeLength),
        );
    }

    /**
     * The method ask for data in range of [initTime, finalTime] and sets the glHandler texture with
     * the results gotten from the stftHandler (it could be just a fraction of the whole range).
     *
     * @param {number} initialTime - Time corresponding at beggining of texture.
     * @param {number} finalTime - Time corresponding at end of texture.
     * @retun {Promise} Promise resolves when STFTHandler returns a non empty STFTData whitin read 
     * method.
     * @async
    */
    setTextureAndDraw(initialTime, finalTime) {
        return new Promise((resolve, reject) => {
            this.forcingDraw = false;
            // Ask stftHandler for data between initial and final times.
            const data = this.stftHandler.read({ startTime: initialTime, endTime: finalTime });
            if (data.start - data.end === 0) {
                reject('Texture is empty');
            }
            // Times from the data retrieved by the stftHandler
            const resultInitialTime = this.stftHandler.getTimeFromStftColumn(data.start);
            const resultFinalTime = this.stftHandler.getTimeFromStftColumn(data.end);
            // Save computed values to save some ops in the future.
            this.setLoadedData(resultInitialTime, resultFinalTime);

            // Texture dimensions.
            const width = data.end - data.start;
            const height = this.stftHandler.bufferColumnHeight;

            // Texture setup in webGL.
            this.glHandler.setupArrayTexture(data.data, width, height);
            this.glHandler.setupPositionBuffer(
                resultInitialTime,
                resultFinalTime,
                this.maxFrequency,
            );
            resolve();
        });
    }

    /**
     * Checks if requested data is already loaded on texture. In case forcingDraw is true, 
     * texture must be completly changed.
     * @param {number} requestedInitialTime - Expected time in the left border of canvas.
     * @param {number} requestedFinalTime - Expected time in the rigth border of canvas.
     * @return {boolean} - True if expected times are included inside loaded texture.
    */
    requiredNewDataOnTexture(requestedInitialTime, requestedFinalTime) {
        return (Math.max(requestedInitialTime, 0) < this.textureLoadedValues.initialTime
                || requestedFinalTime > this.textureLoadedValues.finalTime
                || this.forcingDraw);
    }


    /**
     * Those time are saved to check if next draws will require to load new data on texture.
     * @param {number} initialTime - Expected time in the left border of canvas.
     * @param {number} finalTime - Expected time in the rigth border of canvas.
    */
    setLoadedData(initialTime, finalTime) {
        this.textureLoadedValues.initialTime = initialTime;
        this.textureLoadedValues.finalTime = finalTime;
    }

    /**
     * After precision is modified, methods to draw vertical and horizontal scales
     * are summoned.
     * @param {number} initialTime - Time belonging to the left border of canvas.
     * @param {number} finalTime - Time belonging to the rigth border of canvas.
     * @param {number} initialFrequency - Frequency belonging to the bottom border of canvas.
     * @param {number} finalFrequency - Frequency belonging to the top border of canvas.
    */
    drawAxis(initialTime, finalTime, zoomFactor, initialFrequency, finalFrequency) {
        this.computeTimeprecision(zoomFactor);
        this.drawHorizontalAxis(initialTime, finalTime);
        this.drawVerticalAxis(initialFrequency/1000, finalFrequency/1000); // To express in kH.
    }

    /**
    * Takes outside times and their pixel position relative to canvas and after calculating
    * pixelStep, timeStep and number of steps  calls drawHorizontalScale on axisHandler
    * to sketch the axis.
    * @param {object} leftValues - Time and position nearest to left border acording precision.
    * @param {object} rigthValues - Time and position nearest to right border acording precision.
    */
    drawHorizontalAxis(initialTime, finalTime) {
        const leftValues = this.LeftTimeAndPositionWithPrecision(this.precision, initialTime);
        const rigthValues = this.LeftTimeAndPositionWithPrecision(this.precision, finalTime);
        // Number of pixels between outside precise times.
        const width = rigthValues.outsidePosition - leftValues.outsidePosition;
        // const width = this.visualizer.canvas.width;
        // Total time between outside precise times.
        const duration = (rigthValues.outsideTime - leftValues.outsideTime);
        // Number of marks fitting on horizontal axis according to duration and precision
        // considering every time with precision digit gets a mark.
        const numSteps = duration * 10 ** this.precision;
        const timeStep = 1 / (10 ** this.precision);
        const pixelStep = width / numSteps;


        this.axisHandler.drawHorizontalScale(
            leftValues.outsideTime,
            timeStep,
            Math.floor(leftValues.outsidePosition),
            pixelStep,
            numSteps,
            this.precision,
        );
    }

    /**
     * Computes number of pixels each mark of FREQUENCY_LINES should skip to fill
     * linearly the vertical Axis and the frequency values skipped every FREQUENCY_MARK.
     * Calls method in axisHandler to draw vertical scale.
     * @param {number} initialFrequency - Frequency value of the inferior border in sketch.
     * @param {number} finalFrequency - Frequency value of the superior border in sketch.
    */
    drawVerticalAxis(initialFrequency, finalFrequency) {
        const frequencyStep = (finalFrequency - initialFrequency) / FREQUENCY_LINES;
        const pixelStep = this.visualizer.canvas.height / FREQUENCY_LINES;
        this.axisHandler.drawVerticalScale(
            initialFrequency,
            finalFrequency,
            FREQUENCY_LINES,
            frequencyStep,
            pixelStep,
        );
    }


    /**
     * @param {int} precision - Defines how many digits after decimal point will be considered in
     * time values.
     * @param {number} time - Time without considering digits precision.
     * @return {Object} - left nearest time to  and its canvas relative
     * position in pixels.
    */
    LeftTimeAndPositionWithPrecision(precision, time) {
        const leftPreciseTime = Math.floor(time * (10 ** precision)) / (10 ** precision);
        const positionOutsideCanvas = this.visualizer.pointToCanvas(
            this.visualizer.createPoint(leftPreciseTime, 0),
        );
        return {
            outsidePosition: positionOutsideCanvas.x * this.visualizer.canvas.width,
            outsideTime: leftPreciseTime,
        };
    }


    /**
    * @param {number} zoomFactor - factor expressing zoom and therfore how much precision is needed.
    * This method evaluates the distance between to consecutive marks and if necesary modifies
    * precision so two consecutive lines not get so apart or so close according the conditions.
    * In case zoom out makes two consecutive marks to be too far,
    * precision upgrades so more marks are sketched.
    * In case zoom in makes to consecutive marks to be to close,
    * precision reduces so less marks are sketched.
    */
    computeTimeprecision(zoomFactor) {
        if ((this.visualizer.canvas.width / (10 ** this.precision)) * zoomFactor
            < this.minPixelsMarkStep) {
            this.precision = this.precision - 1;
        } else if ((this.visualizer.canvas.width / (10 ** this.precision)) * zoomFactor
                    > this.maxPixelsMarkStep) {
            this.precision = this.precision + 1;
        }
    }

    /**
     * Passes those variables to axisHandler, which takes care of drawing the rectangle in
     * the 2d-context canvas.
     * @param {int} x - Pixel from 0 to canvas.width in which left superior corner of
     * rectangle must be placed.
     * @param {int} y - Pixel from 0 to canvas.height in which left superior corner of
     * rectangle must be placed.
     * @param {int} baseLength - Rectangle base length in pixels.
     * @param {int} heightLength - Rectangle height length in pixels.
    */
    drawZoomRectangle(x, y, baseLength, heightLength) {
        this.axisHandler.drawZoomRectangle(x, y, baseLength, heightLength);
    }

    /**
     * Used to deactivate the varible in axisHandler isZooming, required to avoid clearing while
     * drawing zooming rectangle.
    */
    quitZoomingBox() {
        this.axisHandler.isZooming = false;
    }
}


export default Artist;