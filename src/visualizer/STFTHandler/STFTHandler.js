import * as tf from '@tensorflow/tfjs';

// Tamaño máximo del buffer para los valores del STFT
const STFT_BUFFER_MAX_SIZE = 1024 * 5000;

// Número de columnas a calcular en cada computo del STFT.
const COLUMNS_PER_STFT_COMPUTATION = 20;

// Read audio component behaviour
const CHECK_HEADER_DELAY = 5;
const CHECK_READABILITY_DELAY = 5;
const MAX_TRIES_AUDIO_READ = 10000;
const MAX_TRIES_GET_AUDIO_DATA = 10000;

const SHIFT_COLUMN_HOP = 200;
const SHIFT_COLUMN_BUFFER = 100;

const INIT_CONFIG = {
    stft: {
        window_size: 1024,
        hop_length: 256,
        window_function: 'hann',
    },
    startTime: 0.0,
};


/**
 * Get windowing function for the short time fourier transform.
 * @param {string} windowFunction  Type of windowing function: hann, hamming or none
 * @param {int}    size            Size of window.
 */
function getTensorWindowFunction(windowFunction, size) {
    if (windowFunction === 'hann') {
        return tf.signal.hannWindow(size);
    }

    if (windowFunction === 'hamming') {
        return tf.signal.hammingWindow(size);
    }

    // Otherwise we assume the window function is trivial
    return tf.ones([size], 'float32');
}


/**
 * Class that handles all the Short Time Fourier Transform (STFT) computations.
 *
 * The class accesses the wav data in an Audio object and sequentially computes the STFT in small
 * batches. All the resulting computations are stored into a fixed sized buffer for memory control.
 * The class makes the computed data available through the read method. This will return any
 * requested data, if available, and advise otherwise. Since the buffer that stores computations
 * might not be large enough to store the whole spectrogram, when the requested data falls outside
 * the buffer window, the buffer will drop some data, shift, and start the computation of the
 * demanded portions.
 */
class STFTHandler {
    /**
     * Create a STFTHandler object.
     * @constructor
     * @param {AudioFile} audioHandler - The AudioFile object that stores the wav data.
     * @param {Object} [configs] - Optional configuration values for the STFTHandler.
     * @param {Object} [configs.stft] - Configuration values pertaining the STFT calculation.
     * @param {number} [configs.stft.window_size] - The size of window for the fourier transform
     * in the STFT calculation.
     * @param {number} [configs.stft.hop_length] - The hop length between each window in the STFT
     * calculation.
     * @param {string} [configs.stft.hann] - The type of windowing function to use in the fourier
     * transform. Options are: 'hann', 'hamming', 'linear'.
     * @param {number} [configs.startTime] - Time from which to start the computation of the STFT.
     */
    constructor(audioHandler) {
        this.audioHandler = audioHandler;

        // Copy base configuration
        this.config = { ...INIT_CONFIG };

        // Setup for stft calculations
        this.setupSTFT();

        // Wait for Audio Handler to be ready and then start stft calculation and buffer filling.
        this.waitForAudioHandler()
            .then(() => {
                // Setup starting time and indices references
                this.startColumn = this.getStftColumnFromTime(this.config.startTime);
                this.columnWidth = this.getStftColumnFromWavIndex(this.audioHandler.mediaInfo.size);
                this.endColumn = Math.min(this.startColumn + this.bufferColumns, this.columnWidth);

                // Start calculation
                this.computed = {
                    first: this.startColumn,
                    last: this.startColumn,
                };
                this.startSTFTCalculation();
            });
    }

    /** Sets up variables for stft calculation. */
    setupSTFT() {
        // Shape of final spectrogram
        this.bufferColumnHeight = 1 + this.config.stft.window_size / 2;
        this.bufferColumns = Math.floor(STFT_BUFFER_MAX_SIZE / this.bufferColumnHeight);

        // Short Time Fourier Transform auxiliary variables
        this.STFTWindowFunction = getTensorWindowFunction(
            this.config.stft.window_function,
            this.config.stft.window_size,
        );

        const bufferSize = (COLUMNS_PER_STFT_COMPUTATION - 1) * this.config.stft.window_size;
        this.tensorBuffer = tf.tensor1d(new Float32Array(bufferSize));
        this.STFTBuffer = new Float32Array(this.bufferColumns * this.bufferColumnHeight);
    }

