//this file content draws the axis of the spectrogram. 
import {RANGE_AMPLITUDE} from './artist';

export default class AxisConstructor {
    constructor(){
    // this.canvas = document.getElementById("visualizerCanvas");
    this.init();
    }

    init(){
        this.constructCanvas();
        this.pixelsJumpForSecond = this.canvas.width*RANGE_AMPLITUDE/(2*this.secondsInBuffer);
        this.baseLineLength = this.canvas.width;;
        this.ctx = this.canvas.getContext('2d');
        // this.drawBaseLine();
    }

    constructCanvas(){
        let spectrogramCanvas = document.getElementById("visualizerCanvas");
        let originalStyle = spectrogramCanvas.style;
        this.canvas = document.createElement("canvas");
        document.getElementById("canvasContainer").appendChild(this.canvas);
        this.resizeAxisCanvas(spectrogramCanvas);
        this.canvas.setAttribute("style", originalStyle.cssText+"z-index:1; pointer-events:none");
    }

    resizeAxisCanvas(anotherCanvas) {
        // look up the size the canvas is displayed
        var desiredWidth = anotherCanvas.width;
        var desiredHeight = anotherCanvas.offsetHeight;

        if (this.canvas.width != desiredWidth || this.canvas.height != desiredHeight) {
        this.canvas.width = desiredWidth;
        this.canvas.height = desiredHeight;
        }
    }

    drawBaseLine(){
        let ctx = this.ctx;
        ctx.lineWidth = .6;
        // Horizontal line
        ctx.moveTo(0, this.canvas.height-20);
        ctx.lineTo(this.canvas.width,this.canvas.height-20);
        ctx.stroke();
    }


    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }


    secondAdaptAxis(initialTime, numberOfTicks, zoomFactor, translation){

        //initialTime es el primer valor que se obtenga redondeando hacia abajo los decimales definidos por el zoom. 
        //let initialpixel el point to canvas

    }

    adaptAxis(zoomFactor, initPosition, finalPosition, numberOfTicks, initialTime, finalTime){
        let canvasStep = finalPosition.x-initPosition.x;
        let pixelStep = canvasStep*this.canvas.width/numberOfTicks;
        let timeStep = (finalTime - initialTime)/numberOfTicks;
        let initialPixel = initPosition.x*this.canvas.width;
        this.drawScale(initialTime, timeStep, this.canvas.width*initPosition.x, pixelStep, numberOfTicks, 1)
    }


    drawScale(initialTime, timeStep, initialPixelTranslation, pixelStep, numberOfTicks, tagOffset){
        let timeValue = initialTime;
        let ctx = this.ctx;
        ctx.font = '12px serif';
        this.clear();
        this.drawBaseLine();
        ctx.beginPath();
        let baseLineLength = this.baseLineLength;
        ctx.lineWidth = .4;
        for(let i=0; i < numberOfTicks + 1; i++){ 
                if (i%tagOffset == 0){
                    ctx.fillText(timeValue.toFixed(2), initialPixelTranslation + i*pixelStep+3, this.canvas.height-5 )
                }
                timeValue = timeValue + timeStep
                ctx.moveTo(initialPixelTranslation + i*pixelStep, this.canvas.height-40);
                ctx.lineTo(initialPixelTranslation + i*pixelStep, this.canvas.height-20);
        }
        ctx.stroke();
        ctx.closePath();
    }
    
    resetCanvas(){
        // Use the identity matrix while clearing the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    computeTimePresicion(factor){
        if (factor <= 1 ){
            return 2          
        }
        else if ( .5 <= factor < 1){
            return 4
        }
        else if ( .20 <= factor <= .5){
            return 6
        }
    }
}

    