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
 *
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

        // Data used to draw zoom rectangles.
        this.rect = {
            x: 0,
            y: 0,
            baseLength: 0,
            heightLength: 0,
        };

        this.constructCanvas();

        // Class used to fill proper data in a GL program in order to sketch parts of the
        // spectrogram in a webGL context.
        this.glHandler = new WebGLhandler(visualizer.canvas, stftHandler);

        // Class used to sketch axis using a second canvas with a 2d context.
        this.axisHandler = new AxisDrawer(visualizer, this.canvas, this.ctx);
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
        this.axisHandler.drawAxis(
            initialTime,
            finalTime,
            matrix[0],
            initialFrequency,
            finalFrequency,
        );
        const drawBounds = this.glHandler.draw(initialTime, finalTime, matrix);
        return drawBounds;
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
