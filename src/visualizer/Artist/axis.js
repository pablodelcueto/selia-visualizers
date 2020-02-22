//this file content draws the axis of the spectrogram. 
import {RANGE_AMPLITUDE} from './artist';

export default class AxisConstructor {
    constructor(secondsPerBuffer){
    // this.canvas = document.getElementById("visualizerCanvas");
    
    this.secondsInBuffer = secondsPerBuffer;
    this.init();
    console.log('pixelsjump', this.pixelsJumpForSecond);
    }

    init(){
        this.constructCanvas();
        this.pixelsJumpForSecond = this.canvas.width*RANGE_AMPLITUDE/(2*this.secondsInBuffer);
        this.baseLineLength = RANGE_AMPLITUDE*this.canvas.width;;
        this.ctx = this.canvas.getContext('2d');
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

    adaptAxis(initialTime, numberOfTicks, zoomFactor, translation){
        let initialPixel = 0; //depends on translation
        let initialPixelTraslation = 0;
        numberOfTicks = Math.floor(2*this.secondsInBuffer/(RANGE_AMPLITUDE*zoomFactor));

        let pixelStep = this.pixelsJumpForSecond*zoomFactor;
        // let pixelsInSecond = 1/this.pixelsJumpForSecond*zoomFactor
        let timeStep = 1;
        this.drawScale(initialTime, timeStep, initialPixel, initialPixelTraslation, pixelStep, numberOfTicks, 1)
    }


    drawScale(initialTime, timeStep, initialPixel, initialPixelTranslation, pixelStep, numberOfTicks, tagOffset){
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
                    ctx.fillText(timeValue.toFixed(2), initialPixelTranslation + initialPixel + i*pixelStep+3, this.canvas.height-5 )
                }
                timeValue = timeValue + timeStep
                ctx.moveTo(initialPixelTranslation + initialPixel + i*pixelStep, this.canvas.height-40);
                ctx.lineTo(initialPixelTranslation + initialPixel + i*pixelStep, this.canvas.height-20);
        }
        ctx.stroke();
        ctx.closePath();
    }
    
    resetCanvas(){
        // Use the identity matrix while clearing the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

    // draw1LinePerSecondScale(matrix){
    //     this.drawBaseLine();
    //     let ctx = this.ctx;
    //     let baseLineLength = this.baseLineLength;
    //     ctx.beginPath();
    //     //Vertical lines
    //     ctx.lineWidth = .4;
    //     for (let i = 0; i<this.secondsPerBuffer; i++){
    //         // ctx.font = parseInt(12*1/matrix[0]) + 'px serif';
    //         ctx.font = '20px serif'
    //         if (i%5 ==0){
    //             var value = i;
    //             ctx.fillText(value.toString(), i*baseLineLength/this.secondsPerBuffer-2, this.canvas.height - 30 + 28)
    //             ctx.moveTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-40);
    //             ctx.lineTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-20);
    //         }
    //         else{
    //             ctx.moveTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-35);
    //             ctx.lineTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-20);
    //         }
    //         ctx.stroke();
    //         ctx.closePath();
    //     }    
    // }

    // draw2LinesPerSecondScale(matrix){
    //     this.drawBaseLine();
    //     let ctx = this.ctx;
    //     let baseLineLength = this.baseLineLength;
    //     ctx.beginPath();
    //     //Vertical lines
    //     ctx.lineWidth = .4;
    //     for (let i = 0; i<5*this.secondsPerBuffer*2; i++){
    //         ctx.font = '20px serif';
    //         if (i% 5==0){
    //             var value = i;
    //             ctx.fillText(value.toString(), i*baseLineLength/this.secondsPerBuffer-2, this.canvas.height - 30 + 28)
    //             ctx.moveTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-40);
    //             ctx.lineTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-20);
    //         }
    //         else{
    //             ctx.moveTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-35);
    //             ctx.lineTo(i*baseLineLength/this.secondsPerBuffer, this.canvas.height-20);
    //         }
    //         ctx.stroke();
    //         ctx.closePath();
    //     }    
    // }
    

    // draw10LinesPerSecondScale(matrix){ //vertical lines depends on the config hop_size
    //     this.drawBaseLine();
    //     let ctx = this.ctx;   
    //     let baseLineLength = this.baseLineLength;
    //     ctx.beginPath();
    //     //Vertical lines
    //     ctx.lineWidth = .7;
    //     for (let i = 0; i<this.secondsPerBuffer*10; i++){
    //         if(i%10==0){
    //             ctx.font = '12px serif'
    //             // console.log('size 1', 12*1/matrix[0].toString());
    //             var value = i/10.0.toFixed(2);
    //             ctx.fillText(value.toString(), i*baseLineLength/(this.secondsPerBuffer*10)-2, this.canvas.height-30+25)
    //             ctx.moveTo(i*baseLineLength/(this.secondsPerBuffer*10), this.canvas.height-40);
    //             ctx.lineTo(i*baseLineLength/(this.secondsPerBuffer*10), this.canvas.height-20);
    //         } else if(i%5 ==0 &&  i%10!=0){ //half od each second
    //             ctx.font = '8px serif';
    //             var value = i/10.0.toFixed(2);
    //             ctx.fillText(value.toString(), i*baseLineLength/(this.secondsPerBuffer*10)-2, this.canvas.height-20+10 )
    //             ctx.moveTo(i*baseLineLength/(this.secondsPerBuffer*10), this.canvas.height-35);
    //             ctx.lineTo(i*baseLineLength/(this.secondsPerBuffer*10), this.canvas.height-20);
    //         } else {   
    //             ctx.moveTo(i*baseLineLength/(this.secondsPerBuffer*10), this.canvas.height-30);
    //             ctx.lineTo(i*baseLineLength/(this.secondsPerBuffer*10), this.canvas.height-20);              
    //         }
    //     }
    //     ctx.stroke(); 
    //     ctx.closePath();
    // }
