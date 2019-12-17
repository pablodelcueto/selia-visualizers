import React from 'react'
import Audio from '../Audio';
import {renderSketch, newRenderization,columnsAdaption} from '../Graphics';


//------------------------------------------------------------------
var colors=[];
var points = [];
var indices = []; 
var initialTimeLength = 2800;
var initialFrequenciesLength = 256;
export var initialPictureSetup = {
                    resultLength : 20000,
                    numberOfFrequencies : 128,
                    windowSize : 512,
                    intercectionPercentage: 0.5,
                    transformationMatrix : new Float32Array([2/2500,0,0,0,2/256,0,-1,-1,1]),
                    brightness : 50,
                    columnsInCanvas : 2500,
                    linesInCanvas : 128,
                };

export var newPictureSetup = {
                    resultLength : 4096,
                    numberOfFrequencies : 128,
                    windowSize : 512,
                    intercectionPercentage: 0.5,
                    transformationMatrix : new Float32Array([2/2500,0,0,0,2/128,0,-1,-1,1]),
                    brightness : 50,
                    columnsInCanvas : 2500,
                    linesInCanvas : 128,
                };


function loadCompleteVertexBuffer(setup,fileFFTArray, drawingMethod) {
    colors = [];
    points = [];
    indices = [];
    setup.resultLength = Audio.resultLength-1;
    for (var i=0; i<setup.resultLength; i++){
        for (var j=0; j< setup.numberOfFrequencies;j++){
            points.push(...[i,j]);
            colors.push(fileFFTArray[i][j]);
            if (i < setup.resultLength -1 && j < setup.numberOfFrequencies-1){
                indices.push(...[i*(setup.numberOfFrequencies)+j,
                                 (i+1)*(setup.numberOfFrequencies)+(j+1),
                                (i+1)*(setup.numberOfFrequencies)+j, 

                                 i*(setup.numberOfFrequencies)+j,
                                 i*(setup.numberOfFrequencies)+(j+1),
                                 (i+1)*(setup.numberOfFrequencies)+(j+1)]);
            }
        }
    }
    drawingMethod(setup, points,colors,indices);
    return 
}

export function loadFFTArray(setup){
    Audio.modifyAudioLoadSetup();
    Audio.loadFile((array)=>drawCompleteFile(array,setup));
    }

export function drawCompleteFile(file,setup){
    loadCompleteVertexBuffer(setup, file,()=>renderSketch(setup,points,colors,indices));
}

export function changesWithoutLoadingBuffers(setup){
    newRenderization(setup);
}


function resetSetup(){
}

