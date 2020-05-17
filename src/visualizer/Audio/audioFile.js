/**
* Audio file reader module.
*
* @module Audio/audioFile
* @see module:Audio/audioFile.js
*/
import headerReader from './headerReader';

/**
* A audioData object stores the information returned by the audioFile when requested.
* @typedef module:Audio/audioFile.audioData
* @type {Object}
* @property {int} start - The number of the first buffer index
* included in the returned data.
* @property {int} end - The number of the last buffer index
* in the returned data.
* @property {Object} data - An array holding the raw data.
* @property {int} lastIndex - Last buffer index already loaded with audio data.
*/


/** Audio maximum bytes size. */
const MAX_FILE_SIZE = 50000000; // 50 MB

/** Audio minimum bytes size. */
const MINIMUM_DATA_SIZE = 10240; // 10.24 KB

/** Time between header revisions. */
const CHECK_HEADER_DELAY = 5;

/** Maximun number of tries at file reading. */
const MAX_TRIES_AUDIO_READ = 10000;


/**
* @class
* Class that loads and serves audio data from url.
*
* This class waits until WAV header has been read to start serving audio data.
* @property {module:Audio/audioFile.mediaInfo} mediaInfo - WAV configurations.
* @property {Uint8Array} rawDataArray - Array with WAV data.
* @property {number} loadingProgress - File percentage loaded in rawDataArray.
*/
class AudioFile {
    /**
    * Constructs an AudioFile object.
    * @constructor
    * @param {string} url - WAV file url.
    */
    constructor(url) {
        // Data buffer.
        this.rawDataArray = new Uint8Array(MAX_FILE_SIZE);

        // Last index loaded in buffer.
        this.lastIndex = 0;
        this.loadingProgress = 0;

        // WAV file info.
        this.mediaInfo = null;

        // turns true when loadingProgress = 100%;
        this.done = false;

        this.startLoading(url);
    }

    /**
    * Starts reading data from url.
    * @param {string} url - WAV file url.
    * @async
    */
    startLoading(url) {
        fetch(url)
            .then((response) => {
                const stream = response.body.getReader();
                this.readStream(stream);
            });
    }

    /**
    * Checks if audio data loading is done.
    *
    * This will ocurr either when all audio data has been downloaded from
    * the url or when the audiobuffer is full.
    *
    * @return {boolean} True in case it has finished.
    */
    isDone() {
        return this.isDone;
    }

    /**
    * Media info object stores information about the audio file format.
    * @typedef module:Audio/audioFile.mediaInfo
    * @type {Object}
    * @property {number} totalSize - File total size in bytes.
    * @property {number} sampleRate - Number of samples per second.
    * @property {number} channels - Number of channels.
    * @property {number} sampleSize - Bits per sample.
    * @property {number} dataStart - Data starting byte.
    * @property {number} size - Data size in bytes.
    * @property {number} durationTime - Audio file duration time.
    */

    /**
    * Extract file header information.
    * @return {module:Audio/audioFile.mediaInfo}
    */
    readHeader() {
        const header = headerReader(this.rawDataArray);
        const { fmt } = header;
        const duration = (
            (8.0 * header.dataSize)
            / (fmt.nChannels * fmt.wBitsPerSample * fmt.nSamplesPerSec));
        return {
            totalSize: header.chunkSize + 8,
            sampleRate: fmt.nSamplesPerSec,
            channels: fmt.nChannels,
            sampleSize: fmt.wBitsPerSample,
            dataStart: header.dataStart,
            size: header.dataSize,
            durationTime: duration,
        };
    }

    /**
    * Get the buffer index corresponding to the given time and channel.
    *
    * The buffer index holds raw binary data. The returned index refers to the byte
    * number within the buffer and not to the audio sample number.
    *
    * @param {number} time - Time.
    * @param {int} channel - Audio channel.
    * @return {int} WAV index.
    */
    getIndex(time, channel) {
        if (!(channel)) channel = 0;

        const index = this.getWavIndexFromTime(time);
        return index * this.mediaInfo.channels + channel;
    }

