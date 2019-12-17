import * as tf from '@tensorflow/tfjs';
import {newPictureSetup} from '../Init'

tf.backend('webGL');
let tensorBuffer = null;
class FileLoader { //Para ir cargando poquito a poco.
    constructor(file) {
        this.startTime=Date.now();
        this.oldProgress = [];
        this.newChunk = [];
        this.indiceDeCarga = 0;
        this.indiceFinal = Math.floor(file.byteLength/1200000);
    }

    keepTrackOfProgress() { //Usefull to check newChunks of Data loaded. 
        console.log('keeptrackofprocess on use')
        this.oldProgress = this.newChunk;
        this.newChunk = this.reader.result;
        console.log('indice i', this.indiceDeCarga, this.newChunk, this.oldProgress);
        this.indiceDeCarga ++;
        console.log(this.reader.result)
        // console.log('diferencia en longitud', this.newChunk.length-this.oldProgress.length);
    }

}

class audioWork {
    constructor(){
        this.file = null;
        this.preload = false;
        this.completeResultArray = []; //Result after aplying FFT
        this.resultLength = 0;
        this.numberOfFrequencies = 0;
        this.windowSize = null;
        this.windowType = tf.hannWindow(this.windowSize);
        this.windowIntersectionPercentage = 0.5;   
        this.noIntersectionSize = parseInt(this.windowSize * (1- this.windowIntersectionPercentage));
        this.startDrawing = false;
    };
    
    FFTData(preloaded, fileArray){ //FFT computations with tensorflow
        tensorBuffer = tf.tensor1d(new Float32Array(fileArray)); //Tensor con la informacion del archivo

        let frames = tf.signal.frame(tensorBuffer, this.windowSize, this.noIntersectionSize);
        
        let windowed_frames = this.windowType.mul(frames);
        let tensorBufferSplitting = tf.abs(windowed_frames.rfft());
        let tensordb = tf.square(tf.log(tensorBufferSplitting));

        if (!preloaded){
            this.completeResultArray = this.completeResultArray.concat(tensordb.arraySync());

        }
        else {
            this.completeResultArray = this.completeResultArray.concat(tensordb.array());
        }
    }    

    //Para ir cargando pedazos pequeños e ir dibujando sus resultados.
    loadSmoothlyWhileDrawing(file,loader,fftDataProcessor){
        let newChunk = file.slice(loader.indiceDeCarga*1200000,(loader.indiceDeCarga+1)*1200000);
        this.FFTData(false, newChunk);

        if (!(loader.indiceDeCarga===loader.indiceFinal)){
            if (loader.indiceDeCarga===0){
                var startTime = Date.now(); 
            }
            loader.indiceDeCarga++;
            this.loadSmoothlyWhileDrawing(file,loader,fftDataProcessor);
        }

        else{ 
            fftDataProcessor(this.completeResultArray); // funcion para dibujar la cual solamente se activa cuando cambió newPictureSetup
            var endTime = Date.now();
            console.log('Cuentas terminadas en', (endTime-loader.startTime)/1000, 'segundos');
        }

    }
                                                                                    
    

    loadFile(fftDataProcessor){ // fftDataProcessor is the function used with loaded file
        this.completeResultArray = []
        let reader = new FileReader();
        fetch('http://localhost:3000/download')
            .then((result) => { return result.arrayBuffer()})
            .then((array) => {return new Int16Array(array)})
            .then((Int16bitArray) => { 
                                    this.file = Int16bitArray;
                                    this.resultLength = parseInt(this.file.length / this.noIntersectionSize); //No se usa ahorita, pero si 
                                    // en loadColors para no tratar de dibujar mas de lo que tamaño del archivo permite.
                                    let fileLoader= new FileLoader(this.file);

                                    this.loadSmoothlyWhileDrawing(this.file,fileLoader,fftDataProcessor);
                                    // console.log(Int16bitArray);
                                })
    return this.completeResultArray;
    }

    modifyAudioLoadSetup(){
        this.windowSize = newPictureSetup.windowSize;
        this.windowType = tf.hannWindow(this.windowSize);
        this.windowIntersectionPercentage = newPictureSetup.intercectionPercentage;   
        this.noIntersectionSize = parseInt(this.windowSize * (1- this.windowIntersectionPercentage))
        this.numberOfFrequencies = newPictureSetup.numberOfFrequencies/2;
        // newPictureSetup.resultLength = this.file.length/ this.noIntersectionSize; 
    }



    recomputeSeries(){
        this.completeResultArray = [];
        this.loadSmoothlyWhileDrawing(this.file,fileLoader,fftDataProcessor);
        return this.completeResultArray = [];
    }    

}



const audiowork = new audioWork();
export default audiowork;
 