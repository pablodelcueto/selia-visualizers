import headerReader from './headerReader';


const MAX_FILE_SIZE = 10000000;
const MINIMUM_DATA_SIZE = 10240*30;


export default class AudioFile {
  constructor(itemInfo) {
    this.url = itemInfo.url;

    this.lastIndex = 0;
    this.loadingProgress = 0;
    this.rawDataArray = new Uint8Array(MAX_FILE_SIZE);
    this.mediaInfo;

    this.startLoading();
  }

  startLoading() {

    fetch(this.url)
      .then((response) => {
        var stream = response.body.getReader();
        this.readStream(stream);
    })
  }

  readHeader() {
    let header = headerReader(this.rawDataArray);
    this.mediaInfo = {
      totalSize: header['chunkSize'] + 8,
      sampleRate: header['nSamplesPerSec'],
      channels: header['nChannels'],
      sampleSize: header['wBitsPerSample'],
      dataStart: header['dataStart'],
      size: header['dataSize'],
      duration: 8.0 * header['dataSize'] / (header['nChannels'] * header['wBitsPerSample'] * header['nSamplesPerSec'])
    }
  }

  getIndex(time, channel) {
    if (!(channel)) channel = 0;

    let index = Math.floor(time  * this.mediaInfo.sampleRate);
    return index * this.mediaInfo.channels + channel;
  }

  getTime(index) {
    let indexNoChannel = Math.floor(index / this.mediaInfo.channels);
    return indexNoChannel / this.mediaInfo.sampleRate;
  }

  read({startIndex=0, startTime=null, endIndex=-1, endTime=null, durationIndex=null, durationTime=null, channel=0} = {}) {
    let lastIndex = Math.floor((this.lastIndex - this.mediaInfo.dataStart) / this.mediaInfo.channels);

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
      let channels = this.mediaInfo.channels;
      array = array.filter((element, index) => ((index - channel) % channels == 0))
    }

    return {
      start: startIndex,
      end: endIndex,
      data: array,
      lastIndex: this.lastIndex
    }

  }

  getSlice(start, end) {
    let sampleSize = this.mediaInfo.sampleSize
    start = this.mediaInfo.dataStart + this.mediaInfo.channels * start * (this.mediaInfo.sampleSize / 8)
    end = this.mediaInfo.dataStart + this.mediaInfo.channels * end * (this.mediaInfo.sampleSize / 8)

    if (sampleSize === 8) {
      return new Int8Array(this.rawDataArray.slice(start, end).buffer);
    } else if (sampleSize == 16) {
      return new Int16Array(this.rawDataArray.slice(start, end).buffer);
    } else if (sampleSize == 32) {
      return new Int32Array(this.rawDataArray.slice(start, end).buffer);
    } else if (sampleSize == 64) {
      return new BigInt64Array(this.rawDataArray.slice(start, end).buffer);
    }
  }

  isReady() {
    if (!(this.mediaInfo)) return false;

    let currentDataSize = (
      (this.lastIndex - this.mediaInfo.dataStart) /
      (this.mediaInfo.sampleSize / 8))
    return currentDataSize > MINIMUM_DATA_SIZE * this.mediaInfo.channels;
  }

  async readStream(stream) {
    while (true) {
      let {done, value} = await stream.read();

      if (done) {
        break;
      }

      let length = value.length;
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