    /**
    * Get audio array index correspoding to the given time.
    *
    * The returned index refers to the audio sample number within the audio array. Thus
    * if the corresponding index to time `t` is `n`, this means that at time `t` the
    * `n`-th audio sample was taken.
    *
    * @param {number} time - Time.
    * @return {int} WAV index.
    */
    getWavIndexFromTime(time) {
        return Math.floor(time * this.mediaInfo.sampleRate);
    }

    /**
    * Get time corresponding to the given wav array index.
    *
    * @param {int} index - WAV index.
    * @return {number} Audio time.
    */
    getTime(index) {
        return index / this.mediaInfo.sampleRate;
    }

    /**
    * Get WAV index from raw file buffer index.
    *
    * The audio buffer contains raw binary data. This method will translate
    * byte index within the raw data into wav sample index. This depends on
    * the number of channels, the sample size in bytes and the size of the header.
    *
    * @param {int} bufferIndex - Buffer index value.
    * @return {int} WAV index matching bufferIndex value.
    */
    bufferIndexToWavIndex(bufferIndex) {
        return Math.floor(
            (8 * (bufferIndex - this.mediaInfo.dataStart))
            / (this.mediaInfo.sampleSize * this.mediaInfo.channels),
        );
    }

    /**
    * Get last WAV index loaded in buffer.
    * @return {int} WAV index.
    */
    getLastWavIndex() {
        return this.bufferIndexToWavIndex(this.lastIndex);
    }

    /**
    * Check if requested wav index has been loaded into the audio array.
    * @param {int} index - WAV index.
    * @return {boolean} True in case WAV index value has already been loaded to buffer.
    */
    canRead(index) {
        return index <= this.getLastWavIndex();
    }

    /**
    * Checks if index exists in file.
    * @param {int} index - index number.
    * @return {boolean} True in case index is less that WAV file length.
    */
    isIndexInFile(index) {
        return index < this.mediaInfo.totalSize;
    }

    /**
    * Extracts audio data from buffer.
    *
    * Main method for data extraction. Data can be requested in several ways:
    * 1. If no argument is given, the all currently loaded data will be returned.
    * 2. If startIndex or startTime are provided, the returned data will only contain audio
    * samples later than startTime or the time corresponding to startIndex, see
    * {@link module:Audio/audioFile~AudioFile#getWavIndexFromTime|getWavIndexFromTime}.
    * If both are given at the same time only startTime will be used.
    * 3. If endTime or endIndex are provided, the returned data will only contain audio
    * samples before than endTime or the time corresponding to endIndex. If both are given
    * at the same time only endTime will be used.
    * 4. If durationTime or durationIndex are provided, the returned data will only contain
    * audio samples contained in the interval [startTime, startTime + durationTime], where
    * startTime is either the default value or user specified (as in point 2). DurationIndex
    * will be translated into time if provided. If both are given at the same time only
    * durationTime will be used.
    * 5. If channel argument is provided the resulting data will be read from the desired
    * channel. Otherwise it will default to the first channel.
    *
    * The returned data will contain all loaded values within the specified interval, but it
    * may return a fraction of the requested data if loading is not complete. The bounds of
    * the returned data are specified in the returned object.
    *
    * @param {number} [startIndex] - First buffer index in requested slice.
    * @param {number} [startTime] - Initial time in requested slice. Alternative to startIndex.
    * @param {number} [endIndex] - Final buffer index in requested slice.
    * @param {number} [endTime] - Final time in requested slice. Alternative to endIndex.
    * @param {number} [durationIndex] - Slice length of requested data.
    * @param {number} [durationTime] - Time length of requested data. Alternative to durationIndex.
    * @param {number} [channel] - Requested audio channel.
    * @return {module:Audio/audioFile.audioData} An object that contains results of requested data
    * and indicators specifying initial index and final index of returned data.
    * @public
    */
    read({
        startIndex = 0,
        startTime = null,
        endIndex = -1,
        endTime = null,
        durationIndex = null,
        durationTime = null,
        channel = 0,
    } = {}) {
        const lastBufferIndex = this.getLastWavIndex();

        if (startTime !== null) {
            startIndex = this.getIndex(startTime);
        }

        if (endIndex < 0) {
            endIndex = lastBufferIndex;
        }

        if (endTime !== null) {
            endIndex = this.getIndex(endTime);
        }

        if (durationTime < 0) {
            endIndex = lastBufferIndex;
        }

        if (durationTime !== null) {
            durationIndex = this.getIndex(durationTime);
        }

        if (durationIndex !== null) {
            endIndex = startIndex + durationIndex;
        }

        startIndex = Math.max(0, startIndex);
        endIndex = Math.min(lastBufferIndex, endIndex);

        let array = this.getSlice(startIndex, endIndex);

        if (this.mediaInfo.channels > 1) {
            const { channels } = this.mediaInfo;
            array = array.filter((element, index) => ((index - channel) % channels === 0));
        }

        return {
            start: startIndex,
            end: endIndex,
            data: array,
            lastIndex: lastBufferIndex,
            startTime: this.getWavIndexFromTime(startIndex),
            endTime: this.getWavIndexFromTime(endIndex)
        };
    }

