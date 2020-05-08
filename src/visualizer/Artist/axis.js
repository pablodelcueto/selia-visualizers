/**
* AxisHandler module.
*
*@module AxisHandler
*@see module: visualizer/Artist/axis.js
*/

/**
* @param {int} precision - Number of digits after point.
* @param {number} value - Value to round.
*/
function roundValue(precision, value) {
    return Math.round(value * 10 ** precision) / 10 ** precision.toString();
}

/**
* Class that handles sketching the axis lines and values.
* The class constucts a second canvas for drawing axis using 2d-context. in that canvas.
* Also takes care of drawing rectangles inside second canvas.
*/

export default class AxisConstructor {
    /**
    * Creates an axisHandler Object
    * @param {Object} canvas - The canvas with another graphics context under the one with axis.
    * @param {Object} canvasContainer - Canvas container div where a second div with another context
    * will be paired.
    */
    constructor(canvas, canvasContainer) {
        this.canvasContainer = canvasContainer;
        this.visualizerCanvas = canvas;
        // Used to construct single rectangles
        this.isZooming = false;
        this.audioLength = 1;
        // Data used by 2d-context to draw zooming Rectangles
        this.rect = {
            x: 0,
            y: 0,
            baseLength: 0,
            heightLength: 0,
        };
        this.init();
    }

    /**
    * Constructs a second canvas and sets a 2d-context to it.
    */
    init() {
        this.constructCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.drawMarkLine();
        this.drawAxisRectangles();
    }

    /**
    * Takes shape attributes from the original canvas and copies them to the canvas
    * to overlap them properly
    * It also makes this new Canvas ignorant to events so all the functionality in the
    * first one could remain.
    */
    constructCanvas() {
        const originalStyle = this.visualizerCanvas.style;
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('id', '2dCanvas');
        this.canvasContainer.appendChild(this.canvas);
        this.resizeAxisCanvas();
        this.canvas.setAttribute('style', originalStyle.cssText + 'z-index:1; pointer-events:none');
    }

    /**
    * Resize the new 2d-context canvas to the same size as visualizer canvas.
    */
    resizeAxisCanvas() {
        const desiredWidth = this.visualizerCanvas.width;
        const desiredHeight = this.visualizerCanvas.height;

        if (this.canvas.width !== desiredWidth || this.canvas.height !== desiredHeight) {
            this.canvas.width = desiredWidth;
            this.canvas.height = desiredHeight;
        }
    }

    /**
    * Draws two rectangles to let scales to be always visible.
    */
    drawAxisRectangles() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, .6)';
        this.ctx.fillRect(0, 0, 80, this.canvas.height);
        this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
        this.ctx.fillStyle = '#000000';
    }

    /**
    *Draws the line used to set the x-coordinates axis at the bottom of canvas.
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
    * Draws the red middle line
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
        this.isZooming = true;
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
    * @param {boolean} zooming - Boolean used to clear some scales while moving mouse just in case
    * zooming is false.
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
    * Draws the vertical lines and corresponding values in the horizontal Axis.
    * @param {number} initialTime - First time to appear in the horizontal Axis.
    * @param {number} timeStep - Time between one time mark and the next one.
    * @param {int} initialPixelTraslation - Number of pixels to the left of
    * canvas where initialTime should be positioned.
    * @param {int} pixelStep - Number of pixels between one time mark and the next one.
    * @param {int} numberOfTicks - Number of marks in x-Axis inside Canvas.
    * @param {int} precision - Number of decimals precision in time values
    */
    drawHorizontalScale(initialTime, timeStep, initialPixelTranslation, pixelStep, numberOfTicks, precision) {
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
                    initialPixelTranslation + i * pixelStep + 3, this.canvas.height - 5,
                );
                this.ctx.moveTo(initialPixelTranslation + i * pixelStep, this.canvas.height - 30);
                this.ctx.lineTo(initialPixelTranslation + i * pixelStep, this.canvas.height - 5);
                // this.ctx.font = (20 - precision * 3).toString() + 'px serif';
                this.ctx.font = '17px serif';
            }
            timeValue = timeValue + preciseTimeStep;
        }
        this.ctx.stroke();
        this.ctx.closePath();
    }

    /**
    * @param {number} initialFrequency - Frequency initializing bottom of canvas.
    * @param {number} finalFrequency - Frequency for canvas top.
    * @param {int} numOfTicks - Number of marks or ticks in vertical scale.
    * @param {number} frequencyStep - Frequency difference between two consecutive marks
    * in vertical scale.
    * @param {int} pixelStep - Number of pixels between two consecutive marks in vertical scale.
    * Draws all the ticks and then it print 1 frequency value every 5 marks.
    */
    drawVerticalScale(initialFrequency, finalFrequency, numOfTicks, frequencyStep, pixelStep) {
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
}
