import React from 'react';
import VisualizerBase from '../VisualizerBase';

// import {AudioObj} from './Audio';
import {canvasSetup} from './Graphics';
import {loadFFTArray, drawWithoutAdjustingIndex, drawAdjustingIndex, newPictureSetup} from './Init';
import Tools from './Tools';

class Visualizer extends VisualizerBase {
    // name = "Spectrum visualizer";
    // version = "1.0";
    // description = "long story";
    // configuration_schema = "longer story";


    init(){
        this.config=newPictureSetup;
        canvasSetup('visualizerCanvas');
        this.initialMousePosition = null;
        this.zoomSwitchPosition = "off"
        loadFFTArray(); //start processing and drawing file in localhost:3000/download
    }

    getConfig(){
        //Debe hacer una lectura del estado del toolbox 
    }
    
    setConfig(newValue,FFTnewComputationRequired, indexLoadRequired){
        if (newValue.initialColumn<0){
            newValue.initialColumn = 0;
        }

        else if(newValue.initialColumn>newPictureSetup.resultLength - newPictureSetup.canvasColumns){
            newValue.initialColumn = Math.round(newPictureSetup.resultLength - newPictureSetup.canvasColumns);
        }

        Object.assign(this.config,newValue);
        Object.assign(newPictureSetup, this.config);
        this.draw(FFTnewComputationRequired, indexLoadRequired);   
    }

    getEvents() {
        this.getMouseEventPosition = this.getMouseEventPosition.bind(this);    
        this.ratonPulsado = this.ratonPulsado.bind(this);
        this.ratonMovido = this.ratonMovido.bind(this);
        this.ratonSoltado = this.ratonSoltado.bind(this);
        this.mouseScroll = this.mouseScroll.bind(this);
        return {"mousedown": this.ratonPulsado,
                "mousemove": this.ratonMovido,
                "mouseup": this.ratonSoltado,
                "mousewheel": this.mouseScroll};
    }
       

    changeFFTWindowSize(){
        let toolsconfig = getconfig();
        if (toolsconfig.windowSize!==this.config.windowSize){
            setconfig({windowSize:toolsconfig.windowSize}, true);
            LoadFFTArray();
        }
        else{
            return
        }
    }

