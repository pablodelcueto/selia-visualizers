import headerReader from './headerReader';


const MAX_FILE_SIZE = 50000000; // 50 MB
const MINIMUM_DATA_SIZE = 10240; // 10.24 KB
const CHECK_HEADER_DELAY = 5;
const MAX_TRIES_AUDIO_READ = 10000;

export default class AudioFile {
    /**
    * This class waits until header in WAV file has been read and then it starts reading the whole file
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
    * Starts reading data on url.
    * @param {string} url - WAV file url.
    */
    startLoading(url) {
        fetch(url)
            .then((response) => {
                const stream = response.body.getReader();
                this.readStream(stream);
            });
    }

    isDone() {
        return this.isDone;
    }

    /**
    * @return {Object} Object containing WAV info: totalSize, sampleRate, channels, sampleSize,
    * dataStart, size, durationTime.
    * 
    */
    readHeader() {
        const header = headerReader(this.rawDataArray);
        const { fmt } = header;
        const duration = (8.0 * header.dataSize) / (fmt.nChannels * fmt.wBitsPerSample * fmt.nSamplesPerSec);

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
    * @param {number} time - Time.
    * @param {int} channel - Specifies number of channel requested.
    * @return {int} data array index matched with time in requested channel.
    */
    getIndex(time, channel) {
        if (!(channel)) channel = 0;

        const index = Math.floor(time * this.mediaInfo.sampleRate);
        return index * this.mediaInfo.channels + channel;
    }

    /**
    * @param {number} time - Time.
    * @return {int} WAV index matched with time.
    */
    getWavIndexFromTime(time) {
        return Math.floor(time * this.mediaInfo.sampleRate);
    }

    /**
    * @param {int} index - WAV index.
    * @return {number} time of audio matching index.
    */
    getTime(index) {
        return index / this.mediaInfo.sampleRate;
    }

    /**
    * @param {int} bufferIndex - WAV index.
    * @return {int} first WAV index composing bufferIndex value.
    * Each buffer value is composed of 8 values in WAV, buffer is Uint8Array.
    */
    bufferIndexToWavIndex(bufferIndex) {
        return Math.floor(
            (8 * (bufferIndex - this.mediaInfo.dataStart)) / (this.mediaInfo.sampleSize * this.mediaInfo.channels),
        );
    }

    /**
    * @return {int} WAV index corresponding to last  value loaded in buffer.
    */
    getLastWavIndex() {
        return this.bufferIndexToWavIndex(this.lastIndex);
    }

    /**
    * @param {int} index - WAV index.
    * @return {boolean} True in case WAV index value has already been loaded to buffer.
    */
    canRead(index) {
        return index <= this.getLastWavIndex();
    }

    /**
    * @param {int} index - index number.
    * @return {boolean} True in case index number is one of WAV file.
    */
    isIndexInFile(index) {
        return index < this.mediaInfo.totalSize;
    }

    /**
    * @param {Object} Contains different posibilities to request data. It could be for
    * example: initialIndex and finalIndex, or in could be initialIndex and duration in Time.
    * It can also specify channel requested.
    * @return {Object} With initial and final index from data obtained, data and value of last
    * buffer index.
    * Used to extract data in buffer.
    */
    /* eslint-disable no-param-reassign */
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
        };
    }
    /* eslint-enable no-param-reassign */

    /**
    * @param {int} start - buffer index to start slicing buffer.
    * @param {int} end - buffer index to end slicing buffer.
    * @return {Object} - subBuffer of buffer from start to end.
    */
    /* eslint-disable no-param-reassign */
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
    }
    /* eslint-enable no-param-reassign */


    /**
    * @return {boolen} False if mediaInfo is missing or if buffer hasn't reach a minimum size.
    */
    isReady() {
        if (!(this.mediaInfo)) return false;
        return this.getLastWavIndex() > MINIMUM_DATA_SIZE;
    }

    /**
    * @param{Object} stream - Flow of data from url.
    * Asynchronously data is streamed from server and set into audioBuffer this.rawDataArray.
    * It also computes loading progress.
    */
    async readStream(stream) {
        while (true) {
            const { done, value } = await stream.read();

            if (done) { // waits untill audio buffer is filled or data is over.
                this.done = true;
                break;
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
        }
    }

    /**
    * Keeps checking every CHECK_HEADER_DELAY if buffer is ready to start asking information to it.
    */
    waitUntilReady() {
        let tries = 0;

        return new Promise((resolve, reject) => {
            const checkIfReady = () => {
                // Will reject the promise after many tries.
                if (tries > MAX_TRIES_AUDIO_READ) {
                    reject();
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