    /**
    * @param {int} start - buffer index to start slicing buffer.
    * @param {int} end - buffer index to end slicing buffer.
    * @return {Object} - subBuffer of buffer from start to end.
    */
    getSlice(start, end) {
        const [dataStart] = [this.mediaInfo.dataStart];
        const [sampleSize] = [this.mediaInfo.sampleSize];
        const [channels] = [this.mediaInfo.channels];

        start = dataStart + channels * start * (sampleSize / 8);
        end = dataStart + channels * end * (sampleSize / 8);

        if (sampleSize === 8) {
            return new Int8Array(this.rawDataArray.slice(start, end).buffer);
        } if (sampleSize === 16) {
            return new Int16Array(this.rawDataArray.slice(start, end).buffer);
        } if (sampleSize === 32) {
            return new Int32Array(this.rawDataArray.slice(start, end).buffer);
        } if (sampleSize === 64) {
            return new BigInt64Array(this.rawDataArray.slice(start, end).buffer);
        }

        throw new Error('Incompatible sample size');
    }


    /**
    * Checks if audio file object is ready to be read.
    *
    * This will happen after the wav header has been successfuly read and a minimum number
    * of audio samples has been read from the file.
    *
    * @return {boolean} False if mediaInfo is missing or if buffer hasn't reach a minimum size.
    * @public
    */
    isReady() {
        if (!(this.mediaInfo)) return false;
        return this.getLastWavIndex() > MINIMUM_DATA_SIZE;
    }

    /**
    * Fills mediaInfo data and streams data from server into rawDataArray.
    * @param{Object} stream - Flow of data from url.
    * @async
    */
    async readStream(stream) {
        const { done, value } = await stream.read();

        if (done) {
            this.done = true;
            return;
        }

        const { length } = value;
        this.rawDataArray.set(value, this.lastIndex);
        this.lastIndex += length;

        if (this.mediaInfo) {
            this.loadingProgress = 100 * (this.lastIndex / this.mediaInfo.totalSize);
        }

        if (this.lastIndex > 1000 && !(this.mediaInfo)) {
            this.mediaInfo = this.readHeader();
        }

        this.readStream(stream);
    }

    /**
    * Waits until buffer can serve data.
    */
    waitUntilReady() {
        let tries = 0;

        return new Promise((resolve, reject) => {
            const checkIfReady = () => {
                // Will reject the promise after many tries.
                if (tries > MAX_TRIES_AUDIO_READ) {
                    reject(new Error('Too many audio file read tries.'));
                }

                if (this.isReady()) {
                    resolve();
                } else {
                    tries += 1;
                    // Will wait for a set time and check again if audio reader is ready
                    setTimeout(checkIfReady, CHECK_HEADER_DELAY);
                }
            };

            checkIfReady();
        });
    }
}

export default AudioFile;
