/**
* Main drawing Module.
* @module Artist/artist
* @see module: Artist/axis
* @see module: Artist/webGL
*/

/**
 * @import { module:Artist/webGL~WebGLHandler } from "./webGL"
 * @import { module:Artist/axis~AxisDrawer } from "./axis"
 */
import WebGLhandler from './webGL';
import AxisDrawer from './axis';


/**
 * Class that handles drawing of the spectrogram. This is done by coordinating
 * a WebGLHandler and an AxisDrawer. The first one used to sketch via a webGL conext
 * on the visualizer canvas, and the latter sketches the horizontal and vertical axis
 * using 2d context on a new canvas positioned on top of the visualizer canvas.
 *
 * When artist is commanded to draw, it first requests data from the STFTHandler so
 * that the WebGLHandler can fill the webGL texture used to sketch the spectrogram.
 * It also sketchs a gray background covering areas where spectogram could be draw when
 * data loading is complete.
 *
 * @property {module:Artist/webGL~WebGLHandler} glHandler - Class managing webGL drawing.
 * @property {module:Artist/axis~AxisHandler} axisHandler - Class managing the drawing of
 * time and frequency axis.
 * @property {HTMLCanvasElement} canvas - Alternative Canvas to use 2d context.
 * @property {CanvasRenderingContext2D} ctx - 2d context created for axis drawing.
 * @property {Object} rect - 2d context rectangle used to bound zooming area.
 * @property {number} rect.x - Lower left corner x coordinate.
 * @property {number} rect.y - Lower left corner y coordinate.
 * @property {number} rect.baseLenght - Rectangle base length.
 * @property {number} rect.heightLength - Rectangle height length.
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

        // Create a new canvas for axis drawing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.visualizer.canvasContainer.appendChild(this.canvas);

        this.styleAxisCanvas();
        this.resizeAxisCanvas();

        // Class used to fill proper data in a GL program in order to sketch parts of the
        // spectrogram in a webGL context.
        this.glHandler = new WebGLhandler(visualizer.canvas, stftHandler);

        // Class used to sketch axis using a second canvas with a 2d context.
        this.axisHandler = new AxisDrawer(visualizer, this.canvas, this.ctx);
    }

    /**
     * Add style to axis canvas.
     * @private
     */
    styleAxisCanvas() {
        const originalStyle = this.visualizer.canvas.style;
        this.canvas.setAttribute(
            'style',
            `${originalStyle.cssText} z-index:1; pointer-events:none`,
        );
    }

    /**
    * Resize the new axis canvas to the same size as visualizer canvas.
    * @private
    */
    resizeAxisCanvas() {
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
     * @public
     */
    setColor(newValue) {
        this.glHandler.setColor(newValue);
    }

    /**
     * Set colormap superior filter.
     * @param {number} newValue - Colormap inferior limit value.
     * @public
     */
    setColorMapInfFilter(newValue) {
        this.glHandler.setInfFilter(newValue);
    }

    /**
     * Set colormap superior filter.
     * @param {number} newValue - Colormap superior limit value.
     * @public
     */
    setColorMapSupFilter(newValue) {
        this.glHandler.setSupFilter(newValue);
    }

    /**
     * Update canvas size
     * @private
     */
    adjustSize() {
        this.glHandler.adjustCanvasViewport();
        this.resizeAxisCanvas();
    }

    /**
     * Draw the spectrogram and axis.
     *
     * Warning: This method might be called while the spectrogram data is incomplete
     * and might not be able to draw the full requested temporal range. It will
     * draw all current data contained within the requested interval. This method
     * returns the interval that *was* drawn so the user can handle partial draws.
     *
     * @param {number} initialTime - Time requested in Canvas left border.
     * @param {number} finalTime - Time requested in Canvas right border.
     * @param {number} initialFrequency - Frequency requested in Canvas bottom border.
     * @param {number} finalFrequency - Frequency requested in Canvas top border.
     * @param {Float32Array} matrix - Float32Array containing the matrix used as global
     * transformation.
     * @return {{end: number, start: number}} - The temporal limits of the drawn
     * spectrogram.
     * @public
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

    reset() {
        this.glHandler.resetSpectrogramTexture();
    }

    /**
    * Draw a rectangle to indicate the portion on which to zoom.
    * @param {int} xCoord - Pixel coordinate x for left superior corner of rectangle.
    * @param {int} yCoord - Pixel coordinate y for left superior corner of rectangle.
    * @param {int} base - Rectangle base length in pixels.
    * @param {int} height - Rectangle height length in pixels.
    * @public
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
     * Used to deactivate the varible in axisHandler isZooming, required to avoid
     * clearing while drawing zooming rectangle.
     * @public
     */
    quitZoomingBox() {
        this.axisHandler.isZooming = false;
    }
}


export default Artist;
