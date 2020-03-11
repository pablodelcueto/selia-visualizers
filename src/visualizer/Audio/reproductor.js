
export default class Reproductor {
    constructor(audioFile) {
        this.audioFile = audioFile;
        this.isPlaying = false;
        this.init();
    }

    init() {
        this.audioCtx = new AudioContext() // || webkitAudioContext )();
    }

    async readAndReproduce(initialTime, callback) {        
        // this.source = this.audioCtx.createBufferSource();
        const checkIfLoaded = async () => {
            if (this.audioFile.isDone()) {
                await this.audioCtx.decodeAudioData(
                    this.audioFile.rawDataArray.buffer.slice(0))
                    .then((decodedBuffer) => {
                        callback();
                        console.log('repeticion');
                        this.source.buffer = decodedBuffer;
                        this.source.connect(this.audioCtx.destination);
                        this.source.start(0, initialTime);
                        console.log('source buffer', this.source.buffer);
                    });
            } else {
                setTimeout(checkIfLoaded, 10);
            }
        };
        await checkIfLoaded();
        // return
    }

    // readAndReproduce(initialTime) {
    //     return new Promise((resolve) => {
    //         const checkIfLoaded = () => {
    //             if (this.audioFile.isDone()) {
    //                 this.audioCtx.decodeAudioData(
    //                     this.audioFile.rawDataArray.buffer.slice(0),
    //                     (decodedBuffer) => {
    //                         this.source.buffer = decodedBuffer;
    //                         this.source.connect(this.audioCtx.destination);
    //                         this.source.start(0, initialTime);
    //                     }
    //                 );
    //                 resolve();
    //             }
    //             setTimeout(checkIfLoaded, 10);
    //         };
    //         checkIfLoaded();
    //     });   
    // }

    reproduce(initialTime, callback) {
        this.source = this.audioCtx.createBufferSource();
        if (this.isPlaying) {
            this.stop();
            // console.log('true');
            this.readAndReproduce(initialTime, callback);
            // callback();
        } else {
            console.log('false');
            this.readAndReproduce(initialTime, callback);
                // .then(() => {
                //     console.log('source buffer en reproduce', this.source.buffer);
                //     callback()
                // });
        }
        this.isPlaying = true;
    }

    stop() {
        this.source.stop();
        this.isPlaying = false;
    }

}
