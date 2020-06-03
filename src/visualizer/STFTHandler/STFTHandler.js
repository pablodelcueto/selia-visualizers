/**
* STFTHandler module.
*
* @module STFTHandler/STFTHandler
* @see module:STFTHandler/STFTHandler.js
*/
import * as tf from '@tensorflow/tfjs';

/**
* A STFTData object stores the information returned by the STFTHandler when requested.
* @typedef module:STFTHandler/STFTHandler.STFTData
* @type {Object}
* @property {int} start - The number of the first spectrogram column
* included in the returned data.
* @property {int} end - The number of the last spectrogram column included
* in the returned data.
* @property {Object} data - An array holding the spectrogram data.
* @property {Object} computed - Information on the currently computed columns.
* @property {Object} computed.first - Lowest computed column number.
* @property {Object} computed.last - Highest computed column number.
*/

/** STFT values Buffer max size */
const STFT_BUFFER_MAX_SIZE = 1024 * 20000;

/** Columns number used on each STFT computation. */
const COLUMNS_PER_STFT_COMPUTATION = 10;

/** Time in miliseconds between file header checks */
const CHECK_HEADER_DELAY = 5;

/** Time in miliseconds between stft handler checks */
const CHECK_STFT_DELAY = 50;

/** Time in miliseconds between consecutive WAV values reads */
const CHECK_READABILITY_DELAY = 5;

/** Max number of consecutive tries checking if WAV is ready  */
const MAX_TRIES_AUDIO_READ = 10000;

/** Max number of consecutive tries reading WAV data */
const MAX_TRIES_GET_AUDIO_DATA = 10000;

/** Max number of consecutive tries for checking if STFT handler is ready */
const MAX_TRIES_STFT_READY = 10000;

/** STFT buffer shift behaviour. */
const SHIFT_COLUMN_HOP = 400;

/** Max number of columns shifted while traying to save data. */
const MAX_NORMAL_SHIFT_SEPARATION = 5000;

/** Number of STFT computations added when shift occurs */
const EXTRA_HOPS_SHIFT = 10;

/** Number to create limits movement whitout shifting */
const COLUMN_SEPARATION_SHIFT_OCURRANCE = 100;

/**
* Gets largest multiple of COLUMNS_PER_STFT_COMPUTATION smaller than value.
* @function
* @param {number} value - Float number.
* @return {number}
*/
function floorRound(value) {
    return Math.floor(value / COLUMNS_PER_STFT_COMPUTATION) * COLUMNS_PER_STFT_COMPUTATION;
}


/**
* Gets smallest multiple of COLUMNS_PER_STFT_COMPUTATION larger than value.
* @function
* @param {Number} value - Float number.
* @return {Number}
*/
function ceilRound(value) {
    return Math.ceil(value / COLUMNS_PER_STFT_COMPUTATION) * COLUMNS_PER_STFT_COMPUTATION;
}


