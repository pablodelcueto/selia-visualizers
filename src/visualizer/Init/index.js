import React from 'react'
import Audio from '../Audio';
import {renderSketch, newRenderization,columnsAdaption} from '../Graphics';


//------------------------------------------------------------------
var colors=[];
var points = [];
var indices = [];
var initialTimeLength = 2800;
var initialFrequenciesLength = 256;
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

//

function loadCompleteVertexBuffer(setup, fileFFTArray) {
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

export function loadFFTArray(info, setup){
    Audio.resetAudioLoadSetup();
    Audio.loadFile2(info)
      .then(({result, loader}) => {
        Audio.loadSmoothlyWhileDrawing(result, loader, (array) => drawCompleteFile(array,setup))
      })
    }

export function drawCompleteFile(file,setup){
    let [points, colors, indices] = loadCompleteVertexBuffer(setup, file);
    renderSketch(setup, points, colors,indices);
}

export function changesApplication(setup){
    newRenderization(setup);
}
