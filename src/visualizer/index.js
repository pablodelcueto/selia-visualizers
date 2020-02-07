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
        this.SVGtransformationMatrix = this.svg.createSVGMatrix().translate(1, 0).scaleNonUniform(0.2, 1);
        this.arrayTransformationMatrix = null;

        setTimeout(() => this.startDrawing(), 5);
    }

    startDrawing() {
        this.draw();

        setTimeout(() => this.startDrawing(), 100);
    }

    resetViewport() {
        this.gl.viewport(0,0, this.canvas.width, this.canvas.height);
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
 
    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('gl' in this) {
            this.resetViewport();
        }
    }

    SVGmatrixToArray(matrix){
        // let matrix = this.SVGtransformationMatrix.multiply(this.viewportMatrix);
        // let matrix = this.viewportMatrix.multiply(this.SVGtransformationMatrix)
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
        this.arrayTransformationMatrix=this.SVGmatrixToArray(this.SVGtransformationMatrix);
        this.artist.draw(this.arrayTransformationMatrix);
    }

    
// -------------------------------------------------------------------- Info gathering

    centerFinder(){
        let center = this.createPoint(0,0);
        center = this.canvasToPoint(center);
        return center;
    }

    canvasToPoint(p){
        var pt = this.createPoint(p.x,p.y)
        return pt.matrixTransform(this.SVGtransformationMatrix.inverse());
    }

    pointToCanvas(p){
        var pt = this.createPoint(p.x,p.y);
        return pt.matrixTransform(this.SVGtransformationMatrix);
    }
   
    validatePoints(p){
        // abstract method
    }

//--------------------------------------------------------Movements
    scale(x, y) {
        console.log('scaling');
        let matrix = this.SVGtransformationMatrix.scaleNonUniform(x, y);
            (matrix.a<1) ? matrix.a = 1 : matrix.a ; 
            (matrix.d<1) ? matrix.d = 1 : matrix.d ; 

        this.SVGtransformationMatrix = matrix;
        this.draw();
    }

    translation(p) { // el punto p deba manejar coordenadas de archivo no de canvas 
                     // p.x marca la traslacion temporal y p.y la frecuencial.
        let matrix = this.SVGtransformationMatrix.translate(p.x,0);
        if (matrix.f<this.config.linesInCanvas-matrix.d*this.config.numberOfFrequencies){
            matrix = this.SVGtransformationMatrix.translate(p.x,0);
        }
        // matrix.e = Math.min(0, matrix.e);
        matrix.f = Math.min(0, matrix.f);
        (matrix.f<this.config.linesInCanvas-matrix.d*this.config.numberOfFrequencies) ? 
                        matrix.f = this.SVGtransformationMatrix.f : matrix.f ;
        // (matrix.e<this.config.columnsInCanvas-matrix.a*this.config.resultLength) ? 
        //                 matrix.e = this.SVGtransformationMatrix.e : matrix.e ;
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
        console.log('scaling with factor', factor);
        let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x,fixedPoint.y);
        matrix = matrix.scaleNonUniform(factor, 1);
        matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y)
        console.log('scaling on matrix', matrix);
        if ((factor < 1 && this.SVGtransformationMatrix.a > 1/5)
         || (factor >1 && this.SVGtransformationMatrix.a < 5)){
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