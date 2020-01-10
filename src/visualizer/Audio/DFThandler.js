import * as tf from '@tensorflow/tfjs';


export default class DFThandler {
    constructor(audioLoader, setup){ 
        this.config = {};
        this.maxDataLoadedSize = 1000000; 
        this.dftArray = new Float32Array(this.maxDataLoadedSize);
        this.init(audioLoader, setup);
        this.audioLoader = audioLoader; //class from where data is retrieved (audioFile class)
    }

    init(setup){
        this.config['windowSize']=setup.windowSize;    
        this.config['windowType']=setup.windowType;
        this.config['colorMap'] = null; 
        this.config['windowIntercectionPercentage']=.5;
        this.config['intersectionSize'] = this.config['windowSize']*this.config['windowIntercectionPercentage'];
        this.config['noIntersectionSize'] = this.config['windowSize']*(1-this.config['windowIntercectionPercentage']);
    
        this.waitForMediaInfo()
            .then(()=>this.loadBufferWithDFTdata(0); // it start loading from the beggining of the data.
    }

    loadBufferWithDFTdata(index){ //fills this.dftArray with  info starting from index
    var i=0;
    var newStep = true;
    var lenght=0;
    while (length<10000000 && newStep){
        let j = i;
        dftRetriever.loadRawData(initialTime+j, initialTime+j+1)
            .then((loadedFile) => dftRetriever.DFTcomputeArray(loadedFile))
            .then((arrayResult) => this.dftArray.set(arrayResult, length))
            .then(()=>{newStep = true; i=i+1})
    }
}

    waitForMediaInfo(){
        return new Promise((resolve,reject) => {
            let checkIfReady = () => {
                if (this.audioLoader.isReady()){
                    resolve()
                }
                else{setTimeout(checkIfReady,1)
                }
            }
            checkIfReady();
        })
    }

    waitForIndexLoaded(index){
        return new Promise((resolve,reject)=>{
            let checkIfReady = () =>{
                if (this.audioLoader.getLastIndex()>index){
                    console.log('Inside watiForIndexLoaded', this.audioLoader.lastIndex, index);
                    resolve()
                }
                else{setTimeout(checkIfReady,1)}
            }
            checkIfReady();
        })
    }

    loadRawData(initialIndex, finalIndex){
        this.waitForIndexLoaded(finalIndex)
            .then(()=>this.audioLoader.read({startIndex:initialIndex,endIndex:finalIndex}))
        // return new Promise((resolve,reject)=>{
        //     let checkIfReady = () =>{
        //         if (this.audioLoader.getLastIndex()>finalIndex){
        //             resolve(this.audioLoader.read({startTime:initialTime,endTime:finalTime}));
        //         }
        //         else{setTimeout(checkIfReady,1)}
        //     }
        //     checkIfReady();
        // })
    } 

    async DFTcomputeArray(fileData){
        this.config.windowType = tf.hannWindow(this.config.windowSize);
        let tensorBuffer = tf.tensor1d(new Float32Array(fileData.data)); //Tensor con la informacion del archivo
        // tf.print(tensorBuffer);
        // console.log('error aquí')    
        let frames = tf.signal.frame(tensorBuffer, this.config.windowSize, this.config.noIntersectionSize);
        let windowed_frames = this.config.windowType.mul(frames);
        let tensorBufferSplitting = tf.abs(windowed_frames.rfft());
        let tensordb = tf.square(tf.log(tensorBufferSplitting));
        return await tensordb.array();
    } 






            
}




