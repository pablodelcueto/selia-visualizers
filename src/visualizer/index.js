import {RANGE_AMPLITUDE} from './Artist/artist' 
// const RANGE_AMPLITUDE = 10;

import React from 'react';
import VisualizerBase from '../VisualizerBase';
import Artist from './Artist/artist2'
import STFTHandler from './STFTHandler/STFTHandler';
import AudioFile from './Audio/audioFile';
import Tools from './Tools';


var config = {
    STFT: { 
        window_size: 1024,
        hop_length: 256,
        window_function: 'hann',
      },
      startWAVindex: 0,   
}

class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";

    init(){
        this.audioFile = new AudioFile(this.itemInfo);
        this.STFTRetriever = new STFTHandler(this.audioFile);
        this.artist = new Artist(this, this.STFTRetriever);
        this.config=config;

        this.initialMousePosition = null;
        this.last = null;
        this.dragStart = null;
        this.dragged = false;
        
        this.zoomSwitchPosition = "off";
        this.SVGtransformationMatrix = this.svg.createSVGMatrix().scaleNonUniform(1/2, 1);
        this.glMatrix = this.svg.createSVGMatrix().scaleNonUniform(2,1).translate(-1,0);
        // this.SVGtransformationMatrix = this.svg.createSVGMatrix().translate(-1,0);
        // this.glMatrix = this.SVGtransformationMatrix.translate(1,0); // must use RANGE_AMPLITUDE in the general case.
        // this.base = document.getElementById("barraBase");

        setTimeout(() => this.startDrawing(), 500);
    }

    adjustSize(){
        VisualizerBase.prototype.adjustSize.call(this);

        if ('artist' in this){
            this.artist.adjustSize();
        }
    }

    startDrawing() {
        this.draw();
        setTimeout(() => this.startDrawing(), 200);
    }

    setConfig(){   

    }
    getConfig(){
        //Debe hacer una lectura del estado del toolbox 
        return this.config;
    }

    getEvents() {
        this.getMouseEventPosition = this.getMouseEventPosition.bind(this);    
        this.mouseDown = this.mouseDown.bind(this);    
        this.mouseUp = this.mouseUp.bind(this);
        this.onMouseMove =this.onMouseMove.bind(this);
        this.mouseScroll = this.mouseScroll.bind(this);
        return {"mousedown": this.mouseDown,
                "mousemove": this.onMouseMove,
                "mouseup": this.mouseUp, 
                "mousewheel": this.mouseScroll,
            };
    }

    renderToolbar(){
        return <Tools id="toolbox" switchButton ={() => this.zoomActivator()}
                                   increaseBrightness = {() => this.changeBright(-5)}
                                   decreaseBrightness = {() => this.changeBright(5)}
                                   windowSize = {(size) => this.windowSizeModification(size)} />
    }


    SVGmatrixToArray(matrix){
        let a= matrix.a;
        let b= matrix.b;
        let c= matrix.c;
        let d= matrix.d;
        let e= matrix.e;
        let f= matrix.f;
        var matrixArray = new Float32Array([a,b,0,c,d,0,e,f,1]);
        return matrixArray;
    }

    zoomActivator(){
        switch (this.zoomSwitchPosition){
            case "on":
                this.zoomSwitchPosition = "off"; 
                break
            case "off":
                this.zoomSwitchPosition = "on";
                break
        }    
    } 

// ---------------------------------------------------------------------

    draw() { //data Loaded from file with loadFile2 could be reused.
        // this.computeBordersTime()
        let glArray = this.SVGmatrixToArray(this.SVGtransformationMatrix);
        let initialTime = this.canvasToPoint(this.createPoint(0,1));
        let finalTime = this.canvasToPoint(this.createPoint(1,0));
        this.artist.draw(initialTime.x, finalTime.x, glArray);   // artist2
        // this.artist.draw(glArray) //artist    

    }

    
// -------------------------------------------------------------------- Info gathering

    centerFinder(){
        let center = this.createPoint(0,0);
        center = this.canvasToPoint(center);
        return center;
    }

    canvasToPoint(p){ //takes into acount how the canvas has been moved by the transformation.
        var pt = this.createPoint(p.x,p.y)
        return pt.matrixTransform(this.SVGtransformationMatrix.inverse());
    }

    pointToCanvas(p){ 
        var pt = this.createPoint(p.x,p.y);
        return pt.matrixTransform(this.SVGtransformationMatrix);
    }
   
    pointToTime(point){
        let tiempo = (point.x)/(RANGE_AMPLITUDE)*this.artist.GLbuffer.secondsInBuffer; //+1 porque init comienza en -1 por el viewport
        return tiempo
    }

    timeToPoint(time){
        let point = this.createPoint(time/this.artist.GLbuffer.secondsInBuffer*RANGE_AMPLITUDE,0);
        return point
    }


    validatePoints(p){ 
        // abstract method
    }

