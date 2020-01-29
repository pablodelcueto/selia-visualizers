import React from 'react'
import Audio from '../Audio';
import {renderSketch, newRenderization,columnsAdaption} from '../Graphics';
import AudioFile from '../Audio/audioFile';
import STFTHandler from '../STFTHandler/STFTHandler';

let pointsBuffer = new Float32Array(10000000);
let MAX_LENGHT = 500000;
let initialLoadedIndex = 0;

//------------------------------------------------------------------
var colors=[];
var points = [];
var indices = [];
var initialTimeLength = 2800;
var initialFrequenciesLength = 256;
var config = {
      STFT: { 
        window_size: 1024,
        hop_length: 256,
        window_function: 'hann',
      },
      startWAVindex: 0,   
    }
export var newPictureSetup = {
                    resultLength : 2500,
                    numberOfFrequencies : 256,
                    windowSize : 512,
                    intercectionPercentage: 0.5,
                    transformationMatrix : new Float32Array([2/2500,0,0,0,2/256,0,-1,-1,1]),
                    brightness : 50,
                    columnsInCanvas : 2500,
                    linesInCanvas : 256,
                    // zoomX:1,
                    // zoomY:.5,
                };

export class webGLdrawer{
    constructor(info, setup){
        this.audioFile = new AudioFile(info);
        this.dftRetriever = new DFTHandler(this.audioFile, setup)
    }
}
// function loadCompleteVertexBuffer(setup,fileFFTArray, drawingMethod) {
function loadCompleteVertexBuffer(setup, fileFFTArray){
    let points=[];
    let colors=[];
    let indices=[];
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
    return [points, colors, indices];
}

export function loadFFTArray(info,setup){
    var sketchingArray = [];
    let audioFile = new AudioFile(info);
    let STFTRetriever = new STFTHandler(audioFile, config);
    setTimeout(
        ()=>{
            console.log('primera lectura', STFTRetriever.read({startColumn:0}));
            STFTRetriever.shiftSTFTBuffer(1);
            setTimeout(()=>console.log('shifted', STFTRetriever.STFTBuffer.slice(0,2)),4000)
        },
        3000);
        
    // dftRetriever.waitForMediaInfo()
    // .then(()=>{
    //         // loadBufferWithDFTdata(sketchingArray, 0);
    //         // drawLoadedBuffer(setup, sketchingArray);
    //     // console.log('Media info', audioFile.mediaInfo, audioFile.isReady(), audioFile.lastIndex)
    //     for (var i=0;i<10;i++){
    //             let j = i;
    //             dftRetriever.loadRawData(j,j+1) //rango en segundos
    //                 .then((loadedFile)=> {
    //                                     return dftRetriever.DFTcomputeArray(loadedFile)
    //                                     }) 
    //                 .then((arrayResult) => {
    //                                     sketchingArray = sketchingArray.concat(arrayResult);
    //                                     drawLoadedBuffer(setup,sketchingArray);
    //                                     })
    //                 .catch((err)=> console.error(err));
    //     }
    // // Audio.modifyAudioLoadSetup();
    // // Audio.loadFile2(info)
    // //     .then(({result,loader}) => {
    // //         Audio.loadSmoothlyWhileDrawing(result, loader, array => drawCompleteFile(setup,array))
    // //     })
    // })
}

export function drawLoadedBuffer(setup, arrayFile){
    let [points,colors,indices] = loadCompleteVertexBuffer(setup, arrayFile);
    renderSketch(setup,points,colors,indices);
}




export function changesWithoutLoadingBuffers(setup){
    // console.log('complete Array', Audio.completeResulArray);
    newRenderization(setup);
}
