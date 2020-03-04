import React from 'react';
import VisualizerBase from '../VisualizerBase';
import Artist from './Artist/artist2';
import STFTHandler from './STFTHandler/STFTHandler';
import AudioFile from './Audio/audioFile';
import Tools from './Tools';


const config = {
    STFT: { 
        window_size: 1024,
        hop_length: 256,
        window_function: 'hann',
        scale: 'log',
    },
    startWAVindex: 0, 
    initialSecondsPerWindow : 10,  
}

class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";

    init() {
        this.audioFile = new AudioFile(this.itemInfo);
        this.STFTRetriever = new STFTHandler(this.audioFile);
        this.artist = new Artist(this, this.STFTRetriever);
        this.config = config;
        this.createInfoWindow();

        this.initialMousePosition = null;
        this.last = null;
        this.dragStart = null;
        this.dragged = false;
        
        this.zoomSwitchPosition = "off";
        // this.scope = window.setTimeout(()=>this.startDrawing(), 5000);
        this.STFTRetriever.waitForAudioHandler()
        .then(()=>{
            this.initialColumnsPerWindow = this.STFTRetriever.getStftColumnFromTime(this.config.initialSecondsPerWindow)
            this.SVGtransformationMatrix = this.svg.createSVGMatrix().scaleNonUniform(1/this.config.initialSecondsPerWindow, 1);  
            // this.startDrawing();
            // clearTimeout(this.scope);
            // this.startDrawing();  
        })
        setTimeout(() => this.startDrawing(), 500);
        // this.startDrawing();
        }

    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('artist' in this) {
            this.artist.adjustSize();
        }
    }

    createInfoWindow() {
        this.infoWindow = document.createElement('div');
        document.getElementById('canvasContainer').appendChild(this.infoWindow);
        this.infoWindow.setAttribute('style', 'left: 1500px; top: 30px; position:absolute; background-color:rgba(0,0,0,0.4); width: 150px');
        const timeParragraph = document.createElement('p');
        const frequencyParragraph = document.createElement('p');
        timeParragraph.setAttribute('id', 'timeInformation');
        timeParragraph.setAttribute('style', 'color: white');
        frequencyParragraph.setAttribute('id', 'frequencyInformation');
        frequencyParragraph.setAttribute('style', 'color: white');
        this.infoWindow.appendChild(timeParragraph);
        this.infoWindow.appendChild(frequencyParragraph);
    }


    startDrawing() {
        this.draw();
        // this.startDrawing();
        setTimeout(() => this.startDrawing(), 200);
    }

    setConfig() {   
        this.STFTRetriever.config = this.config;
    }

    getConfig() {
        //Debe hacer una lectura del estado del toolbox 
        return this.config;
    }

    getEvents() {
        this.getMouseEventPosition = this.getMouseEventPosition.bind(this);   
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.mouseScroll = this.mouseScroll.bind(this);
        return {
            mousedown: this.mouseDown,
            mousemove: this.onMouseMove,
            mouseup: this.mouseUp,
            mousewheel: this.mouseScroll,
        };
    }

    renderToolbar() {
        return (
            <Tools
                id = 'toolbox'
                switchButton = { () => this.zoomActivator()}
                showInfoWindow = {() => this.showInfoWindow()}
                modifyWindowFunction = {(newWindowFunction) => this.modifyWindowFunction(newWindowFunction)}
                modifyHopLength = {(newLength) => this.modifyHopLength(newLength)}
                modifyWindowSize = {(newWindowSize) => this.modifyWindowSize(newWindowSize)} 
                modifyColorMap = {(newColor) => this.modifyColorMap(newColor)} 
                modifyMinFilter = {(newValue) => this.modifyMinFilter(newValue)}
                modifyMaxFilter = {(newValue) => this.modifyMaxFilter(newValue)} />
        );
    }


    SVGmatrixToArray(matrix) {
        let a = matrix.a;
        let b = matrix.b;
        let c = matrix.c;
        let d = matrix.d;
        let e = matrix.e;
        let f = matrix.f;
        var matrixArray = new Float32Array([a,b,0,c,d,0,e,f,1]);
        return matrixArray;
    }

    zoomActivator() {
        switch (this.zoomSwitchPosition) {
            case 'on':
                this.zoomSwitchPosition = 'off'; 
                break
            case 'off':
                this.zoomSwitchPosition = 'on';
                break
        }    
    } 

