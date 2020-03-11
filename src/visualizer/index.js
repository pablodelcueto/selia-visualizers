import React from 'react';
import VisualizerBase from '../VisualizerBase';
import Artist from './Artist/artist2';
import STFTHandler from './STFTHandler/STFTHandler';
import AudioFile from './Audio/audioFile';
import Reproductor from './Audio/reproductor';
import Tools from './Tools';


const config = {
    STFT: {
        window_size: 1024,
        hop_length: 256,
        window_function: 'hann',
        scale: 'log',
    },
    startWAVindex: 0,
    initialSecondsPerWindow: 10,
};


class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";

    init() {
        this.methods = {
            zoomActivator: this.zoomActivator,
            showInfoWindow: this.showInfoWindow,
            modifyWindowFunction: this.modifyWindowFunction,
            modifyHopLength: this.modifyHopLength,
            modifyWindowSize: this.modifyWindowSize,
            modifyColorMap: this.modifyColorMap,
            modifyMinFilter: this.modifyMinFilter,
            modifyMaxFilter: this.modifyMaxFilter,
        };

        this.audioFile = new AudioFile(this.itemInfo);
        this.audioReproductor = new Reproductor(this.audioFile);
        this.STFTRetriever = new STFTHandler(this.audioFile);
        this.artist = new Artist(this, this.STFTRetriever);
        this.config = config;
        this.createCursorInfoWindow();

        this.initialMousePosition = null;
        this.last = null;
        this.dragStart = null;
        this.dragged = false;
        this.leftBorder = this.createPoint(0, 0);
       
        this.zoomSwitchPosition = 'off';
        this.STFTRetriever.waitForAudioHandler()
            .then(() => {
                this.SVGtransformationMatrix = this.svg.createSVGMatrix().scaleNonUniform(1 / this.config.initialSecondsPerWindow, 1);
                this.startDrawing();
            });
    }

    adjustSize() {
        VisualizerBase.prototype.adjustSize.call(this);

        if ('artist' in this) {
            this.artist.adjustSize();
        }
    }

    createCursorInfoWindow() {
        this.infoWindow = document.createElement('div');
        document.getElementById('canvasContainer').appendChild(this.infoWindow);
        this.infoWindow.setAttribute(
            'style', 
            'left: 1500px; top: 30px; position:absolute; background-color:rgba(0,0,0,0.4); width: 150px'
        );
        const timeParragraph = document.createElement('p');
        const frequencyParragraph = document.createElement('p');
        timeParragraph.setAttribute('id', 'timeInformation');
        timeParragraph.setAttribute('style', 'color: white');
        frequencyParragraph.setAttribute('id', 'frequencyInformation');
        frequencyParragraph.setAttribute('style', 'color: white');
        this.infoWindow.appendChild(timeParragraph);
        this.infoWindow.appendChild(frequencyParragraph);
        this.infoWindow.style.display = 'none';
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
        // Toolbox(this.methods);
        return (
            <Tools
                id="toolbox"
                switchButton={() => this.zoomActivator()}
                showInfoWindow={() => this.showInfoWindow()}
                modifyWindowFunction={
                    (newWindowFunction) => this.modifyWindowFunction(newWindowFunction)
                }
                modifyHopLength={(newLength) => this.modifyHopLength(newLength)}
                modifyWindowSize={(newWindowSize) => this.modifyWindowSize(newWindowSize)}
                modifyColorMap={(newColor) => this.modifyColorMap(newColor)}
                modifyMinFilter={(newValue) => this.modifyMinFilter(newValue)}
                modifyMaxFilter={(newValue) => this.modifyMaxFilter(newValue)}
                reproduce={(time) => this.reproduce(time)} 
                stopReproduction={() => this.stopReproduction()} /> 
        )  
    }


    SVGmatrixToArray() {
        const matrixArray = new Float32Array([
            this.SVGtransformationMatrix.a,
            this.SVGtransformationMatrix.b,
            0,
            this.SVGtransformationMatrix.c,
            this.SVGtransformationMatrix.d,
            0,
            this.SVGtransformationMatrix.e,
            this.SVGtransformationMatrix.f,
            1,
        ]);
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


    draw() {
        const glArray = this.SVGmatrixToArray(this.SVGtransformationMatrix);
        const initialTime = this.canvasToPoint(this.createPoint(0, 0)).x;
        const finalTime = this.canvasToPoint(this.createPoint(1, 0)).x;
        this.artist.draw(initialTime, finalTime, glArray); 
    }


    centerFinder() {
        let center = this.createPoint(0.5, 0.5);
        center = this.canvasToPoint(center);
        return center;
    }

    canvasToPoint(p) {
        const pt = this.createPoint(p.x, p.y);
        return pt.matrixTransform(this.SVGtransformationMatrix.inverse());
    }

    pointToCanvas(p) {
        const pt = this.createPoint(p.x,p.y);
        return pt.matrixTransform(this.SVGtransformationMatrix);
    }


    validatePoints(p) {
        // abstract method
    }

    translation(p) {
        let matrix = this.SVGtransformationMatrix.translate(p.x, p.y);
        this.SVGtransformationMatrix = matrix;
        // this.draw(); 
    }


    scaleOnCenter(factor) {
        const center = this.centerFinder();
        let matrix = this.SVGtransformationMatrix.translate(center.x, center.y);
        matrix = matrix.scaleNonUniform(factor.x, factor.y);
        matrix = matrix.translate(-center.x, -center.y);
        this.SVGtransformationMatrix = matrix;
        return this.SVGtransformationMatrix;
    }

    zoomOnPoint(factor, fixedPoint) {
        if ((factor < 1 && this.SVGtransformationMatrix.a > 1 / 30)
        || (factor > 1 && this.SVGtransformationMatrix.a < 30)) {
            let matrix = this.SVGtransformationMatrix.translate(fixedPoint.x, fixedPoint.y);
            matrix = matrix.scaleNonUniform(factor, 1);
            matrix = matrix.translate(-fixedPoint.x, -fixedPoint.y);
            this.SVGtransformationMatrix = matrix;
        }
    }

    positionTimeInLeftBorder(time) {
        const leftPoint = this.canvasToPoint(this.leftBorder);
        this.translation(this.createPoint(leftPoint.x, 0)); //Avoid translation in y-axis.
        this.translation(this.createPoint(-time, 0));
    } 

    getMouseEventPosition(event) {
        let x = event.offsetX || (event.pageX - this.canvas.offsetLeft);
        let y = event.offsetY || (event.pageY - this.canvas.offsetTop);        
        x = x / this.canvas.width;
        y = -1 * y / this.canvas.height + 1;
        const point = this.createPoint(x, y);
        return point;
    }

    mouseDown(event) { //Obtiene la posicion inicial para los siguientes eventos.
        this.initialClick = this.getMouseEventPosition(event);
        this.last = this.getMouseEventPosition(event);
        this.dragStart = this.canvasToPoint(this.last);
        this.dragged = true;
    }

    onMouseMove(event) {
        if (this.dragged) {
            this.last = this.getMouseEventPosition(event);
            if (this.zoomSwitchPosition === 'off') {
                var pt = this.canvasToPoint(this.last);
                pt.x -= this.dragStart.x;
                // pt.y -= this.dragStart.y;
                pt.y = 0;
                this.translation(pt);
                
                this.draw();
                this.dragStart = this.canvasToPoint(this.last);
            }
        }
        this.fillInfoWindow(event);   
    }

    mouseUp(event) {   
        if (this.dragged === true) {
            this.dragged = false;

            if (this.zoomSwitchPosition === "on") {
                const secondZoomPoint = this.getMouseEventPosition(event);
                this.moveForZoom(this.initialMousePosition,secondZoomPoint);           
            } else {
                const click = this.getMouseEventPosition(event);
                const leftInferiorCorner = this.createPoint()
                //Toma el rectangulo formado entre el valor del mouseDown y el de mouseUp para dibujarlo completo en Canvas
            }
        } else {
            //
        }
    }

    mouseScroll(event) {
        const mousePosition = this.getMouseEventPosition(event);
        const fixedPoint = this.canvasToPoint(mousePosition);
        let factor = null;
        const dir = event.deltaY;
        if (dir !== 0) {
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

    fillInfoWindow(event) {
        const value = this.canvasToPoint(this.getMouseEventPosition(event));
        const time = 'Tiempo en cursor:    ' + value.x.toFixed(2).toString() + ' segundos';
        const frequency = 'Frecuencia en cursor:    ' + (24000*value.y).toFixed(2).toString() + ' Hz';
        document.getElementById('timeInformation').innerHTML = time;
        document.getElementById('frequencyInformation').innerHTML = frequency;         
    }

    modifyWindowFunction(newWindowFunction) {
        const conf = {
            stft: {
                window_function: newWindowFunction,
            },
        };
        this.config.STFT.window_function = newWindowFunction;
        this.STFTRetriever.setConfig(conf);
    }

    modifyWindowSize(newWindowSize) {
        this.artist.glHandler.setupTextureCoordinatesBuffer();
        const conf = {
            stft: {
                window_size: newWindowSize,
            },
        };     
        this.config.STFT.window_size = newWindowSize;
        this.STFTRetriever.setConfig(conf);
    }

    modifyHopLength(newWindowHop) {
        const conf = {
            stft: {
                hop_length: newWindowHop,
            },
        };
        this.STFTRetriever.setConfig(conf);
    }

    modifyColorMap(newColor) {
        this.artist.glHandler.setColor(newColor);
    }

    modifyMinFilter(newValue) {
        this.artist.glHandler.setMinFilter(newValue);
        this.artist.glHandler.setFilters();
    }

    modifyMaxFilter(newValue) {
        this.artist.glHandler.setMaxFilter(newValue);
        this.artist.glHandler.setFilters();
    }

    modifyReproductionTime(normalizedTime) {
        return this.normalizedToRealTime(normalizedTime);
    }

    animatedMotion(time) {
        this.positionTimeInLeftBorder(time);
        time = time + 0.1;
        this.timeoutId = setTimeout(() => this.animatedMotion(time), 100);
    }

    reproduce(time) { //    time is normalized so it should be multiplied by audio duration.
        // this.reproductionTime = this.normalizedToRealTime(time);
        this.reproductionTime = time;
        console.log('primer tiempo', Date.now());
        this.audioReproductor.readAndReproduce(this.reproductionTime, () => this.animatedMotion(this.reproductionTime));
            // .then(() => {
            //     this.animatedMotion(this.reproductionTime);
            // });
        // this.animatedMotion(this.reproductionTime);
        // this.animatedMotion(this.reproductionTime)
    }

    stopReproduction() {
        this.audioReproductor.stop();
        clearTimeout(this.timeoutId);
    }

    normalizedToRealTime(time) {
        return time * this.audioFile.mediaInfo.durationTime;
    }

}

export default Visualizer;
