import {RANGE_AMPLITUDE} from './Artist/artist' 
// const RANGE_AMPLITUDE = 10;

import React from 'react';
import VisualizerBase from '../VisualizerBase';
import Artist from './Artist/artist'
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
        this.artist = new Artist(this.STFTRetriever);
        this.config=config;

        this.initialMousePosition = null;
        this.last = null;
        this.dragStart = null;
        this.dragged = false;
        
        this.zoomSwitchPosition = "off";
        this.SVGtransformationMatrix = this.svg.createSVGMatrix();
        // this.SVGtransformationMatrix = this.svg.createSVGMatrix().translate(-1,0);
        // this.glMatrix = this.SVGtransformationMatrix.translate(1,0); // must use RANGE_AMPLITUDE in the general case.
        // this.base = document.getElementById("barraBase");

        setTimeout(() => this.startDrawing(), 500);
    }

    adjustSize(){
        VisualizerBase.prototype.adjustSize.call(this);

        if ('artist' in this){
            this.artist.adjustSizes();
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
        // this.glMatrix = this.SVGtransformationMatrix.translate(-1,0); // must use RANGE_AMPLITUDE in the general case.
        this.glMatrix = this.SVGtransformationMatrix.translate(0,0);
        let presicion = this.computeTimePresicion(this.SVGtransformationMatrix.a); // Depends on time coordinate expantion.
        // let initialPixelWithLine = this.pointToCanvas(this.createPoint(-1,0))
        let initialCanvasPoint = this.canvasToPoint(this.createPoint(-1,0)); //QUEDO
        this.artist.initialCanvasTime = this.pointToTime(initialCanvasPoint);

        let initialCanvasTime = parseFloat(this.artist.initialCanvasTime.toFixed(presicion))
        
        // console.log('initialTime', initialCanvasTime);
        let glArray = this.SVGmatrixToArray(this.glMatrix);
        this.artist.draw(initialCanvasTime, glArray);
        this.glMatrix[6] = glArray[6] // this is in case the artist makes a shift and adaps transformationMatrix

        this.SVGtransformationMatrix = this.glMatrix;        
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


    validatePoints(p){ 
        // abstract method
    }

//--------------------------------------------------------Movements
    computeTimePresicion(){
        return 6;
    }

    scale(x, y) {
        let matrix = this.SVGtransformationMatrix.scaleNonUniform(x, y);
            (matrix.a<1) ? matrix.a = 1 : matrix.a ; 
            (matrix.d<1) ? matrix.d = 1 : matrix.d ; 

        this.SVGtransformationMatrix = matrix;
        this.draw(null);
    }

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
        console.log('fixed point', fixedPoint);
        let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x,fixedPoint.y);
        console.log('zoom matrix', matrix)
        matrix = matrix.scaleNonUniform(factor, 1);
        matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y)
        if ((factor < 1 && this.SVGtransformationMatrix.a > 1/4)
         || (factor >1 && this.SVGtransformationMatrix.a < 4)){
            this.SVGtransformationMatrix = matrix;           
            this.draw();            
        }
    }

    changeBright(addition){
        this.config.brightness += addition;
        this.draw();
    }
   

    

    


    rectangleZoom(firstPoint, secondPoint){
        let newInitialColumn = Math.min(firstPoint.x, secondPoint.x);
        let newLastColumn = Math.max(firstPoint.x, secondPoint.x);
        let columnRange = newLastColumn- newInitialColumn;
        let newInitialFrequency = Math.min(firstPoint.y, secondPoint.y);
        let newLastFrequency = Math.max(firstPoint.y, secondPoint.y);
        let frequencyRange = newLastFrequency-newInitialFrequency;
        // this.translation(-newInitialColumn,-newInitialFrequency);
        this.scale(2,1);
    }

//------------------------------------------------------Events 
    

    getMouseEventPosition(event) { //Posicion relativa al viewPort (rango de -1 a 1 en ambas direcciones)
        let x = event.offsetX || (event.pageX - this.canvas.offsetLeft);
        let y = event.offsetY || (event.pageY - this.canvas.offsetTop);        
        x = 2*x/this.canvas.width-1; 
        y = -2*y/this.canvas.height+1;
        let point = this.createPoint(x,y);
        return point;
    }

    mouseDown(event){ //Obtiene la posicion inicial para los siguientes eventos.
        this.last = this.getMouseEventPosition(event);
        console.log('canvas point', this.last)
        this.dragStart = this.canvasToPoint(this.last);
        console.log('column range point', this.dragStart);
        let tiempo = this.pointToTime(this.dragStart);
        console.log('tiemp', tiempo);
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
        console.log('fixedPoint', fixedPoint)
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