    /**
     * Returns a promise that resolves whenever the audio reader is ready for information
     * to be read from it. This happens after the wav header is correctly parsed.
     */
    waitForAudioHandler() {
        let tries = 0;

        return new Promise((resolve, reject) => {
            const checkIfReady = () => {
                // Will reject the promise after many tries.
                if (tries > MAX_TRIES_AUDIO_READ) {
                    reject();
                }

                if (this.audioHandler.isReady()) {
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

    /** Returns current configuration used by the stft handler. */
    getConfig() {
        return this.config;
    }

    /**
     * Changes the configuration of the stft calculator and restarts the calculation
     * @param {Object} config - The new configurations to be set.
     * @param {Object} [config.stft] - Configurations pertaining the short time fourier transform
     * @param {number} [config.stft.window_size] - The size of window to be used in stft (use powers
     * of two.
     * @param {number} [config.stft.hop_length] - The length of hop between every stft frame.
     * @param {string} [config.stft.window_function] - The windowing function to use for the stft
     * calculation.
     * @param {number} [config.startTime] - The moment in time from which the stft calculator starts
     * reading the wav data (seconds).
     */
    setConfig(config) {
        // TODO
        this.resetBuffer();
    }

    /**
     * Returns data from the STFT buffer as requested by the user.
     *
     * It will not provide the requested data if it hasn't been calculated yet. This function will
     * return all calculated data within the request and notify any shortcomings. This method is
     * synchronic and does not contain heavy computations hence fast.
     *
     * @param {number} [startColumn] - Column at which to start reading the data from the STFT.
     * @param {number} [startTime] - Time at which to start reading the data. This will translate
     * into a stft column and data will be read from there.
     * @param {number} [endColumn] - Last column to read from the buffer. If the calculated data is
     * not sufficient will return up to the last computed column.
     * @param {number} [endTime] - Time at which to stop reading the data. This will be translated
     * into a stft column and then handled as endColumn.
     * @param {number} [durationColumns] - Alternative method of specifying when to stop reading
     * data. Will stop reading data until this many columns have been read. This translates into
     * declaring endColum = startColumn + durationColumns.
     * @param {number} [durationTime] - Similar to durationColumns. Will be translated into
     * durationColumns.
     */
    read({
        startColumn = 0,
        startTime = null,
        endColumn = -1,
        endTime = null,
        durationColumns = null,
        durationTime = null,
    } = {}) {
        let startingColumn;
        let endingColumn;
        let columnDuration;

        // If start time is provided get column from this
        if (startTime != null) {
            startingColumn = this.getStftColumnFromTime(startTime);
        }

        if (startColumn != null) {
            startingColumn = startColumn;
        }

        if (endColumn < 0 || durationTime < 0) {
            endingColumn = this.computed.last;
        }

        if (endTime != null) {
            endingColumn = this.getStftColumnFromTime(endTime);
        }

        if (durationColumns != null) {
            columnDuration = durationColumns;
        }

        if (durationTime != null) {
            columnDuration = this.getStftColumnFromTime(durationTime);
        }

        if (columnDuration != null) {
            endingColumn = startingColumn + columnDuration;
        }

        if (this.shouldShift(startingColumn, endingColumn)) {
            console.log('Is shifting');
            this.shiftSTFTBuffer(startingColumn);
        }

        // Check that requested columns do not fall outside the computed array
        startingColumn = Math.max(this.computed.first, startingColumn);
        endingColumn = Math.max(
            Math.min(this.computed.last, endingColumn),
            startingColumn,
        );

        const array = this.STFTBuffer.slice(
            this.getBufferIndexFromColumn(startingColumn),
            this.getBufferIndexFromColumn(endingColumn),
        );

        return {
            start: startingColumn,
            end: endingColumn,
            data: array,
            computed: this.computed,
        };
    }

    /**
     * Get spectrogram column from time in seconds.
     * @param {number} time - Time from start of recording in seconds.
     */
    getStftColumnFromTime(time) {
        const wavIndex = this.audioHandler.getIndex(time);
        return this.getStftColumnFromWavIndex(wavIndex);
    }

    /**
     * Get time in seconds from spectrogram column.
     * @param {number} column - Spectrogram column.
     */
    getTimeFromStftColumn(column) {
        const wavIndex = column * this.config.stft.hop_length;
        return this.audioHandler.getTime(wavIndex);
    }

    /**
     * Get the wav array index that corresponds to the start of a spectrogram column.
     * @param {number} column - Spectrogram column.
     */
    getWavIndexFromStftColumn(column) {
        return column * this.config.stft.hop_length;
    }

    /**
     * Get the spectrogram column that corresponds to a location in the Wav array.
     * @param {number} index - Index of the wav array.
     */
    getStftColumnFromWavIndex(index) {
        const intersectionSize = this.config.stft.window_size - this.config.stft.hop_length;
        return Math.max(0, Math.floor((index - intersectionSize) / this.config.stft.hop_length));
    }

    /**
     * Get the index in the STFT array where the information of a single spectrogram column is
     * stored.
     * @param {number} column - Spectrogram column.
     */
    getBufferIndexFromColumn(column) {
        return (column - this.startColumn) * this.bufferColumnHeight;
    }

    columnsPerSecond() {
        return this.audioHandler.mediaInfo.sampleRate / this.config.stft.hop_length;
    }

    /**
     * Returns whether the buffer must shift in order to compute the required column
     * @param {number} column - Desired column.
     */
    shouldShift(startColumn, endColumn) {
        const inferiorLimit = (this.startColumn) ? this.startColumn + SHIFT_COLUMN_BUFFER : 0;
        const superiorLimit = this.startColumn + this.bufferColumns - SHIFT_COLUMN_BUFFER;
        return (endColumn > superiorLimit) || (startColumn < inferiorLimit);
    }

    shiftSTFTBuffer(startColumn) {
        // Calculate the column shift
        const columnDiff = Math.abs(this.startColumn - startColumn + SHIFT_COLUMN_BUFFER);
        const hops = Math.ceil(columnDiff / SHIFT_COLUMN_HOP);
        const backwardsShift = (startColumn - SHIFT_COLUMN_BUFFER < this.startColumn);
        let columnShift = backwardsShift ? -hops * SHIFT_COLUMN_HOP : hops * SHIFT_COLUMN_HOP;

        // Constain to reasonable limits
        const maxBackShift = -this.startColumn;
        const maxForwardShift = Math.max(0, this.columnWidth - this.endColumn - this.bufferColumns);
        columnShift = Math.min(Math.max(columnShift, maxBackShift), maxForwardShift);

        let minIndex;
        let maxIndex;
        let offset;
        if (backwardsShift) {
            minIndex = 0;
            maxIndex = Math.max(this.endColumn + columnShift, 0);
            offset = -columnShift;
        } else {
            minIndex = columnShift;
            maxIndex = this.endColumn;
            offset = 0;
        }

        // Save any useful and previously calculated values
        const savedValues = new Float32Array(this.STFTBuffer.slice(minIndex, maxIndex));
        this.STFTBuffer.fill(0);
        this.STFTBuffer.set(savedValues, offset);

        // Shift start and end references
        this.startColumn += columnShift;
        this.endColumn += columnShift;

        // Update constraints
        this.startColumn = Math.max(this.startColumn, 0);
        this.endColumn = Math.min(this.endColumn, this.columnWidth);
        this.computed.first = Math.max(this.startColumn, this.computed.first);
        this.computed.last = Math.min(this.endColumn, this.computed.last);

        // Restart computation if had finished
        if (this.done) {
            this.startSTFTCalculation();
        }
    }

    /** Returns if the STFT handler is no longer making calculations. */
    isDone() {
        return this.done;
    }

    /** Deletes all the contents of the STFT buffer and restarts calculations. */
    resetBuffer() {
        this.STFTBuffer.fill(0);
        this.computed.first = this.startColumn;
        this.computed.last = this.startColumn;
        this.startSTFTCalculation();
    }

    /**
     * Starts the calculation of the short time fourier transform using the current configurations.
     */
    startSTFTCalculation() {
        this.done = false;
        this.forwardFillByChunks();
    }

    /**
     * Calculates a fixed number of stft frames and copies the result into the STFT buffer.
     * At finish it will start the calculation on the next set of frames. If no space in the
     * STFT buffer is left the process will stop.
     */
    forwardFillByChunks() {
        // If enough columns were computed check if there is missing computation
        // in the beggining of the buffer and compute backwards.
        if (this.computed.last >= this.endColumn) {
            this.backwardsFillByChunks();
            return;
        }

        // If buffer is full check if there is missing computation in the beggining
        // of the buffer and compute backwards.
        if (!this.hasSpace()) {
            this.backwardsFillByChunks();
            return;
        }

        // If wav data is fully consumed check if there is missing computation
        // in the beggining of the buffer and compute backwards.
        if (this.readingIsDone(this.computed.last)) {
            this.backwardsFillByChunks();
            return;
        }

        this.getAudioData(this.computed.last)
            .then((arrayResult) => this.computeSTFT(arrayResult))
            .then((STFTresult) => {
                this.setSTFTtoBuffer(this.computed.last, STFTresult);
                this.computed.last += COLUMNS_PER_STFT_COMPUTATION;
                this.forwardFillByChunks();
            })
            .catch((error) => {
                // TODO: check if error comes from bad offset and ignore. Otherwise handle the error
                // better.
            });
    }

    /**
     * Calculates a fixed number of stft frames and copies the result into the STFT buffer.
     * Data will be consumed from the WAV array in a backwards fashion. When the calculation is
     * complete, it well be repeated on the next set of frames. The process will
     * stop when the first column is calculated.
     */
    backwardsFillByChunks() {
        const startColumn = this.computed.first - COLUMNS_PER_STFT_COMPUTATION;

        // End if start of buffer is reached
        if (startColumn < this.startColumn) {
            this.done = true;
            return;
        }

        this.getAudioData(startColumn)
            .then((arrayResult) => this.computeSTFT(arrayResult))
            .then((STFTresult) => {
                this.setSTFTtoBuffer(startColumn, STFTresult);
                this.computed.first -= COLUMNS_PER_STFT_COMPUTATION;
                this.backwardsFillByChunks();
            });
    }

    /**
     * Return a promise that resolves in the wav data required for a single stft calculation.
     * @param {int} startColumn - The column at which to start of the required slice of wav data.
     * @param {int} [durationColumns] - The number of columns of stft desired. This translates into
     * a width of slice of wav data.
     */
    getAudioData(startColumn, columnDuration = COLUMNS_PER_STFT_COMPUTATION) {
        const startIndex = this.getWavIndexFromStftColumn(startColumn);
        const endIndex = startIndex
            + (columnDuration - 1) * this.config.stft.hop_length
            + this.config.stft.window_size;

        let tries = 0;
        return new Promise((resolve, reject) => {
            const checkIfReady = () => {
                if (tries > MAX_TRIES_GET_AUDIO_DATA) {
                    reject();
                }

                if (this.audioHandler.canRead(startIndex)) {
                    const array = this.audioHandler.read({
                        startIndex,
                        endIndex,
                    });
                    resolve(array);
                } else {
                    tries += 1;
                    setTimeout(checkIfReady, CHECK_READABILITY_DELAY);
                }
            };

            checkIfReady();
        });
    }

    /**
     * Computes the short time fourier transform of an array with the current configurations.
     * Will return a promise that resolves into a buffer with the results of the computation.
     * @async
     * @param {array} wavArray - Array holding the signal data.
     */
    async computeSTFT(wavArray) {
        // TODO: Set buffer data instead of creating a new one
        this.tensorBuffer = tf.tensor1d(new Float32Array(wavArray.data));
        this.frames = tf.signal.frame(
            this.tensorBuffer,
            this.config.stft.window_size,
            this.config.stft.hop_length,
        );

        this.windowed_frames = this.STFTWindowFunction.mul(this.frames);
        this.tensordb = tf.abs(this.windowed_frames.rfft()).flatten();

        return this.tensordb.data();
    }

    /** Checks if the STFT buffer has enough space for a new stft calculation */
    hasSpace() {
        const computedColumns = this.computed.last - this.startColumn;
        return (COLUMNS_PER_STFT_COMPUTATION + computedColumns < this.bufferColumns);
    }

    /** Checks if the requested column requires data outside the wav array. */
    readingIsDone(column) {
        const index = this.getWavIndexFromStftColumn(column);
        return this.audioHandler.isDone() && (this.audioHandler.getLastWavIndex() <= index);
    }

    /** Copies data from stft calculation into the STFT buffer at the indicated column position.
     * @param {int} column - The column position at which to insert the data.
     * @param {array} stftData - The array holding the result of a single stft calculation.
     */
    setSTFTtoBuffer(column, stftData) {
        const index = this.getBufferIndexFromColumn(column);
        this.STFTBuffer.set(stftData, index);
    }
}

export default STFTHandler;
