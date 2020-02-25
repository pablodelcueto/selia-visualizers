import headerReader from '../../src/visualizer/Audio/headerReader';
const fs = require('fs');

const TESTS = {
    './tests/data/11k16bitpcm.wav': {
        chunkId: 'RIFF',
        chunkSize: 304570,
        wavId: 'WAVE',
        fmt: {
            fmtTagCode: 1,
            nChannels: 1,
            nSamplesPerSec: 11025,
            nAvgBytesPerSec: 22050,
            nBlockAlign: 2,
            wBitsPerSample: 16,
            size: 16
        },
        dataSize: 304534,
        dataStart: 44
    },
    './tests/data/11k8bitpcm.wav': {
        chunkId: 'RIFF',
        chunkSize: 152304,
        wavId: 'WAVE',
        fmt: {
            fmtTagCode: 1,
            nChannels: 1,
            nSamplesPerSec: 11025,
            nAvgBytesPerSec: 11025,
            nBlockAlign: 1,
            wBitsPerSample: 8,
            size: 16
        },
        dataSize: 152267,
        dataStart: 44
    },
    './tests/data/11kadpcm.wav': {
        chunkId: 'RIFF',
        chunkSize: 77244,
        wavId: 'WAVE',
        fmt: {
            fmtTagCode: 17,
            nChannels: 1,
            nSamplesPerSec: 11025,
            nAvgBytesPerSec: 5588,
            nBlockAlign: 256,
            wBitsPerSample: 4,
            cbSize: 2,
            size: 20
        },
        fact: {
            dwSampleLength: 152267,
            size: 4
        },
        dataSize: 77192,
        dataStart: 60
    },
    './tests/data/11kgsm.wav': {
        chunkId: 'RIFF',
        chunkSize: 30992,
        wavId: 'WAVE',
        fmt: {
            fmtTagCode: 49,
            nChannels: 1,
            nSamplesPerSec: 11025,
            nAvgBytesPerSec: 2239,
            nBlockAlign: 65,
            wBitsPerSample: 0,
            cbSize: 2,
            size: 20
        },
        fact: {
            dwSampleLength: 152267,
            size: 4
        },
        dataSize: 30940,
        dataStart: 60
    },
    './tests/data/11kulaw.wav': {
        chunkId: 'RIFF',
        chunkSize: 152318,
        wavId: 'WAVE',
        fmt: {
            fmtTagCode: 7,
            nChannels: 1,
            nSamplesPerSec: 11025,
            nAvgBytesPerSec: 11025,
            nBlockAlign: 1,
            wBitsPerSample: 8,
            cbSize: 0,
            size: 18
        },
        fact: {
            dwSampleLength: 152267,
            size: 4
        },
        dataSize: 152267,
        dataStart: 58
    },
    './tests/data/8k16bitpcm.wav': {
        chunkId: 'RIFF',
        chunkSize: 221018,
        wavId: 'WAVE',
        fmt: {
            fmtTagCode: 1,
            nChannels: 1,
            nSamplesPerSec: 8000,
            nAvgBytesPerSec: 16000,
            nBlockAlign: 2,
            wBitsPerSample: 16,
            size: 16
        },
        dataSize: 220982,
        dataStart: 44
    },
    './tests/data/8k8bitpcm.wav': {
        chunkId: 'RIFF',
        chunkSize: 110524,
        wavId: 'WAVE',
        fmt: {
            fmtTagCode: 1,
            nChannels: 1,
            nSamplesPerSec: 8000,
            nAvgBytesPerSec: 8000,
            nBlockAlign: 1,
            wBitsPerSample: 8,
            size: 16
        },
        dataSize: 110488,
        dataStart: 44
    },
    //'./tests/data/8kadpcm.wav': {},
    //'./tests/data/8kcelp.wav': {},
    //'./tests/data/8kgsm.wav': {},
    //'./tests/data/8kmp316.wav': {},
    //'./tests/data/8kmp38.wav': {},
    //'./tests/data/8ksbc12.wav': {},
    //'./tests/data/8ktruespeech.wav': {},
    //'./tests/data/8kulaw.wav': {},
};


function recursiveCheck(object1, object2) {
    for (var key in object1) {
        let value1 = object1[key];

        if (typeof(value1) === 'string' || typeof(value1) === 'number') {
            expect(object2).toHaveProperty(key, value1);
        } else {
            expect(object2).toHaveProperty(key);

            if (key in object2) {
                recursiveCheck(value1, object2[key]);
            }
        }
    }
}


test('reads the wav header correctly', () => {
    for (var file in TESTS) {
        let wav = new Uint8Array(fs.readFileSync(file));
        let header = headerReader(wav);
        let trueHeaderInfo = TESTS[file];
        recursiveCheck(trueHeaderInfo, header);
    }
});