// ---------------------------------------------------------------------

    draw() { //data Loaded from file with loadFile2 could be reused.
        let glArray = this.SVGmatrixToArray(this.SVGtransformationMatrix);
        let initialTime = this.canvasToPoint(this.createPoint(0,0)).x;
        let finalTime = this.canvasToPoint(this.createPoint(1,0)).x;
        this.artist.draw(initialTime, finalTime, glArray);   

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



    translation(p) { // el punto p deba manejar coordenadas de archivo no de canvas 
                     // p.x marca la traslacion temporal y p.y la frecuencial.
        let matrix = this.SVGtransformationMatrix.translate(p.x,0);
        matrix.f = Math.min(0, matrix.f);
        this.SVGtransformationMatrix = matrix;
        this.draw();
    }   

    

    scaleOnCenter(factor) {
        let center = this.centerFinder();
        let matrix = this.SVGtransformationMatrix.translate(center.x, center.y);
        matrix = matrix.scaleNonUniform(factor.x, factor.y);
        matrix = matrix.translate(-center.x, -center.y)
        this.SVGtransformationMatrix = matrix;
        return this.SVGtransformationMatrix;
    }

    zoomOnPoint(factor, fixedPoint) {
        if ( (factor < 1 && this.SVGtransformationMatrix.a > 1 / 30)
        ||  (factor > 1 && this.SVGtransformationMatrix.a < 30)){
            let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x, fixedPoint.y);
            matrix = matrix.scaleNonUniform(factor, 1);
            matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y);
            this.SVGtransformationMatrix = matrix;         
            // this.draw();  
        }
        // else{
        //     console.log('No more zoom')
        // }
    }

    changeBright(addition) {
        this.config.brightness += addition;
        this.draw();
    }
   
//------------------------------------------------------Events 
    

    getMouseEventPosition(event) { //Posicion relativa al viewPort (rango de -1 a 1 en ambas direcciones)
        let x = event.offsetX || (event.pageX - this.canvas.offsetLeft);
        let y = event.offsetY || (event.pageY - this.canvas.offsetTop);        
        x = x/this.canvas.width;
        y = -1*y/this.canvas.height + 1;
        const point = this.createPoint(x, y);
        return point;
    }

    mouseDown(event){ //Obtiene la posicion inicial para los siguientes eventos.
        this.last = this.getMouseEventPosition(event);
        // console.log('canvas', this.last)
        this.dragStart = this.canvasToPoint(this.last);
        // console.log('tiempo', this.dragStart.x, 'frequencia', this.dragStart.y*24000);
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
        let value = this.canvasToPoint(this.getMouseEventPosition(event));
        document.getElementById('timeInformation').innerHTML = 'Tiempo:    ' +  value.x.toFixed(2).toString() + ' s';
        document.getElementById('frequencyInformation').innerHTML = 'Frecuencia:    ' +   (24000*value.y).toFixed(2).toString() + ' Hz';      
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

    mouseScroll(event) {
        let mousePosition = this.getMouseEventPosition(event);
        let  fixedPoint = this.canvasToPoint(mousePosition);
        let factor = null;
        let dir = event.deltaY;
        if (!dir == 0) {
            (dir < 0) ? factor = 1.04 : factor = 0.96;

            this.zoomOnPoint(factor, fixedPoint);
        }
    }


    showInfoWindow() {
        if (this.infoWindow.style.display === 'block') {
            this.infoWindow.style.display = 'none';
        } else {
            this.infoWindow.style.display = 'block';
        }
    }

    modifyWindowFunction(newWindowFunction) {
        console.log('type2');
        const config = {
            stft: {'window_function' : newWindowFunction},
        }
        this.config.STFT.window_function = newWindowFunction;
        this.STFTRetriever.setConfig(config);
    }

    modifyWindowSize(newWindowSize) {
        console.log('this.startDrawing', this.startDrawing);
        clearTimeout(this.scope),
        this.artist.glHandler.setupTextureCoordinatesBuffer();
        let config= {
                    stft : {'window_size' : newWindowSize},
        }        
        this.config.STFT.window_size = newWindowSize
        this.STFTRetriever.setConfig(config)
        this.startDrawing();
    }

    modifyHopLength(newWindowHop) {
        console.log(this.STFTRetriever.config.stft.hop_length);
        let config = {
            stft: {'hop_length' : newWindowHop},
        };
        this.STFTRetriever.setConfig(config);
        console.log(this.STFTRetriever.config.stft.hop_length);
    }

    modifyColorMap(newColor) {
        console.log(newColor)
        this.artist.glHandler.color = newColor; 
    }

} 

export default Visualizer;