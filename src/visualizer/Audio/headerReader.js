const WAVE_FORMAT_PCM = 0x0001;
const WAVE_FORMAT_IEEE_FLOAT = 0x0003;
const WAVE_FORMAT_ALAW = 0x0006;
const WAVE_FORMAT_MULAW = 0x0007;
const WAVE_FORMAT_EXTENSIBLE = 0xFFFE;
const WAVE_FORMAT_MAP = {
  [WAVE_FORMAT_PCM]: 'PCM',
  [WAVE_FORMAT_IEEE_FLOAT]: 'IEEE float',
  [WAVE_FORMAT_ALAW]: '8-bit ITU-T G.711 A-law',
  [WAVE_FORMAT_MULAW]: '8-bit ITU-T G.711 µ-law',
  [WAVE_FORMAT_EXTENSIBLE]: 'subformat'
}


const decoder = new TextDecoder("utf-8")


function headerReader(array) {
  let headerInfo = {};
  headerInfo['chunkId'] = decoder.decode(array.slice(0, 4));
  headerInfo['chunkSize'] = new Uint32Array(array.slice(4, 8).buffer)[0];
  headerInfo['wavId'] = decoder.decode(array.slice(8, 12));
  let chunks = getChunks(array.slice(12));
  Object.assign(headerInfo, readFormatInformation(chunks['fmt '].chunk, chunks['fmt '].size));
  if ('fact' in chunks) Object.assign(headerInfo, readFactInfo(chunks['fact'].chunk));
  headerInfo['dataSize'] = chunks.data.size;
  headerInfo['dataStart'] = chunks.data.index;
  return headerInfo;
}


function getChunks(array) {
    let chunks = {};

    let index = 0;
    while (true) {
      let chunkInfo = readChunk(array, index);
      chunks[chunkInfo.id] = chunkInfo;
      if (chunkInfo.id === 'data') break;

      index += 8 + chunkInfo.size;
    }

    return chunks;
}

function readChunk(array, index) {
  let id = decoder.decode(array.slice(index, index + 4));
  let size = new Uint32Array(array.slice(index + 4, index + 8).buffer)[0];
  let chunk = array.slice(index + 8, index + 8 + size);

  return {
    index: index + 8,
    id: id,
    size: size,
    chunk: chunk
  }
}

function readFormatInformation(array, size) {
  let formatInfo = {};

  formatInfo['fmtTagCode'] = new Uint16Array(array.slice(0, 2).buffer)[0];
  formatInfo['fmtTag'] = WAVE_FORMAT_MAP[formatInfo['fmtTagCode']];
  formatInfo['nChannels'] = new Uint16Array(array.slice(2, 4).buffer)[0];
  formatInfo['nSamplesPerSec'] = new Uint32Array(array.slice(4, 8).buffer)[0];
  formatInfo['nAvgBytesPerSec'] = new Uint32Array(array.slice(8, 12).buffer)[0];
  formatInfo['nBlockAlign'] = new Uint16Array(array.slice(12, 14).buffer)[0];
  formatInfo['wBitsPerSample'] = new Uint16Array(array.slice(14, 16).buffer)[0];
  if (size == 16) return formatInfo;

  formatInfo['cbSize'] = new Uint16Array(array.slice(16, 18).buffer)[0];
  if (size == 18) return formatInfo;

  formatInfo['wValidBitsPerSample'] = new Uint16Array(array.slice(18, 20).buffer)[0];
  formatInfo['dwChannelMask'] = new Uint32Array(array.slice(20, 24).buffer)[0];
  formatInfo['SubFormat'] = new Uint32Array(array.slice(20, 24).buffer)[0];
  return formatInfo
}


function readFactInfo(array) {
  let factInfo = {};

  factInfo['factCkId'] = decoder.decode(array.slice(0, 4));
  factInfo['factCksize'] = new Uint32Array(array.slice(4, 8).buffer)[0];
  factInfo['dwSampleLength']= new Uint32Array(array.slice(8, 12).buffer)[0];

  return factInfo;
}


export default headerReader;
