import * as tf from '@tensorflow/tfjs';


export default class DFThandler {
    constructor(audioLoader, setup){ 
        this.config = {};
        this.maxDataLoadedSize = 1000000; 
        this.loadedFile = null;
        this.init(audioLoader, setup);
        this.tensorBuffer = tf.tensor1d(new Float32Array(this.maxDataLoadedSize));
        this.sketchingArray = [];
    }

    init(audioLoader, setup){
        this.audioLoader = audioLoader; //class from where data is retrieved (audioFile class)
        this.waitForMediaInfo()
        .then((info) =>{
                    // this.config['maxLength']=this.audioLoader.rawDataArray.length/this.audioLoader.mediaInfo.sampleSize*(0.70);
                    this.config['windowSize']=setup.windowSize;    
                    this.config['windowType']=setup.windowType;
                    this.config['colorMap'] = null; 
                    this.config['windowIntercectionPercentage']=.5;
                    this.config['intersectionSize'] = this.config['windowSize']*this.config['windowIntercectionPercentage'];
                    this.config['noIntersectionSize'] = this.config['windowSize']*(1-this.config['windowIntercectionPercentage']);
                    })
    }

    waitForMediaInfo(){
        return new Promise((resolve,reject) => {
            let checkIfReady = () => {
                if (this.audioLoader.isReady()){
                    let canto = 'Está listo el mediaInfo';
                    resolve(this.audioLoader.mediaInfo)
                }
                else{setTimeout(checkIfReady,1)
                }
            }
            checkIfReady();
        })
    }

    loadRawData(initialTime, finalTime){
                    initialTime = Math.max(initialTime, this.audioLoader.mediaInfo.dataStart);
                    finalTime = Math.min(finalTime, this.audioLoader.mediaInfo.duration);
                    this.loadedFile = this.audioLoader.read();
                    return this.loadedFile
    }

    tensorToArrayTransformation(tensor){
        return new Promise((resolve,reject) => {
            let array = tensor.array();
            resolve(array);
        })
    }

    async DFTcomputeArray(fileData){
        this.config.windowType = tf.hannWindow(this.config.windowSize);
        this.tensorBuffer = tf.tensor1d(new Float32Array(fileData.data)); //Tensor con la informacion del archivo
        let frames = tf.signal.frame(this.tensorBuffer, this.config.windowSize, this.config.noIntersectionSize);
        console.log('frames', frames);
        let windowed_frames = this.config.windowType.mul(frames);
        let tensorBufferSplitting = tf.abs(windowed_frames.rfft());
        let tensordb = tf.square(tf.log(tensorBufferSplitting));
        await this.tensorToArrayTransformation(tensordb).then((array)=> {this.sketchingArray = array
                                                                        console.log(this.sketchingArray);
                                                                        return this.sketchingArray});
    }
            
}




