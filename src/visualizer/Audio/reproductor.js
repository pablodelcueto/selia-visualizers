/**
* Audio player module.
*
* @module Audio/reproductor
* @see module:Audio/reproductor.js
*/

/**
* Class used to define and use an audioContext for audioFile.
* This class is used to reproduce wav file in synchronization with an animation.
* @class 
* @property {Object} audioFile - Audio file.
* @property {Object} audioCtx - AudioContext.
*/
class Reproductor {
    /**
    * Creates a Reproductor Object.
    * @constructor
    * @param {object} audioFile - Class uncoding wav file.
    */
    constructor(audioFile) {
        this.audioFile = audioFile;
        // boolean used to give several actions to play/pause button.
        this.init();
    }

    /**
    * Creates the audioContext.
    */
    init() {
        this.audioCtx = new AudioContext();

    }

    /**
    * Time passed since autioContext was initialized.
    * @return {number}
    */
    getTime() {
        return this.audioCtx.currentTime;
    }

    /**
    * Start reproduction.
    * AudioContext decode data into a decodedBuffer and send it to destination by setting the result
    * in bufferSource which has to be initialized every call.
    * @param {number} initialTime - Reproduction initial time.
    * @param {function} callback - Animation function.
    * @async
    */
    reproduce(initialTime, callback) {      
        this.source = this.audioCtx.createBufferSource();
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
    * Stops audio reproduction.
    */
    stop() {
        this.source.stop();
    }
}

export default Reproductor;
