import React from 'react';
import VisualizerBase from '@selia/visualizer';

// import {AudioObj} from './Audio';
import {canvasSetup} from './Graphics';
import {loadFFTArray, changesApplication, newPictureSetup, drawCompleteFile} from './Init';
import Tools from './Tools';
import AudioFile from './Audio/audioFile';

class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";


    init() {
      this.config=newPictureSetup;
      this.gl = canvasSetup('visualizerCanvas');
      this.initialMousePosition = null;

      this.last = null;
      this.dragStart = null;
      this.dragged = false;

      this.zoomSwitchPosition = "off";
      this.transformationMatrix = this.svg.createSVGMatrix().scaleNonUniform(1,1);
      this.viewportMatrix = this.svg.createSVGMatrix()
        .translate(-1,-1)
        .scaleNonUniform(
          2/newPictureSetup.resultLength,
          2/newPictureSetup.numberOfFrequencies);
    }

    resetViewport() {
        this.gl.viewport(0,0, this.canvas.width, this.canvas.height);
    }

    getConfig(){
        //Debe hacer una lectura del estado del toolbox
    }

    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('gl' in this) {
            this.resetViewport();
        }
    }

    draw() {
        // this.config.transformationMatrix = this.setTransform(this.transformationMatrix);
        loadFFTArray(this.itemInfo, this.config);
    }

    redraw () {
        this.config.transformationMatrix=this.setTransform(this.transformationMatrix);
        changesApplication(this.config);
    }

    setTransform(){
        // let matrix = this.transformationMatrix.multiply(this.viewportMatrix);
        let matrix = this.viewportMatrix.multiply(this.transformationMatrix)
        let a= matrix.a;
        let b= matrix.b;
        let c= matrix.c;
        let d= matrix.d;
        let e= matrix.e;
        let f= matrix.f;
        var matrixArray = new Float32Array([a,b,0,c,d,0,e,f,1]);
        return matrixArray;
    }

    centerFinder(setup){
        let center = this.createPoint(setup.columnsInCanvas/2,setup.linesInCanvas/2);
        center.x = center.x - this.transformationMatrix.e;
        center.y = center.y - this.transformationMatrix.f;
        return center;
    }

    scale(x, y) {
        let matrix = this.transformationMatrix.scaleNonUniform(x, y);
        if (matrix.a<1){
            x = 1;
        }
        if (matrix.d<1){
            y=1;
        }
        this.transformationMatrix = this.transformationMatrix.scaleNonUniform(x, y);
        this.redraw();
    }

    translation(p) { // el punto p deba manejar coordenadas de archivo no de canvas
        let matrix = this.transformationMatrix.translate(p.x,p.y);
        (matrix.e > 0) ? matrix.e = 0 : matrix.e ;
        (matrix.e<this.config.columnsInCanvas-matrix.a*this.config.resultLength) ?
                        matrix.e = this.transformationMatrix.e : matrix.e ;

        (matrix.f > 0) ? matrix.f = 0 : matrix.f ;
        (matrix.f<this.config.linesInCanvas-matrix.d*this.config.numberOfFrequencies) ?
                        matrix.f = this.transformationMatrix.f : matrix.f ;

        this.transformationMatrix = matrix;
        console.log('matriz de transformacion', matrix);
        this.redraw()
    }

    setConfig(){
    }

    getEvents() {
        this.getMouseEventPosition = this.getMouseEventPosition.bind(this);
        this.ratonPulsado = this.ratonPulsado.bind(this);
        this.ratonMovido = this.ratonMovido.bind(this);
        this.ratonSoltado = this.ratonSoltado.bind(this);
        // this.onMouseMoveWithoutZoom =this.onMouseMoveWithoutZoom(this);
        // this.mouseScroll = this.mouseScroll.bind(this);
        return {"mousedown": this.ratonPulsado,
                "mousemove": this.ratonMovido,
                "mouseup": this.ratonSoltado,
                // "mouseMoviendo": this.onMouseMove,
                // "mousewheel": this.mouseScroll
            };
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

    // zoomByScrolling(factor, fixedPoint){
    //     let newTotalLength =Math.min(this.config.resultLength-2, this.config.canvasColumns*factor);
    //     let newLeftColumn =Math.min(this.config.resultLength-newTotalLength,
    //                                 fixedPoint.x*(1-factor)+this.config.initialColumn
    //                                 );
    //     // let newRightColumn = fixedPoint.x*(1-factor) + this.config.canvasColumns;
    //     this.setConfig({initialColumn:Math.round(newLeftColumn),
    //                     canvasColumns: Math.round(newTotalLength)},false, true);
    // }

    changeBright(addition){
        this.config.brightness += addition;
        this.redraw();
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

    renderToolbar(){
        return <Tools id="toolbox" switchButton ={() => this.zoomActivator()}
                                   moveRight={()=>this.translation(this.createPoint(-10,0))}
                                   moveLeft = {() => this.translation(this.createPoint(10,0))}
                                   zoomIn = {()=> this.scale(1.1,1)}
                                   zoomOut = { ()=> this.scale(1/1.1,1)}
                                   increaseBrightness = {() => this.changeBright(-5)}
                                   decreaseBrightness = {() => this.changeBright(5)} />
    }


    moveForZoom(firstPoint, secondPoint){
        let newInitialColumn = Math.min(firstPoint.x, secondPoint.x);
        let newLastColumn = Math.max(firstPoint.x, secondPoint.x);
        let columnRange = newLastColumn- newInitialColumn;
        let newInitialFrequency = Math.min(firstPoint.y, secondPoint.y);
        let newLastFrequency = Math.max(firstPoint.y, secondPoint.y);
        let frequencyRange = newLastFrequency-newInitialFrequency;
        // this.translation(-newInitialColumn,-newInitialFrequency);
        this.scale(2,1);
    }

    getMouseEventPosition(event) { //Posicion relativa al viewPort (rango de -1 a 1 en ambas direcciones)
        let x = event.offsetX || (event.pageX - this.canvas.offsetLeft);
        let y = event.offsetY || (event.pageY - this.canvas.offsetTop);
        x = 2*x/this.canvas.width-1;
        y = -2*y/this.canvas.height+1;
        let point = this.createPoint(x,y);
        return point;
    }

    // moveWithMouse(event){
    //     var actualPoint = this.getMouseEventPosition(event);
    //     var xActual = actualPoint.x;
    //     var yActual = actualPoint.y;
    //     let xInic = this.initialMousePosition.x;
    //     let yInic = this.initialMousePosition.y;

    //     let xInc = xActual-xInic;
    //     let yInc = yActual-yInic;
    //     this.translation(this.createPoint(-xInc,yInc));
    //     this.initialMousePosition = actualPoint;
    // }

    ratonPulsado(event){ //Obtiene la posicion inicial para los siguientes eventos.
        this.last = this.getMouseEventPosition(event);
        console.log('lat en raton pulsado', this.last);
        this.dragStart = this.canvasToPoint(this.last);
        this.dragged = true;
    }

    onMouseMoveWithoutZoom(event) {
        this.last = this.getMouseEventPosition(event);

        if (this.dragStart) {
            var pt = this.canvasToPoint(this.last);
            pt.x -= this.dragStart.x;
            pt.y -= this.dragStart.y;
            console.log(pt);
            this.translation(pt);
            this.dragStart = pt;
            this.redraw();
        }
    }







    ratonMovido(event) {
        console.log(this.dragged);
        if (this.dragged){
            this.last = this.getMouseEventPosition;
            if (!this.zoomSwitchPosition==="on"){
                this.onMouseMoveWithoutZoom(event);
            }
            else{}//las instrucciones para cuando esta en modo zoom, no debe ir nada.
        }
        else{}//No hará nada si no se ha clickeado el mouse
    }


    ratonSoltado(event) {
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

    // mouseScroll(event){
    //     let dir = event.deltaY;
    //     console.log(dir);
    //     let fixedPoint = this.getMouseEventPosition(event);
    //     // this.zoomByScrolling(20/21,fixedPoint);
    //     if (!dir == 0){
    //     // console.log('la direccion de scroll es negativa', dir<0);
    //         let factor = (dir > 0) ? 55/57 : 57/55;
    //         console.log('factor', factor);
    //         if (factor<0 &&
    //             (this.canvas.initialColumn==0 ||
    //              this.config.resultLength - this.config.initialTime> this.config.canvasColumns)){

    //         }
    //         else{
    //             this.zoomByScrolling(factor, fixedPoint);
    //         }
    //     }
    // }
}

export default Visualizer;
