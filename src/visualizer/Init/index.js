import React from 'react'
import Audio from '../Audio';
import {renderSketch, newRenderization,columnsAdaption} from '../Graphics';
import DFThandler from '../Audio/DFThandler';
import AudioFile from '../Audio/audioFile';


//------------------------------------------------------------------
// var colors=[];
// var points = [];
// var indices = []; 
var initialTimeLength = 2800;
var initialFrequenciesLength = 256;
export var initialPictureSetup = {
                    resultLength : 20000,
                    numberOfFrequencies : 128,
                    windowSize : 512,
                    windowType : 'Hann',
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
                    windowType : 'Hann',
                    intercectionPercentage: 0.5,
                    transformationMatrix : new Float32Array([2/2500,0,0,0,2/128,0,-1,-1,1]),
                    brightness : 50,
                    columnsInCanvas : 2500,
                    linesInCanvas : 128,
                };


// function loadCompleteVertexBuffer(setup,fileFFTArray, drawingMethod) {
    function loadCompleteVertexBuffer(setup, fileFFTArray){
    let points=[];
    let colors=[];
    let indices=[];
    console.log('file in loadCompleteVertexBuffer', fileFFTArray);
    setup.resultLength = fileFFTArray.length;
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
    // drawingMethod(setup, points,colors,indices);
    return [points,colors,indices]
}

export function loadFFTArray(info,setup){
    let audioFile = new AudioFile(info);
    let dftRetriever = new DFThandler(audioFile, setup);
    dftRetriever.waitForMediaInfo()
    .then(()=>dftRetriever.loadRawData(0,130000)) //en segundos
    .then((loadedFile)=> {dftRetriever.DFTcomputeArray(loadedFile)}) 
    .then((sketchingArray) => {console.log('dftcomputedArray en loadFFT', sketchingArray)})
                            // drawCompleteFile(setup,sketchingArray.data)})
    // .then((bufferArrays)=> console.log('resultados de loadCompleteVertexBuffer', bufferArrays))
    .catch((err)=> console.error(err));
    // .then((result)=>console.log(result.resultArray))
    // .catch((err) => console.error(err));

    // Audio.modifyAudioLoadSetup();
    // Audio.loadFile2(info)
    //     .then(({result,loader}) => {
    //         Audio.loadSmoothlyWhileDrawing(result, loader, array => drawCompleteFile(setup,array))
    //     })
    }

export function drawCompleteFile(setup, arrayFile){
    let [points,colors,indices] = loadCompleteVertexBuffer(setup, arrayFile);
    renderSketch(setup,points,colors,indices);
}

export function changesWithoutLoadingBuffers(setup){
    console.log('complete Array', Audio.completeResulArray);
    newRenderization(setup);
}


function resetSetup(){
}