import React from 'react'
import Audio from '../Audio';
import {renderSketch,columnsAdaption} from '../Graphics';


//------------------------------------------------------------------
var colors=[];
var points = [];
var indices = []; 

export var newPictureSetup = {
                    resultLength : Audio.resultLength,
                    windowSize : 512,
                    intercectionPercentage: 0.5,
                    canvasColumns:2170, 
                    canvasLines: 256/2,
                    brightness:75,
                    zoomX:1,
                    zoomY:.5,
                    initialColumn:0,
                    initialFrequency:0,
                };

var pictureSetup = null;

function checkIndexModification(){

}

function loadIndexAndPositions(pictureSetup){
    var newCoords=[];
    indices=[];
    points=[]
    for (var i=0; i<pictureSetup.canvasColumns; i++){
        for (var j=0; j<pictureSetup.canvasLines; j++){
            if (i < pictureSetup.canvasColumns -1 && j < pictureSetup.canvasLines-1){
                indices.push(...[i*(pictureSetup.canvasLines)+j,
                                 (i+1)*(pictureSetup.canvasLines)+(j+1),
                                (i+1)*(pictureSetup.canvasLines)+j, 

                                 i*(pictureSetup.canvasLines)+j,
                                 i*(pictureSetup.canvasLines)+(j+1),
                                 (i+1)*(pictureSetup.canvasLines)+(j+1)]);
            }
            newCoords=[pictureSetup.zoomX*(2.0*i/pictureSetup.canvasColumns)-1, // las columnas del canvas originalete numeroColumnas
                        pictureSetup.zoomY*(4.0*j/pictureSetup.canvasLines)-1]; // viewport range=[-1,1].
            points.push(...newCoords);
        }
    }
}



function loadColorBuffer(fileFFTArray,pictureSetup) { //Rellena el atributo 0
    console.log(pictureSetup.initialColumn, Audio.resultLength);
    //el siguiente if revisa que no se quiera cargar informacion fuerta del archivo fft.
    if (0 <= pictureSetup.initialColumn && pictureSetup.initialColumn + pictureSetup.canvasColumns <Math.round(Audio.resultLength-1)){
        colors = [];
        for (var i=0; i<pictureSetup.canvasColumns; i++){
            for (var j=0; j<pictureSetup.canvasLines; j++){
                colors.push(fileFFTArray[i+pictureSetup.initialColumn][j+pictureSetup.initialFrequency]/pictureSetup.brightness);    
            }               
        }   
    }   
    else {
        console.log('El archivo ha llegado a su fin');
        
    } 
}

export function loadFFTArray(){
    Audio.resetSetup();
    // Audio.windowSize = newPictureSetup.windowSize;
    Audio.loadFile(drawAdjustingIndex);
    // .then((array) => {drawWithoutLoadingNewData(array)});
}


export function drawWithoutAdjustingIndex(){ // Debe cambiar sketch solamente al haber diferencia en pictureSetup y newPictureSetup.       
    if (!(JSON.stringify(newPictureSetup) === JSON.stringify(pictureSetup))) { //Si no ha cambiado la configuracion no cambiará el dibujo
        // console.log('newPictureSetup', newPictureSetup);
        loadColorBuffer(Audio.completeResultArray, newPictureSetup);
        pictureSetup = Object.assign({},newPictureSetup);        
        renderSketch(points,colors,indices);
    }
    else{ 
        // console.log('en indice ', i ,' los setups son iguales:', newPictureSetup==pictureSetup); // en caso contrario se dibujara la nueva configuracion.
    }
}

export function drawAdjustingIndex(){
    newPictureSetup.resultLength = Audio.resultLength;
    loadIndexAndPositions(newPictureSetup);
    drawWithoutAdjustingIndex();

}

export function playWithoutLoadingNewData(){
    if (!(JSON.stringify(newPictureSetup) === JSON.stringify(pictureSetup))) { //Si no ha cambiado la configuracion no cambiará el dibujo
        pictureSetup = Object.assign({},newPictureSetup);        
        loadColorBuffer(Audio.completeResultArray, pictureSetup);
        renderSketch(gl,shaders,points,colors,indices);
        if (newPictureSetup.initialColumn<Audio.completeResultArray.length-pictureSetup.canvasColumns-87){
            newPictureSetup.initialColumn = newPictureSetup.initialColumn+86;
            
            requestAnimationFrame(playWithoutLoadingNewData);
        }
        else {
            cancelAnimationFrame(playWithoutLoadingNewData);
            newPictureSetup.initialColumn=0;
        }
    }
}
