/**
* @param {object} audioFile - Class uncoding wav file.
* This class is used to reproduce wav file in sync with a visualizer animation.
*/

export default class Reproductor {
    constructor(audioFile) {
        this.audioFile = audioFile;
        // boolean used to give several actions to play/pause button.
        this.isPlaying = false;
        this.init();
    }

    /**
    * creates a proper audioContext
    */
    init() {
        this.audioCtx = new AudioContext();
    }

    /**
    * @return time passed since autioContext was initialized.
    */
    getTime() {
        return this.audioCtx.currentTime;
    }

    /**
    * @param {number} initialTime - Reproduction initial time.
    * @param {function} callback -
    * audioContext decode data into a decodedBuffer and sets the result in audioContext bufferSource
    * which is played after connecting with audioContext.destination.
    * At the end, callback is executed.
    */
    readAndReproduce(initialTime, callback) {      
        const checkIfLoaded = () => {
            if (this.audioFile.isDone()) {
                this.audioCtx.decodeAudioData(
                    this.audioFile.rawDataArray.buffer.slice(0),
                )
                    .then((decodedBuffer) => {
                        this.source.buffer = decodedBuffer;
                        this.source.connect(this.audioCtx.destination);
                        // 0 actual time of audioContext.
                        this.source.start(0, initialTime);
                        callback();
                    });
            } else {
                setTimeout(checkIfLoaded, 10);
            }
        };
        // reproductor must check if audioFile class has already finished loading wav file from server. 
        checkIfLoaded();
    }

    /**
    * @param {number} initialTime - Initial time of sound reproduction.
    * @param {function} callback - Visualizer animation in sync with audio reproduction.
    * Every time reproductor stops, context need to create a new source and fill it with decoded data.
    */
    reproduce(initialTime, callback) {
        if (this.source != null) {
            this.source.stop();
        }
        this.source = this.audioCtx.createBufferSource();
        this.readAndReproduce(initialTime, callback);
    }

    /**
    * Used to stop audio reproduction.
    */
    stop() {
        this.source.stop();
    }

}
