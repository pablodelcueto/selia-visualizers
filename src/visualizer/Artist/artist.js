/**
* Main drawing Module.
* @module Artist/artist
* @see module: Artist/axis
* @see module: Artist/webGL
*/

/**
 * @import { WEbGLhandler } from "./webGL"
 * @import {AxisDrawer} from "./axis"
 */
import WebGLhandler from './webGL';
import AxisDrawer from './axis';

/**
 * Class that handles drawing of the spectrogram. This is done by coordinating
 * a WebGLHandler and an AxisDrawer. The first one used to sketch via a webGL conext
 * on the visualizer canvas, and the latter sketch the horizontal and vertical axis using
 * 2d context of a new canvas positioned above the visualizer canvas.
 * .
 * @class
 *
 * When artist is commanded to draw, it first requests data from the
 * STFTHandler so that the WebGLHandler can fill the webGL texture used to sketch the spectrogram.
 * It also sketchs a gray background covering areas where spectogram could be draw when
 * data loading is complete.
 * Using visualizer class methods, computes values of time and frequency required
 * by axisHandler to draw axis and scales.
 *
 * @property {class} glHandler - Class managing webGL program.
 * @see class: Artist/glHandler
 * @property {class} axisHandler - Class managing the drawing of time and frequency axis.
 * @see class:Artist/axusHandler
 * @property {Object} [textureLoadedValues] - Object that tracks the initial and final time
 * of STFTData already added to the glHandler texture.
 * @property {int} [textureLoadedValues.initialTime] - Texture data initial time.
 * @property {int} [textureLoadedValues.finalTime] - Texture data final time.
 * @property {Object} canvas - Alternative Canvas to use 2d context.
 * @property {Object} ctx - 2d context created for canvas property.
 * @property {Object} rectangle -  2d context rectangle used to bound zooming area.
*/
class Artist {
    /**
    * Creates and Artist Object.
    * @constructor
    * @param {class} visualizer - Visualizer object asking for changes in sketch.
    * @param {class} stftHandler - Class retrieving STFTData to the artist.
    */
    constructor(visualizer, stftHandler) {
        this.stftHandler = stftHandler;
        this.visualizer = visualizer;
        // // Class used to fill proper data in a GL program in order to sketch parts of the
        // // spectrogram in a webGL context.
        // this.glHandler = new WebGLhandler(visualizer.canvas);
        // // Class used to sketch axis using a second canvas with a 2d context.
        // this.axisHandler = new AxisDrawer(visualizer, visualizer.canvas, visualizer.canvasContainer);
        // Data used to avoid extra computations.
        this.textureLoadedValues = {
            initialTime: 0,
            finalTime: 0,
        };
        // Data used to draw zoom rectangles.
        this.rect = {
            x: 0,
            y: 0,
            baseLength: 0,
            heightLength: 0,
        };
        this.init();
    }

    /**
    * Creates a new canvas and two auxiliar classes to draw using glContext and 2dContext.
    */
    init() {
        this.constructCanvas();
        // Class used to fill proper data in a GL program in order to sketch parts of the
        // spectrogram in a webGL context.
        this.glHandler = new WebGLhandler(this.visualizer.canvas);
        // Class used to sketch axis using a second canvas with a 2d context.
        this.axisHandler = new AxisDrawer(this.visualizer, this.canvas, this.ctx);
    }

    /**
    * Takes shape attributes from the visualizer canvas and copies them to the artist canvas
    * to overlap them properly. Creates a 2d context for artist canvas.
    * It also makes this new canvas ignorant to events so all the functionality in the
    * first one remains.
    */
    constructCanvas() {
        const originalStyle = this.visualizer.canvas.style;
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('id', '2dCanvas');
        this.visualizer.canvasContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize2dContextCanvas();
        this.canvas.setAttribute('style', `${originalStyle.cssText} z-index:1; pointer-events:none`);
    }

    /**
    * Resize the new artist canvas to the same size as visualizer canvas.
    */
    resize2dContextCanvas() {
        const desiredWidth = this.visualizer.canvas.width;
        const desiredHeight = this.visualizer.canvas.height;

        if (this.canvas.width !== desiredWidth || this.canvas.height !== desiredHeight) {
            this.canvas.width = desiredWidth;
            this.canvas.height = desiredHeight;
        }
    }

    /**
     * Calls glHandler setColor to change the color map.
     * @param {number} newColor - number to pick a line color in the
     * glHandler image loaded to select different color maps.
    */
    setColor(newValue) {
        this.glHandler.setColor(newValue);
    }

    /**
     * Calls glHandler setMinFilter method to change minFilter value.
     * @param {number} newValue - ColorMap inferior limit value.
    */
    setColorMapMinFilter(newValue) {
        this.glHandler.setMinFilter(newValue);
    }