/**
 * Get windowing function for the short time fourier transform.
 * @function
 * @param {string} windowFunction - Type of windowing function: hann, hamming or none
 * @param {int}    size           - Size of window.
 * @return {tf.Tensor} - The window function as a tensorflow tensor.
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
 * @class
 *
 * The class accesses the wav data in an Audio object and sequentially computes the STFT in small
 * batches. All the resulting computations are stored into a fixed sized buffer for memory control.
 * The class makes the computed data available through the read method. This will return any
 * requested data, if available, and advise otherwise. Since the buffer that stores computations
 * might not be large enough to store the whole spectrogram, when the requested data falls outside
 * the buffer window, the buffer will drop some data, shift, and start the computation of the
 * demanded portions.
 *
 * @property {bool} shouldWait - Indicates if async computations must wait.
 * @property {Object} config - STFT computations initial configurations
 * @property {Object} [config.stft] - Contains parameters for STFT computations.
 * @property {Object} [config.stft.windows_size] - Size of window used on STFT computation.
 * @property {Object} [config.stft.window_hop] - Size of hop between consecutive windows in
 * STFT computation.
 * @property {Object} [config.stft.function_type] - Type of function used in STFT computation.
 * @property {int} bufferColumnHeight - Number of values in each spectrogram column.
 * @property {int} bufferColumns - Number of STFTcolumns on STFTBuffer.
 * @property {int} columnWidth - Number of total STFTcolumns that could be extracted from WAV.
 * @property {int} startColumn - Number of column where STFTBuffer should start relative
 * to columnWidth.
 * @property {int} endColumn - Number of column where STFTBuffer should end relative
 * to columnWidth.
 * @property {Object} computed - Contains first and last columns already loaded in STFTBuffer
 * relative to columnWidth.
 * @property {Object} tensorBuffer - tf.tensor.
 * @property {Object} STFTBuffer - Buffer with STFT results.
 * @property {string} shifting - String refering if shift is being backward or forward.
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
    constructor(audioHandler, config) {
        this.audioHandler = audioHandler;
        this.shouldWait = false;
        this.ready = false;

        // Copy base configuration
        this.config = config;

        // Wait for Audio Handler to be ready and then start stft calculation and buffer filling.
        this.waitForAudioHandler()
            .then(() => {
                // Setup for stft calculations
                this.setupSTFT();
                this.startSTFTCalculation();
                this.ready = true;
            });
    }

    /** Sets up variables for stft calculation. */
    setupSTFT() {
        // Shape of final spectrogram
        this.bufferColumnHeight = 1 + this.config.stft.window_size / 2;
        this.bufferColumns = floorRound(Math.floor(STFT_BUFFER_MAX_SIZE / this.bufferColumnHeight));
        this.columnWidth = floorRound(this.getStftColumnFromWavIndex(
            this.audioHandler.mediaInfo.size - this.config.stft.window_size,
        ));

        // Short Time Fourier Transform auxiliary variables
        this.STFTWindowFunction = getTensorWindowFunction(
            this.config.stft.window_function,
            this.config.stft.window_size,
        );

        this.startColumn = floorRound(this.getStftColumnFromTime(this.config.startTime));
        this.endColumn = Math.min(this.startColumn + this.bufferColumns, this.columnWidth);
        this.computed = {
            first: this.startColumn,
            last: this.startColumn,
        };

        const tensorSize = (COLUMNS_PER_STFT_COMPUTATION - 1) * this.config.stft.window_size;
        this.tensorBuffer = tf.tensor1d(new Float32Array(tensorSize));
        this.STFTBuffer = new Float32Array(this.bufferColumns * this.bufferColumnHeight);

        this.duration = this.audioHandler.mediaInfo.durationTime;
        this.maxFreq = this.audioHandler.mediaInfo.sampleRate / 2;
    }

    /**
     * Returns a promise that resolves whenever the audio reader is ready for information
     * to be read from it. This happens after the wav header is correctly parsed.
     * @async
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

    waitUntilReady() {
        let tries = 0;

        return new Promise((resolve, reject) => {
            const checkIfReady = () => {
                // Will reject the promise after many tries.
                if (tries > MAX_TRIES_STFT_READY) {
                    reject();
                }

                if (this.ready) {
                    resolve();
                }

                tries += 1;
                // Will wait for a set time and check again if stft handler is ready
                setTimeout(checkIfReady, CHECK_STFT_DELAY);
            };

            checkIfReady();
        });
    }

    /** Returns current configuration used by the stft handler. */
    getConfig() {
        // TODO
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
        // this.resetBuffer();
        if ('window_size' in config.stft) {
            this.config.stft.window_size = config.stft.window_size;
        }

        if ('hop_length' in config.stft) {
            this.config.stft.hop_length = config.stft.hop_length;
        }

        if ('window_function' in config.stft) {
            this.config.stft.window_function = config.stft.window_function;
        }
        this.config.startTime = config.startTime;

        this.setupSTFT();
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
     * @return {module:STFTHandler/STFTHandler.STFTData} An object that contains the requested data
     * or portions of it, and information on the current state of the STFThandler.
     */
    read({
        startColumn = null,
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

        if (this.shouldShiftBackwards(startingColumn)) {
            this.shiftSTFTBufferBackwards(startingColumn, endingColumn);
        } else if (this.shouldShiftForwards(endingColumn)) {
            this.shiftSTFTBufferForwards(endingColumn, startingColumn);
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
            startTime: this.getTimeFromStftColumn(startingColumn),
            endTime: this.getTimeFromStftColumn(endingColumn),
            data: array,
            computed: this.computed,
        };
    }

    /**
     * Get spectrogram column from time in seconds.
     * @param {number} time - Time from start of recording in seconds.
     * @return {number} Column of the spectogram that corresponds to the desired time in
     * seconds.
     */
    getStftColumnFromTime(time) {
        const wavIndex = this.audioHandler.getWavIndexFromTime(time);
        return this.getStftColumnFromWavIndex(wavIndex);
    }

    /**
     * Get the spectrogram column that corresponds to a location in the Wav array.
     * @param {number} index - Index of the wav array.
     * @return {number} The spectrogram column that represents the audio contents in the
     * WAV array around the requested index.
     */
    getStftColumnFromWavIndex(index) {
        const intersectionSize = this.config.stft.window_size - this.config.stft.hop_length;
        return Math.max(0, Math.floor((index - intersectionSize) / this.config.stft.hop_length));
    }

    /**
     * Get time in seconds from spectrogram column.
     * @param {number} column - Spectrogram column.
     * @return {number} Time in seconds that corresponds to the column in the spectrogram.
     */
    getTimeFromStftColumn(column) {
        const wavIndex = column * this.config.stft.hop_length;
        return this.audioHandler.getTime(wavIndex);
    }

    /**
     * Get the wav array index that corresponds to the start of a spectrogram column.
     * @param {number} column - Spectrogram column.
     * @return {number} The index in the WAV array of the start of the
     * STFT frame that corresponds the required spectrogram column.
     */
    getWavIndexFromStftColumn(column) {
        return column * this.config.stft.hop_length;
    }


    /**
     * Get the index in the STFT array where the information of a single spectrogram column is
     * stored.
     * @param {number} column - Spectrogram column.
     * @return {number} The index in the STFT Buffer corresponding to the start of the requested
     * spectrogram column.
     */
    getBufferIndexFromColumn(column) {
        return (column - this.startColumn) * this.bufferColumnHeight;
    }

    /**
     * Returns whether the buffer must shift backwards in order to compute the required
     * column.
     * @param {number} startColumn - Desired starting column.
     * @return {boolean} Whether the buffer should be shifted backwards
     */
    shouldShiftBackwards(startColumn) {
        const inferiorLimit = (this.startColumn > 0) ? this.startColumn + COLUMN_SEPARATION_SHIFT_OCURRANCE : 0;
        return startColumn < inferiorLimit;
    }

    /**
     * Returns whether the buffer must shift forwards in order to compute the required
     * column.
     * @param {number} endColumn - Desired ending column.
     * @return {boolean} Whether the buffer should be shifted forwards
     */
    shouldShiftForwards(endColumn) {
        const superiorLimit = this.startColumn + this.bufferColumns - COLUMN_SEPARATION_SHIFT_OCURRANCE;
        return endColumn > superiorLimit;
    }

    /**
    * Shift the STFT buffer backwards when an uncomputed column of the spectrogram is
    * requested. The column should come before all computed columns. The shift will move the
    * whole buffer some columns backwards, and will try to save as many computed values as
    * possible in case those are not to far from requested columns.
    * @param {number} startColumn - Column number being requested. Should be smaller than any
    * computed column number. The buffer will shift to include such column and start the
    * computation of any missing columns.
    * @param {number} endColumn - Column greatest number being requested. Use to start filling
    * information in case shift is completly starting over.
    */
    shiftSTFTBufferBackwards(startColumn, endColumn) {
        console.log('shifting???')
        this.shifting = 'backwards';

        // Calculate number of columns to shift
        const inferiorLimit = (this.startColumn > 0) ? this.startColumn + COLUMN_SEPARATION_SHIFT_OCURRANCE : 0;
        const columnDiff = inferiorLimit - startColumn;
        const numHops = Math.ceil(columnDiff / SHIFT_COLUMN_HOP) + EXTRA_HOPS_SHIFT;
        let columnShift = -numHops * SHIFT_COLUMN_HOP;


        // Constrain to reasonable limits
        const maxColumnShift = floorRound(this.startColumn);
        columnShift = Math.max(columnShift, -maxColumnShift);

        // Used to save any useful and previously calculated values
        const cutPoint = Math.max(this.endColumn + columnShift, this.startColumn);

        if ((endColumn - this.computed.first > MAX_NORMAL_SHIFT_SEPARATION)
            || (cutPoint <= this.computed.first)) {
            this.STFTBuffer.fill(0);
            console.log('jump');
            // Set values for new computations.
            this.startColumn += columnShift;
            this.endColumn += columnShift;
            this.computed.first = floorRound(endColumn);
            this.computed.last = floorRound(endColumn);
        } else {
            // Place the intersecting computed information into the new
            // buffer.
            // const maxIndex = this.getBufferIndexFromColumn(cutPoint);
            const maxIndex = this.getBufferIndexFromColumn(
                Math.min(
                    this.computed.last,
                    this.endColumn + columnShift,
                ),
            );
            const savedValues = new Float32Array(this.STFTBuffer.slice(0, maxIndex));
            const offset = -columnShift * this.bufferColumnHeight;
            this.STFTBuffer.fill(0);
            this.STFTBuffer.set(savedValues, offset);

            // Shift start and end references
            this.startColumn += columnShift;
            this.endColumn += columnShift;

            // and restart computation from previous checkpoints
            this.computed.last = floorRound(Math.min(this.endColumn + columnShift, this.computed.last));
            this.computed.first = floorRound(Math.min(this.endColumn + columnShift, this.computed.first));
        }

        // Turned true to make avoid data in past process to load on buffer.
        this.hasShifted = true;

        // Restart computation if had finished
        if (this.done) {
            this.startSTFTCalculation();
        }
    }

    /**
    * Shift the STFT buffer forwards when an uncomputed column of the spectrogram is
    * requested. The column should be after all computed columns. The shift will move the
    * whole buffer some columns forwards, and will try to save as many computed values as
    * possible.
    * @param {number} endColumn - Column number being requested. Should be larger than any
    * computed column number. The buffer will shift to include such column and start the
    * computation of any missing columns.
    * @param {number} startColumn - Column number being requested. Use to start filling
    * information in case shift is completly starting over.
    */
    shiftSTFTBufferForwards(endColumn, startColumn) {
        console.log('shifting')
        this.shifting = 'forwards';

        // Calculate the column shift
        const superiorLimit = this.startColumn + this.bufferColumns - COLUMN_SEPARATION_SHIFT_OCURRANCE;
        const columnDiff = endColumn - superiorLimit;
        const methodDiff = startColumn - this.computed.last;
        const numHops = Math.ceil(columnDiff / SHIFT_COLUMN_HOP) + EXTRA_HOPS_SHIFT;
        let columnShift = numHops * SHIFT_COLUMN_HOP;

        // Constain to reasonable limits
        let maxForwardShift = Math.max(0, this.columnWidth - this.endColumn);
        maxForwardShift = floorRound(maxForwardShift);
        columnShift = Math.min(columnShift, maxForwardShift);
        const cutPoint = Math.min(this.startColumn + columnShift, this.endColumn);

        if (
            (methodDiff > MAX_NORMAL_SHIFT_SEPARATION)
            || (this.computed.last < cutPoint)
        ) {
            // Making a shift without saving any old data.
            this.STFTBuffer.fill(0);
            this.startColumn += columnShift;
            this.endColumn += columnShift;
            this.computed.first = ceilRound(startColumn);
            this.computed.last = ceilRound(startColumn);
        } else {
            // Save any useful and previously calculated values
            const startIndex = columnShift * this.bufferColumnHeight;
            const savedValues = new Float32Array(this.STFTBuffer.slice(startIndex));

            this.STFTBuffer.fill(0);
            this.STFTBuffer.set(savedValues, 0);

            // Shift start and end references
            this.startColumn += columnShift;
            this.endColumn += columnShift;

            // Update constraints
            this.computed.first = ceilRound(Math.max(this.startColumn, this.computed.first));
            this.computed.last = ceilRound(Math.max(this.startColumn, this.computed.last));
        }

        this.hasShifted = true;

        // Restart computation if had finished
        if (this.done) {
            this.startSTFTCalculation();
        }
    }

    /** Returns if the STFT handler is no longer making calculations. */
    isDone() {
        return this.done;
    }

    /**
    * Used to load clean data to the stftBuffer every new setting is required.
    * Waits until last computation of previous setting is done so it doesn't mess with new values.
    */
    waitUntilStop() {
        // Could happen that shouldWait doesn't change if program is at rest
        // so numberChecked is used to ensure modifications are done.
        let numberChecked = 0;
        this.shouldWait = true;

        return new Promise((resolve) => {
            const checkIfReady = () => {
                if (!this.shouldWait) {
                    resolve();
                } else if (numberChecked === 10) {
                    this.shouldWait = false;
                    checkIfReady();
                    // resolve();
                } else {
                    numberChecked++;
                    setTimeout(checkIfReady, 100);
                }
            };
            checkIfReady();
        });
    }

    /** Deletes all the contents of the STFT buffer and restarts computations. */
    resetBuffer() {
        this.waitUntilStop().then(() => {
            this.STFTBuffer.fill();
            this.startSTFTCalculation();
        });
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
     * STFT buffer is left after last computed column or no more audio data can be readed,
     * then it passes to fill backwards untill buffer is data full.
     */
    forwardFillByChunks() {
        if (this.shifting === 'backwards') {
            this.backwardsFillByChunks();
            return;
        }
        // If enough columns were computed check for missing computation
        // in the beggining of the buffer and compute backwards.

        if (this.forwardFillIsDone() || (this.computed.last >= this.endColumn)) {
            if (this.shifting === 'forwards') {
                this.shifting = null;
                this.backwardsFillByChunks();
                return;
            }
            this.done = true;
            return;
        }

        this.getAudioData(this.computed.last)
            .then((arrayResult) => this.computeSTFT(arrayResult))
            .then((STFTresult) => {
                if (this.shouldWait) {
                    this.shouldWait = false;
                    return;
                }

                // Check if shift has occurred before inserting stft data in
                // erroneous place
                if (this.hasShifted) {
                    this.hasShifted = false;
                    this.forwardFillByChunks();
                    return;
                }

                this.setSTFTtoBuffer(this.computed.last, STFTresult);
                this.computed.last += COLUMNS_PER_STFT_COMPUTATION;
                this.forwardFillByChunks();
            })
            .catch((error) => {
                // TODO: check if error comes from bad offset and ignore. Otherwise handle the error
                // better.
                console.log('at error', {
                    computed_last: this.computed.last,
                    error,
                });
            });
    }

    /**
     * Calculates a fixed number of stft frames and copies the result into the STFT buffer.
     * Data will be consumed from the WAV array in a backwards fashion. When the calculation is
     * complete, it well be repeated on the next set of frames. The process will
     * stop when the first column is calculated and in case last computed hasn't reach end column
     * it will start forward filling.
     */
    backwardsFillByChunks() {
        if (this.shifting === 'forwards') {
            this.forwardFillByChunks();
        }

        const startColumn = this.computed.first - COLUMNS_PER_STFT_COMPUTATION;
        // End if this.startColumn of buffer is reached
        if (this.computed.first === this.startColumn) {
            if (this.shifting === 'backwards') {
                this.shifting = null;
                this.forwardFillByChunks();
                return;
            }
            this.done = true;
            return;
        }

        this.getAudioData(startColumn)
            .then((arrayResult) => this.computeSTFT(arrayResult))
            .then((STFTresult) => {
                if (this.shouldWait) {
                    this.shouldWait = false;
                    return;
                }

                if (this.hasShifted) {
                    this.hasShifted = false;
                    this.forwardFillByChunks();
                    return;
                }

                this.setSTFTtoBuffer(startColumn, STFTresult);
                if (this.computed.first > this.startColumn) {
                    this.computed.first -= COLUMNS_PER_STFT_COMPUTATION;
                }
                this.backwardsFillByChunks();
            });
    }

    /**
     * Return a promise that resolves in the wav data required for a single stft calculation.
     * @async
     * @param {int} startColumn - The column at which to start of the required slice of wav data.
     * @param {int} [durationColumns] - The number of columns of stft desired. This translates into
     * a width of slice of wav data.
     * @returns {Promise} Promise that represents a chunk of WAV data as provided by the
     * audio handler object.
     */
    getAudioData(startColumn, columnDuration = COLUMNS_PER_STFT_COMPUTATION) {
        const startIndex = this.getWavIndexFromStftColumn(startColumn);
        let endIndex = startIndex
            + (columnDuration - 1) * this.config.stft.hop_length
            + this.config.stft.window_size;

        // Constraint so endIndex is readable.
        endIndex = Math.min(
            endIndex,
            this.audioHandler.bufferIndexToWavIndex(this.audioHandler.mediaInfo.size),
        );

        let tries = 0;
        return new Promise((resolve, reject) => {
            const checkIfReady = () => {
                if (tries > MAX_TRIES_GET_AUDIO_DATA) {
                    reject(new Error('Not reading data'));
                }

                if (this.audioHandler.canRead(endIndex)) {
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
     * @returns {Promise} Promise that represents the STFT computation results.
     */
    async computeSTFT(wavArray) {
        return tf.tidy(() => {
            const tensorBuffer = tf.tensor1d(new Float32Array(wavArray.data));
            const frames = tf.signal.frame(
                tensorBuffer,
                this.config.stft.window_size,
                this.config.stft.hop_length,
            );

            const windowedFrames = this.STFTWindowFunction.mul(frames);
            return tf.abs(windowedFrames.rfft()).flatten();
        }).data();
    }

    /**
    * Check if no more stft results can be loaded after last computed column.
    */
    forwardFillIsDone() {
        return (this.readingIsDone() || !this.hasSpaceInFront());
    }

    /**
    Checks if the STFT buffer has enough space for a new stft calculation.
    */
    hasSpaceInFront() {
        return this.computed.last + COLUMNS_PER_STFT_COMPUTATION < this.endColumn;
    }

    /** Checks if there's enough audio data to add in stftBuffer after last computed.
    * @returns {boolean} Whether the computation of the requested column would
    * having more that than stored in the WAV file.
    */
    readingIsDone() {
        if (this.audioHandler.isDone()) {
            const index = this.getWavIndexFromStftColumn(this.computed.last + COLUMNS_PER_STFT_COMPUTATION);
            const lastWav = this.audioHandler.bufferIndexToWavIndex(this.audioHandler.mediaInfo.size);
            const lastBase = lastWav - this.config.stft.window_size;
            return lastBase < index;
        }

        return false;
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