    move(offset_x,offset_y){
        let newInitialColumn =Math.min(this.config.initialColumn + offset_x,this.config.resultLength-2);
        this.setConfig({initialColumn:newInitialColumn,
                        initialFrequency:this.config.initialFrequency + 0,
                    },
                        // initialFrequency:this.config.initialFrequency + offset_y},
                        false,false); //false cause it shouldn't load new index.
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

    zoomByScrolling(factor, fixedPoint){
        let newTotalLength =Math.min(this.config.resultLength-2, this.config.canvasColumns*factor);
        let newLeftColumn =Math.min(this.config.resultLength-newTotalLength,
                                    fixedPoint.x*(1-factor)+this.config.initialColumn
                                    );
        // let newRightColumn = fixedPoint.x*(1-factor) + this.config.canvasColumns; 
        this.setConfig({initialColumn:Math.round(newLeftColumn), 
                        canvasColumns: Math.round(newTotalLength)},false, true);
    }

    changeBright(addition){
        this.setConfig({brightness:this.config.brightness + addition}, false,false);
    }
   
    canvasToPoint(p){ // p must be a point with same structure as those given by createPoint.
        let column = Math.round(this.config.initialColumn + p.x);
        let frequency = Math.round(this.config.initialFrequency + p.y);
        return this.createPoint(column,frequency)
    }

    pointToCanvas(p) { //p tiene coordenadas absolutas con respecto al archivo fft. 
        //y debe cumplir que p esté dentro del canvas. 
        //given absolute column and line and this.config, this function should return coordinates.
        // abstract method
        var coord_x = p.x-this.config.initialColumn;
        let var2 = this.config.initialColumn+this.config.canvasColumns-p.x;
        let coord_y = p.y- this.config.initialFrequency;
        let var4 = this.config.initialFrequency+this.config.canvasLines-p.y; 
        switch (coord_x>=0, var2>=0,coord_y>=0,var4>=0){ //condiciones para quedar dentro del canvas.
            case (true,true,true,true):
            return this.createPoint(coord_x,coord_y);
        }
    }

    validatePoints(p){
        // abstract method
    }

    renderToolbar(){
        return <Tools id="toolbox" switchButton ={() => this.zoomActivator()}
                                   moveRight={()=>this.move(+100,0)}
                                   moveLeft = {() => this.move(-10,0)}
                                   increaseBrightness = {() => this.changeBright(-5)}
                                   decreaseBrightness = {() => this.changeBright(5)} />
    }

    draw(FFTComputationRequired, indexLoadRequired){
        if (indexLoadRequired){
            console.log('this.config', this.config);
            drawAdjustingIndex();
        }
        else{
            console.log(this.config);
            drawWithoutAdjustingIndex();
        }

    }

    getMouseEventPosition(event) { //Posicion relativa al canvas dada en columna y frecuencia.
        // let x = event.offsetX || (event.pageX - this.canvas.offsetLeft);
        let x = event.offsetX || (event.pageX - this.canvas.offsetLeft);
        let y = event.offsetY || (event.pageY - this.canvas.offsetTop);        
        // x = (x / this.canvas.width)*this.config.canvasColumns;     
        y = (1-y / this.canvas.height)*this.config.canvasLines;;
        let point = this.createPoint(Math.round(x), Math.round(y));
        console.log(point);
        console.log('canvas width', this.canvas);
        return point;
    }

    moveWithMouse(event){
        var actualPoint = this.getMouseEventPosition(event);
        var xActual = actualPoint.x;
        var yActual = actualPoint.y; 
        let xInic = this.initialMousePosition.x;
        let yInic = this.initialMousePosition.y;
          
        let xInc = Math.round(xActual-xInic); 
        let yInc = Math.round(yActual-yInic);
        this.move(-xInc,yInc);
        this.initialMousePosition = actualPoint;   
    }

    moveForZoom(firstPoint, secondPoint){
        let newInitialColumn = Math.min(firstPoint.x, secondPoint.x);
        let newLastColumn = Math.max(firstPoint.x, secondPoint.x);
        let columnRange = newLastColumn- newInitialColumn;
        this.setConfig({initialColumn:newInitialColumn,
                        canvasColumns:columnRange
                        } ,false,true);
    }

    ratonPulsado(event){ //Obtiene la posicion inicial para los siguientes eventos.
        this.canvas.setAttribute("clicked", "yes");
        this.initialMousePosition = this.getMouseEventPosition(event);
        return 
    }

  

    ratonMovido(event) {
        if(this.canvas.getAttribute("clicked")==="yes"){
            if (!(this.zoomSwitchPosition==="on")){
                this.moveWithMouse(event);            
            }
            else{
             //las instrucciones para cuando esta en modo zoom, no debe ir nada.
            }

        }
        else {
            //Aquí no debe ir nada.
        }
    }
            
    ratonSoltado(evt) {    
        if (this.canvas.getAttribute("clicked")==="yes"){
            this.canvas.setAttribute("clicked",null);

            if (this.zoomSwitchPosition==="on"){ 
                let secondZoomPoint = this.getMouseEventPosition(event);
                //Las instrucciones por si está en zoom mode.
                this.moveForZoom(this.initialMousePosition,secondZoomPoint);
                        
            }
            else{
                //Aquí no debe ir nada. 
            }
            this.initialMousePosition = null;
        }
        else{
            //Aquí no debe ir nada.
        }
    }

    mouseScroll(event){
        let dir = event.deltaY;
        console.log(dir);
        let fixedPoint = this.getMouseEventPosition(event);
        // this.zoomByScrolling(20/21,fixedPoint);
        if (!dir == 0){
        // console.log('la direccion de scroll es negativa', dir<0);
            let factor = (dir > 0) ? 55/57 : 57/55;
            console.log('factor', factor);
            if (factor<0 && 
                (this.canvas.initialColumn==0 ||
                 this.config.resultLength - this.config.initialTime> this.config.canvasColumns)){

            }
            else{
                this.zoomByScrolling(factor, fixedPoint);
            }
        }
    }
} 

export default Visualizer;
