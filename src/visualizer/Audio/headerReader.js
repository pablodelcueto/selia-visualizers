/**
* File header reader module.
*
* @module Audio/headerReader
* @see module:Audio/headerReader.js
*/


// WAVE format codes.
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
    [WAVE_FORMAT_EXTENSIBLE]: 'subformat',
};

/**
* @typedef module:Audio/headerReader.chunk
* @type {Object} 
* @property {number} index - Chunk initial index in file.
* @property {string} id - Chunk identifier.
* @property {number} size - Chunk size.
* @property {Object} chunk - Chunk data.   
*/

/**
* Read information in a file header chunk.
* @param {Object} array - Array containing data to read.
* @param {int} index - Initial Index in array to read.
* @return {module:Audio/headerReader.chunk} 
*/
function readChunk(array, index) {
    // id fmt subchunk describes  sound's data format
    // id data subchunk contains the size of the data and the sound. 
    const id = String.fromCharCode.apply(this, array.slice(index, index + 4));
    const size = new Uint32Array(array.slice(index + 4, index + 8).buffer)[0];
    const chunk = array.slice(index + 8, index + 8 + size);
    return {
        index: index + 20, // 8 of id and size plus 12 of RIFF header
        id: id,
        size: size,
        chunk: chunk
    };
}

/**
* Get chunks in file header.
* @param {Obejct} array - Array containing RIFF format WAVE file.
* @return {Object} - With chunks contained in WAV header.
*/
function getChunks(array) {
    const chunks = {};

    let index = 0;
    while (index < 10000) { // constant to avoid method to repeat inside audio data.
        const chunkInfo = readChunk(array, index);
        console.log('chunkInfo', chunkInfo);
        chunks[chunkInfo.id] = chunkInfo;
        if (chunkInfo.id === 'data') break;
        index += 8 + chunkInfo.size;
    }
    return chunks;
}


/**
* Format info in header.
* @typedef module:Audio/headerReader.formatInfo
* @type {Object}
* @property {number} fmtTagCode - WAV format code.
* @property {number} fmtTag - WAV format name.
* @property {string} nChannels - Number of channels.
* @property {number} nSamplesPerSec - Samples per second.
* @property {number} mAvgBytesPerSec - Average bytes per second.
* @property {number} nBlockAlign - Bytes number for one sample including all channels.
* @property {number} wBitsPerSample - Bits per sample.
*/

/**
* Data in fmt chunk.
* @param {Object} array -  WAV array (with RIFF format data).
* @return {module:Audio/headerReader.formatInfo} 
*/
function readFormatInformation(array, size) {
    const formatInfo = {};

    formatInfo.fmtTagCode = new Uint16Array(array.slice(0, 2).buffer)[0];
    formatInfo.fmtTag = WAVE_FORMAT_MAP[formatInfo.fmtTagCode];
    formatInfo.nChannels = new Uint16Array(array.slice(2, 4).buffer)[0];
    formatInfo.nSamplesPerSec = new Uint32Array(array.slice(4, 8).buffer)[0];
    formatInfo.nAvgBytesPerSec = new Uint32Array(array.slice(8, 12).buffer)[0];
    formatInfo.nBlockAlign = new Uint16Array(array.slice(12, 14).buffer)[0];
    formatInfo.wBitsPerSample = new Uint16Array(array.slice(14, 16).buffer)[0];

    if (size === 16) return formatInfo;

    formatInfo.cbSize = new Uint16Array(array.slice(16, 18).buffer)[0];
    if (size === 18) return formatInfo;

    // in case WAV fmt has extra info
    formatInfo.wValidBitsPerSample = new Uint16Array(array.slice(18, 20).buffer)[0];
    formatInfo.dwChannelMask = new Uint32Array(array.slice(20, 24).buffer)[0];
    formatInfo.SubFormat = new Uint32Array(array.slice(20, 24).buffer)[0];
    return formatInfo;
}

/** 
* Data in fact chunk (it migth not exist).
* @param {Object} array - WAV array (with RIFF format data).
* @return {Object}  Fact chunk info
*/
function readFactInformation(array) {
    const factInfo = {};
    factInfo.dwSampleLength = new Uint32Array(array.slice(0, 4).buffer)[0];
    return factInfo;
}

/** 
* @typedef module:Audio/headerReader.headerInfo
* @type {Object}
* @property {string} chunkId - "RIFF".
* @property {number} chunkSize - Bytes file size.
* @property {string} wavId - "WAVE".
* @property {module:Audio/headerReader.formatInfo} fmt - Format information.
* @property {Object} fact - Fact information if available.
* @property {number} dataSize - Data size in bytes.
* @property {number} dataStart - Data initial byte.
*/ 

/**
* Get file header data.
* @param {Object} array -  WAV array (with RIFF format data).
* @return {module:Audio/headerReader.headerInfo} 
*/
function headerReader(array) {
    const headerInfo = {};
    headerInfo.chunkId = String.fromCharCode.apply(this, array.slice(0, 4));
    headerInfo.chunkSize = new Uint32Array(array.slice(4, 8).buffer)[0];
    headerInfo.wavId = String.fromCharCode.apply(this, array.slice(8, 12));

    const chunks = getChunks(array.slice(12));
    const formatInfo = readFormatInformation(chunks['fmt '].chunk, chunks['fmt '].size);
    formatInfo.size = chunks['fmt '].size;
    headerInfo.fmt = formatInfo;

    if ('fact' in chunks) {
        const factInfo = readFactInformation(chunks.fact.chunk);
        factInfo.size = chunks.fact.size;
        headerInfo.fact = factInfo;
    }

    headerInfo.dataSize = chunks.data.size;
    headerInfo.dataStart = chunks.data.index;

    console.log('headerInfo', headerInfo);

    return headerInfo;
}


export default headerReader;
