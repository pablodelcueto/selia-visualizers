//this file content draws the axis of the spectrogram. 

export default class AxisConstructor {
    constructor(canvas) {
        this.visualizerCanvas = canvas;
        this.init();
    }

    init() {
        this.constructCanvas();
        this.ctx = this.canvas.getContext('2d');
    }

    constructCanvas() {
        const spectrogramCanvas = document.getElementById('visualizerCanvas');
        const originalStyle = spectrogramCanvas.style;
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('id', '2dCanvas');
        document.getElementById('canvasContainer').appendChild(this.canvas);
        this.resizeAxisCanvas(spectrogramCanvas);
        this.canvas.setAttribute('style', originalStyle.cssText + 'z-index:1; pointer-events:none');
    }

    resizeAxisCanvas(anotherCanvas) {
        // look up the size the canvas is displayed
        const desiredWidth = this.visualizerCanvas.width;
        const desiredHeight = this.visualizerCanvas.offsetHeight;

        if (this.canvas.width !== desiredWidth || this.canvas.height !== desiredHeight) {
            this.canvas.width = desiredWidth;
            this.canvas.height = desiredHeight;
        }

        // console.log('axis canvas size', {
        //     width: this.canvas.width,
        //     height: this.canvas.height,
        // })
    }

    drawBaseLine() {
        this.ctx.lineWidth = 0.6;
        // Horizontal line
        this.ctx.moveTo(0, this.canvas.height - 20);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 20);
        this.ctx.stroke();
    }

    drawVerticalLine() {
        this.ctx.lineWidth = 0.6;
        this.ctx.moveTo(20, 0);
        this.ctx.lineTo(20, this.canvas.height);
        this.ctx.stroke();
    }   

    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    mod60Convertion(time) { //time given in seconds 
        

    }

    secondAdaptAxis(initialTime, numberOfTicks, zoomFactor, translation) {

        //initialTime es el primer valor que se obtenga redondeando hacia abajo los decimales definidos por el zoom. 
        //let initialpixel el point to canvas

    }

    adaptHorizontalAxis(initPosition, pixelStep, initialTime, timeStep, presicion, numSteps) {
        let initPixel = Math.floor(initPosition.x * this.canvas.width);
        let initialPixel = initPosition.x * this.canvas.width;
        this.drawHorizontalScale(initialTime, timeStep, initPixel, pixelStep, numSteps, 1, presicion)
    }


    drawHorizontalScale(initialTime, timeStep, initialPixelTranslation, pixelStep, numberOfTicks, tagOffset, presicion) {
        const ctx = this.ctx;
        let timeValue = initialTime;
        (presicion < 2 ? tagOffset = 1 : tagOffset = 5 )
        ctx.font = '12px serif';
        this.clear();
        this.drawBaseLine();
        ctx.beginPath();
        ctx.lineWidth = 0.4;
        for (let i=0; i < numberOfTicks + 1; i++ ) { 
            if (i%tagOffset === 0) {
                ctx.fillText(
                    this.roundValue(presicion,timeValue),
                    initialPixelTranslation + i * pixelStep + 3, this.canvas.height-5 
                );
            }
            timeValue = timeValue + timeStep;
            ctx.moveTo(initialPixelTranslation + i * pixelStep, this.canvas.height - 40);
            ctx.lineTo(initialPixelTranslation + i * pixelStep, this.canvas.height - 20);
        }
        ctx.stroke();
        ctx.closePath();
    }

    adaptVerticalAxis(initialFrequency, finalFrequency, numOfTicks) {
        const pixelStep = this.canvas.height / numOfTicks;
        const frequencyStep = (finalFrequency - initialFrequency) / numOfTicks;
        this.drawVerticalScale(initialFrequency, finalFrequency, frequencyStep, pixelStep, numOfTicks);

       

    }

    drawVerticalScale(initialFrequency, finalFrequency, frequencyStep, pixelStep, numOfTicks) {
        const ctx=this.ctx;
        let frequencyValue = finalFrequency;
        ctx.beginPath();
        ctx.lineWigdth = 0.4;
        for (let i = 0; i < numOfTicks + 1 ; i++) {
            if (i % 5 === 0) {
                ctx.fillText(
                    frequencyValue.toFixed(0) + " kHz",
                    20,
                    i * pixelStep,
                );
                ctx.moveTo(0, i * pixelStep);
                ctx.lineTo(18, i * pixelStep);
            }
            frequencyValue = frequencyValue - frequencyStep;
            ctx.moveTo(0, i * pixelStep);
            ctx.lineTo(10, i * pixelStep);
        }
        ctx.stroke();
        ctx.closePath();
    }

    
    resetCanvas() {
        // Use the identity matrix while clearing the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    roundValue(presicion, value) {
        // return value.toFixed(presicion);
        return Math.floor(value * 10**presicion) / 10**presicion.toString()
    }
}

    