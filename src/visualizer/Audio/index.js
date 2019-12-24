import * as tf from '@tensorflow/tfjs';
import {newPictureSetup} from '../Init'
import AudioFile from './audioFile';

tf.backend('webGL');

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

class DFThandler {
    constructor(){
        this.file = null;
        this.preload = false;
        this.loadedResultArray;
        this.sketchingResultArray = []; //Result after aplying FFT
        this.resultLength = 0;
        this.windowSize = null;
        this.windowType = tf.hannWindow(this.windowSize);
        this.windowIntersectionPercentage = 0.5;
        this.noIntersectionSize = parseInt(this.windowSize * (1- this.windowIntersectionPercentage));
        this.startDrawing = false;
    };

    FFTData(preloaded, fileArray){ //FFT computations with tensorflow
        console.log('windowType', this.windowType); 
        let tensorBuffer = tf.tensor1d(new Float32Array(fileArray)); //Tensor con la informacion del archivo
        let frames = tf.signal.frame(tensorBuffer, this.windowSize, this.noIntersectionSize);
        let windowed_frames = this.windowType.mul(frames);
        let tensorBufferSplitting = tf.abs(windowed_frames.rfft());
        let tensordb = tf.square(tf.log(tensorBufferSplitting));

        if (!preloaded){
            this.sketchingResultArray = this.sketchingResultArray.concat(tensordb.arraySync());
        }

        else {
            this.sketchingResultArray = this.sketchingResultArray.concat(tensordb.array());
        }
    }

    //Para ir cargando pedazos pequeños e ir dibujando sus resultados.
    loadSmoothlyWhileDrawing(file,loader,fftDataProcessor){
        this.resultLength = file.length/ this.noIntersectionSize; //No se usa ahorita, pero si
        // en loadColors para no tratar de dibujar mas de lo que tamaño del archivo permite.
        let newChunk = file.slice(loader.indiceDeCarga*1200000,(loader.indiceDeCarga+1)*1200000);
        this.FFTData(false, newChunk);
        // this.FFTData(false,file);

        if (!(loader.indiceDeCarga===loader.indiceFinal)){
            if (loader.indiceDeCarga===0){
                var startTime = Date.now();
            }
            loader.indiceDeCarga++;
            // this.loadSmoothlyWhileDrawing(reader,loader,fftDataProcessor);
            setTimeout(()=>this.loadSmoothlyWhileDrawing(file,loader,fftDataProcessor),500);
        }

        else{console.log('this.sketchingArray', this.sketchingResultArray);
            fftDataProcessor(this.sketchingResultArray); // funcion para dibujar la cual solamente se activa cuando cambió newPictureSetup
            var endTime = Date.now();
            console.log('Cuentas terminadas en', (endTime-loader.startTime)/1000, 'segundos');
        }
    }

    loadFile(info){ // fftDataProcessor is the function used with loaded file
        let reader = new FileReader();
        return fetch(info.url)
            .then((result) => { return result.arrayBuffer()})
            .then((array) => {return new Int16Array(array)})
            .then((Int16bitArray) => {
                this.resultLength = Int16bitArray.length / this.noIntersectionSize; //No se usa ahorita, pero si
                // en loadColors para no tratar de dibujar mas de lo que tamaño del archivo permite.
                let fileLoader = new FileLoader(Int16bitArray);

                return {
                  result: Int16bitArray,
                  loader: fileLoader
                }
                //
                // this.loadSmoothlyWhileDrawing(Int16bitArray, fileLoader, fftDataProcessor);
                // // console.log(Int16bitArray);
            })
    return this.sketchingResultArray;
    }

    modifyAudioLoadSetup(){
        this.windowSize = newPictureSetup.windowSize;
        this.windowType = tf.hannWindow(this.windowSize);
        this.windowIntersectionPercentage = newPictureSetup.intercectionPercentage;
        this.noIntersectionSize = parseInt(this.windowSize * (1- this.windowIntersectionPercentage))
        // this.resultLength = this.file.length/ this.noIntersectionSize;
    }

    loadFile2(info) {
      return new Promise((resolve, reject) => {
        let audioFile = new AudioFile(info);

        let checkIfReady = () => {
          if (audioFile.isReady()) { // check if data obtained is bigger than MINIMUN_DATA_SIZE
            this.loadedResultArray = audioFile.read().data;
            let loader = new FileLoader(this.loadedResultArray);
            resolve({result: this.loadedResultArray, loader: loader});
          } else {
            setTimeout(checkIfReady, 1)
          }
        }

        setTimeout(checkIfReady, 1); //We wait until mediaInfo is ready
      })
    }
}


const audiowork = new DFThandler();
export default audiowork;