//--------------------------------------------------------Movements

    // computeBordersTime(){
    //     let this.artist.axisHandler.presicion = this.computeTimePresicion(this.SVGtransformationMatrix.a); // Depends on time coordinate expantion.

    //     let initialCanvasPoint = this.canvasToPoint(this.createPoint(0,0)); 
    //     let borderTime = this.pointToTime(initialCanvasPoint);
    //     // let adaptedTimeToPresicion = Math.floor(borderTime);
    //     let adaptedTimeToPresicion = Math.floor(borderTime*(10**presicion))/(10**presicion);
    //     // let adaptedTimeToPresicion = borderTime.toFixed(presicion);
    //     let adaptedPoint = this.timeToPoint(Number(adaptedTimeToPresicion));
    //     this.artist.initPosition = this.pointToCanvas(adaptedPoint);
    //     this.artist.outsideCanvasLeftTime = this.pointToTime(adaptedPoint);



    //     let finalCanvasPoint = this.canvasToPoint(this.createPoint(1,0));
    //     let rigthBorderTime = this.pointToTime(finalCanvasPoint);
    //     // let adaptedRigthTimeToPresicion = Math.ceil(rigthBorderTime);
    //     let adaptedRigthTimeToPresicion = Math.ceil(rigthBorderTime*(10**presicion))/(10**presicion);
    //     // let adaptedRigthTimeToPresicion = rigthBorderTime.toFixed(presicion);
    //     let adaptedRigthPoint = this.timeToPoint(Number(adaptedRigthTimeToPresicion));
    //     this.artist.finalPosition = this.pointToCanvas(adaptedRigthPoint);
    //     this.artist.outsideCanvasRigthTime = this.pointToTime(adaptedRigthPoint);
    //     // console.log('time on final position', adaptedRigthTimeToPresicion)
    // }

    // computeNumberOfTicks(){
    //     let presicion = this.computeTimePresicion(this.SVGtransformationMatrix.a);
    //     console.log('presicion', presicion);
    //     return (this.artist.outsideCanvasRigthTime-this.artist.outsideCanvasLeftTime)*10**presicion;
    // }


    // computeTimePresicion(factor){
    //     if (factor <= 1 ){
    //         return 0    
    //     }
    //     else if ( 1 <= factor < 2){
    //         return 1
    //     }
    //     else if ( 2 <= factor <= 5){
    //         return 2
    //     }
    // }


    translation(p) { // el punto p deba manejar coordenadas de archivo no de canvas 
                     // p.x marca la traslacion temporal y p.y la frecuencial.
        let matrix = this.SVGtransformationMatrix.translate(p.x,0);
        matrix.f = Math.min(0, matrix.f);
        this.SVGtransformationMatrix = matrix;
        this.draw();
    }   

    

    scaleOnCenter(factor){
        let center = this.centerFinder(); 
        let matrix = this.SVGtransformationMatrix.translate(center.x,center.y);
        matrix = matrix.scaleNonUniform(factor.x, factor.y);
        matrix = matrix.translate(-center.x, -center.y)
        this.SVGtransformationMatrix = matrix;
        return this.SVGtransformationMatrix;
    }

    zoomOnPoint(factor, fixedPoint){
        if ((factor < 1 && this.SVGtransformationMatrix.a > 1/4)
        || (factor >1 && this.SVGtransformationMatrix.a < 5)){
            let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x,fixedPoint.y);
            matrix = matrix.scaleNonUniform(factor, 1);
            matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y);
            this.SVGtransformationMatrix = matrix;           
            this.draw();            
        }
    }

    changeBright(addition){
        this.config.brightness += addition;
        this.draw();
    }
   
//------------------------------------------------------Events 
    

    getMouseEventPosition(event) { //Posicion relativa al viewPort (rango de -1 a 1 en ambas direcciones)
        let x = event.offsetX || (event.pageX - this.canvas.offsetLeft);
        let y = event.offsetY || (event.pageY - this.canvas.offsetTop);        
        x = x/this.canvas.width; 
        y = -1*y/this.canvas.height+1;
        
        // x = 2*x/this.canvas.width-1; 
        // y = -1*y/this.canvas.height+1;
        let point = this.createPoint(x,y);
        return point;
    }

    mouseDown(event){ //Obtiene la posicion inicial para los siguientes eventos.
        this.last = this.getMouseEventPosition(event);
        this.dragStart = this.canvasToPoint(this.last);
        // let tiempo = this.pointToTime(this.dragStart);
        this.dragged = true;
    }

    onMouseMove(event) {
        if (this.dragged){
            this.last = this.getMouseEventPosition(event);
            if (!(this.zoomSwitchPosition === "on")){
                var pt = this.canvasToPoint(this.last);
                pt.x -= this.dragStart.x;
                pt.y -= this.dragStart.y;
                this.translation(pt);
                this.draw();
                this.dragStart = this.canvasToPoint(this.last);
            }
        }
    }

            
    mouseUp(event) {    
        if (this.dragged===true){
            this.dragged=false;

            if (this.zoomSwitchPosition==="on"){ 
                let secondZoomPoint = this.getMouseEventPosition(event);
                console.log(this.initialMousePosition, secondZoomPoint);
                //Las instrucciones por si está en zoom mode.
                this.moveForZoom(this.initialMousePosition,secondZoomPoint);
                        
            }
            else{
                //Aquí no debe ir nada. 
            }
        }
        else{
            //Aquí no debe ir nada.
        }
    }

    mouseScroll(event){
        let mousePosition = this.getMouseEventPosition(event);
        let fixedPoint = this.canvasToPoint(mousePosition)
        let factor = null;
        let dir = event.deltaY; 
        if (!dir == 0){
            (dir <0 ) ? factor = 1.1 : factor = .9;
            this.zoomOnPoint(factor, fixedPoint);
        }
    }

    windowSizeModification(size){
        let factor = this.config.windowSize/size;
        let factorsToAdaptTransfMatrix = this.createPoint(1/factor,factor);
        // this.SVGtransformationMatrix = this.SVGtransformationMatrix.scaleNonUniform(1/factor,factor); 
        this.SVGtransformationMatrix = this.scaleOnCenter(factorsToAdaptTransfMatrix)
        // console.log(this.SVGtransformationMatrix);
        this.config.numberOfFrequencies = this.config.numberOfFrequencies*(1/factor);
        this.config.resultLength = this.config.resultLength*factor;
        this.config.windowSize=size;
        this.draw();
    }
} 

export default Visualizer;