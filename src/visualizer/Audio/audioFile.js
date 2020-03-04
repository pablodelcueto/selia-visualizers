import headerReader from './headerReader';


const MAX_FILE_SIZE = 60000000; // 50 MB
const MINIMUM_DATA_SIZE = 10240; // 10.24 KB


export default class AudioFile {
    constructor(itemInfo) {
        this.url = itemInfo.url;

        this.lastIndex = 0;
        this.loadingProgress = 0;
        this.rawDataArray = new Uint8Array(MAX_FILE_SIZE);
        this.mediaInfo = null;
        this.done = false;

        this.startLoading();
    }

    startLoading() {
        fetch(this.url)
            .then((response) => {
                const stream = response.body.getReader();
                this.readStream(stream);
            });
    }

    isDone() {
        return this.done;
    }

    readHeader() {
        const header = headerReader(this.rawDataArray);
        const { fmt } = header;
        const duration = (8.0 * header.dataSize) / (fmt.nChannels * fmt.wBitsPerSample * fmt.nSamplesPerSec);

        this.mediaInfo = {
            totalSize: header.chunkSize + 8,
            sampleRate: fmt.nSamplesPerSec,
            channels: fmt.nChannels,
            sampleSize: fmt.wBitsPerSample,
            dataStart: header.dataStart,
            size: header.dataSize,
            duration,
        };
    }

    getIndex(time, channel) {
        if (!(channel)) channel = 0;

        const index = Math.floor(time * this.mediaInfo.sampleRate);
        return index * this.mediaInfo.channels + channel;
    }

    getWavIndexFromTime(time, channel) {
        return Math.floor(time * this.mediaInfo.sampleRate);
    }

    getTime(index) {
        return index / this.mediaInfo.sampleRate;
    }

    bufferIndexToWavIndex(index) {
        return Math.floor(
            8 * (index - this.mediaInfo.dataStart) / (this.mediaInfo.sampleSize * this.mediaInfo.channels),
        );
    }

    getLastWavIndex() {
        return this.bufferIndexToWavIndex(this.lastIndex);
    }

    canRead(index) {
        return index < this.getLastWavIndex();
    }

    isIndexInFile(index) {
        return index < this.mediaInfo.totalSize;
    }

    read({
        startIndex = 0, startTime = null, endIndex = -1, endTime = null, durationIndex = null, durationTime = null, channel = 0,
    } = {}) {
        const lastIndex = this.getLastWavIndex();

        if (startTime !== null) {
            startIndex = this.getIndex(startTime);
        }

        if (endIndex < 0) {
            endIndex = lastIndex;
        }

        if (endTime !== null) {
            endIndex = this.getIndex(endTime);
        }

        if (durationTime < 0) {
            endIndex = lastIndex;
        }

        if (durationTime !== null) {
            durationIndex = this.getIndex(durationTime);
        }

        if (durationIndex !== null) {
            endIndex = startIndex + durationIndex;
        }

        startIndex = Math.max(0, startIndex);
        endIndex = Math.min(lastIndex, endIndex);

        let array = this.getSlice(startIndex, endIndex);

        if (this.mediaInfo.channels > 1) {
            const { channels } = this.mediaInfo;
            array = array.filter((element, index) => ((index - channel) % channels == 0));
        }

        return {
            start: startIndex,
            end: endIndex,
            data: array,
            lastIndex: this.lastIndex,
        };
    }

    getSlice(start, end) {
        const { sampleSize } = this.mediaInfo;
        start = this.mediaInfo.dataStart + this.mediaInfo.channels * start * (this.mediaInfo.sampleSize / 8);
        end = this.mediaInfo.dataStart + this.mediaInfo.channels * end * (this.mediaInfo.sampleSize / 8);

        if (sampleSize === 8) {
            return new Int8Array(this.rawDataArray.slice(start, end).buffer);
        } if (sampleSize == 16) {
            return new Int16Array(this.rawDataArray.slice(start, end).buffer);
        } if (sampleSize == 32) {
            return new Int32Array(this.rawDataArray.slice(start, end).buffer);
        } if (sampleSize == 64) {
            return new BigInt64Array(this.rawDataArray.slice(start, end).buffer);
        }
    }

    isReady() {
        if (!(this.mediaInfo)) return false;
        return this.getLastWavIndex() > MINIMUM_DATA_SIZE;
    }

    async readStream(stream) {
        while (true) {
            const { done, value } = await stream.read();

            if (done) {
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
                this.readHeader();
            }
        }
    }
}
