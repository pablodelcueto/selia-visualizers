/**
* Audio player module.
*
* @module Audio/reproductor
* @see module:Audio/reproductor.js
*/

/** Time between done checks. */
const CHECK_PLAYER_DELAY = 100;

/** Maximun number of tries while waiting for audio load to be done. */
const MAX_TRIES_PLAYER_READY = 10000;

/**
* Class used to define and use an audioContext for audioFile.
* This class is used to reproduce wav file in synchronization with an animation.
* @class
* @property {Object} audioFile - Audio file.
* @property {boolean} ready - Boolean flag. True when audio data has been loaded.
* @property {AudioContext} audioCtx - AudioContext.
*/
class AudioPlayer {
    /**
    * Creates a AudioPlayer Object.
    * @constructor
    * @param {object} audioFile - Class uncoding wav file.
    */
    constructor(audioFile) {
        this.audioFile = audioFile;
        this.audioCtx = new AudioContext();

        // Placeholders for audio buffer and source node.
        this.decodedBuffer = null;
        this.source = null;

        // Timekeeping
        this.ctxTimestamp = null;
        this.audioTimestamp = null;

        this.ready = false;

        // Load data when ready
        this.audioFile.waitUntilDone().then(() => this.loadAudio());
    }

    /**
     * Get current time in Audio playback.
     * @return {number}
     * @public
     */
    getTime() {
        const timeDelta = this.audioCtx.currentTime - this.ctxTimestamp;
        return this.audioTimestamp + timeDelta;
    }

    /**
     * Load and decode WAV data.
     * @private
     */
    loadAudio() {
        this.audioCtx
            .decodeAudioData(this.audioFile.getRawData())
            .then((decodedBuffer) => {
                this.decodedBuffer = decodedBuffer;
                this.ready = true;
            });
    }

    /**
    * Start reproduction at desired time.
    * AudioContext decode data into a decodedBuffer and send it to destination by setting the result
    * in bufferSource which has to be initialized every call.
    * @param {number} initialTime - Reproduction initial time.
    * @param {function} callback - Animation function.
    * @public
    * @async
    */
    reproduce(initialTime, callback) {
        this.waitUntilReady().then(() => {
            this.source = this.audioCtx.createBufferSource();
            this.source.buffer = this.decodedBuffer;
            this.source.connect(this.audioCtx.destination);
            this.source.start(this.audioCtx.currentTime, initialTime);

            this.ctxTimestamp = this.audioCtx.currentTime;
            this.audioTimestamp = initialTime;

            callback();
        });
    }

    /**
    * Stops audio reproduction.
    * @public
    */
    stop() {
        if (this.source === null) return;
        this.source.stop();
    }

    /**
    * Wait until player has decoded audio data.
    * @return {Promise} - Will resolve when Audio data has been decoded.
    * @private
    */
    waitUntilReady() {
        let tries = 0;

        return new Promise((resolve, reject) => {
            const checkIfReady = () => {
                // Will reject the promise after many tries.
                if (tries > MAX_TRIES_PLAYER_READY) {
                    reject(new Error('Audio Player is taking too long.'));
                }

                if (this.ready) {
                    resolve();
                } else {
                    tries += 1;
                    // Will wait for a set time and check again if audio reader is ready
                    setTimeout(checkIfReady, CHECK_PLAYER_DELAY);
                }
            };

            checkIfReady();
        });
    }
}

export default AudioPlayer;