    /**
     * Calls glHandler setMinFilter method to change maxFilter value.
     * @param {number} newValue - ColorMap superior limit value.
    */
    setColorMapMaxFilter(newValue) {
        this.glHandler.setMaxFilter(newValue);
    }

    /**
     * Used to set axisHandler Canvas size equal to visualizer's Canvas.
    */
    adjustSize() {
        this.glHandler.adjustCanvasViewport();
        this.resize2dContextCanvas();
    }

    /**
     * Visualizer calls this method to draw.
     * @param {number} initialTime - Time requested in Canvas left border.
     * @param {number} finalTime - Time requested in Canvas right border.
     * @param {number} initialFrequency - Frequency requested in Canvas bottom border.
     * @param {number} finalFrequency - Frequency requested in Canvas top border.
     * @param {Object} matrix - Float32Array containing the matrix used as transformation uniform
     * by the webGL program linked.
    */
    draw(initialTime, finalTime, initialFrequency, finalFrequency, matrix) {
        this.axisHandler.drawAxis(initialTime, finalTime, matrix[0], initialFrequency, finalFrequency);
        this.setGLhandler(initialTime, finalTime, matrix)
            .then(() => this.glHandler.draw(matrix))
            .catch((error) => {
                if (error !== 'Texture is empty') console.error(error);
            });
    }

    /**
     * Draw background box at requested limits.
     *
     * Sends data to glHandler to draw background layer between initialTime and finalTime.
     * Used to pass setTextureAndDraw promise to draw method once background layer is settled.
     *
     * @param {number} initialTime - Time corresponding the the initialTime in texture.
     * @param {number} finalTime - Time corresponding at end of texture.
     * @param {Object} matrix - Float32Array useds to set matrix as uniform for the
     * webGL background program.
     * @return {Promise} Resolves when STFTHandler returns a non empty STFTData Object.
     * @async
    */
    setGLhandler(initialTime, finalTime, matrix) {
        const timeLength = finalTime - initialTime;
        this.glHandler.drawBackground(this.visualizer.audioLength, this.maxFrequency, matrix);
        return this.setTextureAndDraw(
            initialTime - (0.5 * timeLength),
            finalTime + (0.5 * timeLength),
        );
    }

    /**
     * Load the requested spectrogram framgent into the GL texture.
     *
     * The method ask for data in range of [initTime, finalTime] and sets the glHandler texture with
     * the results received from the STFTHandler.
     *
     * **Warning**: It could be just a fraction of the whole range.
     *
     * @param {number} initialTime - Time corresponding at beggining of texture.
     * @param {number} finalTime - Time corresponding at end of texture.
     * @return {Promise} Promise resolves when STFTHandler returns a non empty STFTData from read
     * method.
     * @async
    */
    setTextureAndDraw(initialTime, finalTime) {
        return new Promise((resolve, reject) => {
            // Ask stftHandler for data between initial and final times.
            const data = this.stftHandler.read({ startTime: initialTime, endTime: finalTime });

            if (data.start - data.end === 0) {
                reject(new Error('Texture is empty'));
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
     * Check if requested data is already on glHandler texture.
     * @param {number} requestedInitialTime - Expected time in the left border of canvas.
     * @param {number} requestedFinalTime - Expected time in the right border of canvas.
     * @return {boolean} - True if expected times are included inside the loaded texture.
    */
    requiredNewDataOnTexture(requestedInitialTime, requestedFinalTime) {
        return (Math.max(requestedInitialTime, 0) < this.textureLoadedValues.initialTime
                || requestedFinalTime > this.textureLoadedValues.finalTime);
    }


    /**
     * Set loaded texture temporal limits.
     *
     * The time are saved to check if next draws will require to load new data on texture.
     * @param {number} initialTime - Expected time in the left border of canvas.
     * @param {number} finalTime - Expected time in the right border of canvas.
    */
    setLoadedData(initialTime, finalTime) {
        this.textureLoadedValues.initialTime = initialTime;
        this.textureLoadedValues.finalTime = finalTime;
    }

    /**
    * @param {int} xCoord - Pixel coordinate x for left superior corner of rectangle.
    * @param {int} yCoord - Pixel coordinate y for left superior corner of rectangle.
    * @param {int} base - Rectangle base length in pixels.
    * @param {int} height - Rectangle height length in pixels.
    * First this method erases the previoulsy drawed rectangle with values in this.rect
    * then it draws the new rectangle and sets that rectangle as this.rect values.
    */
    drawZoomRectangle(xCoord, yCoord, base, height) {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(256,256,256,0.5)';
        this.axisHandler.isZooming = true;
        this.ctx.clearRect(
            this.rect.x - 1,
            this.rect.y - 1,
            this.rect.baseLength + 2,
            this.rect.heightLength + 2,
        );
        this.rect = {
            x: xCoord,
            y: yCoord,
            baseLength: base,
            heightLength: height,
        };
        this.ctx.strokeRect(this.rect.x, this.rect.y, this.rect.baseLength, this.rect.heightLength);
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
