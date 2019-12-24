import React from 'react';
import VisualizerBase from '../VisualizerBase';

// import {AudioObj} from './Audio';
import {canvasSetup} from './Graphics';
import {loadFFTArray, changesWithoutLoadingBuffers, newPictureSetup, drawCompleteFile} from './Init';
import Tools from './Tools';


let array = [1,2,3,4,4,5,6,3,5,6];

class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";
    init(){
        this.config=newPictureSetup;
        this.gl = canvasSetup('visualizerCanvas');
        this.initialMousePosition = null;

        this.last = null;
        this.dragStart = null;
        this.dragged = false;
        
        this.zoomSwitchPosition = "off";
        this.transformationMatrix = this.svg.createSVGMatrix();
        this.viewportMatrix = this.setViewportMatrix();
        this.config.transformationMatrix = this.setTransform(this.viewportMatrix);
    }

    resetViewport() {
        this.gl.viewport(0,0, this.canvas.width, this.canvas.height);
    }

    setConfig(){   
        console.log({newPictureSetup});
        console.log(this.config)
        // newPictureSetup = this.config;
    }
    getConfig(){
        //Debe hacer una lectura del estado del toolbox 
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
 
    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('gl' in this) {
            this.resetViewport();
        }
    }

    setTransform(matrix){
        // let matrix = this.transformationMatrix.multiply(this.viewportMatrix);
        // let matrix = this.viewportMatrix.multiply(this.transformationMatrix)
        let a= matrix.a;
        let b= matrix.b;
        let c= matrix.c;
        let d= matrix.d;
        let e= matrix.e;
        let f= matrix.f;
        var matrixArray = new Float32Array([a,b,0,c,d,0,e,f,1]);
        return matrixArray;
    }

    setViewportMatrix(){
        return this.svg.createSVGMatrix()
                   .translate(-1,-1)
                   .scaleNonUniform(2/newPictureSetup.columnsInCanvas,2/newPictureSetup.linesInCanvas);
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

    draw() {
        this.config.resultLength = newPictureSetup.resultLength;
        loadFFTArray(this.itemInfo, this.config);
    }

    redraw (reloadBuffers) { //data Loaded from file with loadFile2 could be reused.
        let matrix = this.viewportMatrix.multiply(this.transformationMatrix);
        // let matrix = this.transformationMatrix.multiply(this.viewportMatrix);
        this.config.transformationMatrix=this.setTransform(matrix);
        if (reloadBuffers){
            loadFFTArray(this.itemInfo, this.config)
        }
        else{
            changesWithoutLoadingBuffers(this.config);
        }
    }

    
// -------------------------------------------------------------------- Info gathering

    centerFinder(){
        let center = this.createPoint(0,0);
        center = this.canvasToPoint(center);
        return center;
    }

    canvasToPoint(p){
        var pt = this.createPoint(p.x,p.y)
        return pt.matrixTransform(this.viewportMatrix.multiply(this.transformationMatrix).inverse());
    }

    pointToCanvas(p){
        var pt = this.createPoint(p.x,p.y);
        return pt.matrixTransform(this.viewportMatrix.multiply(this.transformationMatrix));
    }
   
    validatePoints(p){
        // abstract method
    }

//--------------------------------------------------------Movements
    scale(x, y) {
        let matrix = this.transformationMatrix.scaleNonUniform(x, y);
            (matrix.a<1) ? matrix.a = 1 : matrix.a ; 
            (matrix.d<1) ? matrix.d = 1 : matrix.d ; 

        this.transformationMatrix = matrix;
        this.redraw(false);
    }

    translation(p) { // el punto p deba manejar coordenadas de archivo no de canvas 
                     // p.x marca la traslacion temporal y p.y la frecuencial.
        let matrix = this.transformationMatrix.translate(p.x,p.y);
        if (matrix.f<this.config.linesInCanvas-matrix.d*this.config.numberOfFrequencies){
            matrix = this.transformationMatrix.translate(p.x,0);
        }
        // matrix.e = Math.min(0, matrix.e);
        matrix.f = Math.min(0, matrix.f);
        (matrix.f<this.config.linesInCanvas-matrix.d*this.config.numberOfFrequencies) ? 
                        matrix.f = this.transformationMatrix.f : matrix.f ;
        // (matrix.e<this.config.columnsInCanvas-matrix.a*this.config.resultLength) ? 
        //                 matrix.e = this.transformationMatrix.e : matrix.e ;
        this.transformationMatrix = matrix;
        this.redraw(false);
    }



    

    

    scaleOnCenter(factor){
        let center = this.centerFinder(); 
        let matrix = this.transformationMatrix.translate(center.x,center.y);
        matrix = matrix.scaleNonUniform(factor.x, factor.y);
        matrix = matrix.translate(-center.x, -center.y)
        this.transformationMatrix = matrix;
        return this.transformationMatrix;
    }

    zoomOnPoint(factor, fixedPoint){
        let fixedPoint2 = this.canvasToPoint(fixedPoint);
        let matrix = this.transformationMatrix.translate(fixedPoint2.x,fixedPoint2.y);
        matrix = matrix.scaleNonUniform(factor, 1);
        matrix = matrix.translate(-fixedPoint2.x, -fixedPoint2.y)
        this.transformationMatrix = matrix;
        this.redraw(false);
    }

    changeBright(addition){
        this.config.brightness += addition;
        this.redraw(false);
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
        console.log(this.canvasToPoint(this.last));
        this.dragStart = this.canvasToPoint(this.last);
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
                this.redraw(false);
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
        let factor = null;
        let dir = event.deltaY; 
        if (!dir == 0){
            (dir <0 ) ? factor = 1.1 : factor = .9;
            this.zoomOnPoint(factor, mousePosition);
        }
    }

    windowSizeModification(size){
        let factor = this.config.windowSize/size;
        let factorsToAdaptTransfMatrix = this.createPoint(1/factor,factor);
        // this.transformationMatrix = this.transformationMatrix.scaleNonUniform(1/factor,factor); 
        this.transformationMatrix = this.scaleOnCenter(factorsToAdaptTransfMatrix)
        // console.log(this.transformationMatrix);
        this.config.numberOfFrequencies = this.config.numberOfFrequencies*(1/factor);
        this.config.resultLength = this.config.resultLength*factor;
        this.config.windowSize=size;
        this.redraw(true);
    }
} 

export default Visualizer;