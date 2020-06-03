/**
* module for tool box.
* @module Tools/index
* @see module:Tools/index.js
*/

// This file should be used to code tge component related to the tools needed in visualizator
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Range } from 'rc-slider';
import 'rc-slider/assets/index.css';


const buttonClass = 'btn btn-light m-1';
const activeButtonClass = 'btn btn-primary m-1';
const selectClass = 'input-group input-group-sm p-1';


const canvasDivStyle = {
    top: '15px',
    width: '100%',
    position: 'absolute',
    zIndex: '2',
    height: '20px',
    backgroundColor: 'rgba(256,256,256,0.3)',
    fontcolor: 'white',
};

const infoWindowStyle = {
    top: '40px',
    left: '80%',
    width: '10%',
    height: '20%',
    position: 'absolute',
    zIndex: '2',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'none',
};


//--------------------------------------------------------
/**
 * @typedef module:Tools/index.ToolboxState
 * @type {Object}
 * @property {Object} stftConf - STFT computations configurations.
 * @property {number} stftConf.window_function - STFT window type computations.
 * @property {number} stftConf.window_size - STFT window size computations.
 * @property {number} stftConf.hop_length - STFT window hop length computations.
 * @property {Object} colorConf - Color settings.
 * @property {number} colorConf.lim_inf - Inferior filter color slider values.
 * @property {number} colorConf.lim_sup - Superior filter color slider values.
 * @property {Object} timeSettings - Canvas borders times and audio duration.
 * @property {number} timeSettings.duration - Audio file duration.
 * @property {number} timeSettings.initialTime - Left time on visualization.
 * @property {number} timeSettings.finalTime - Rigth time on visulaization.
 * @property {Object} cursorInfo - Information of positiones cursor.
 * @property {number} cursorInfo.time - Time value in cursor point .
 * @property {number} cursorInfo.frequency - Frequency value in cursor point.
*/

/**
* @component
* This class link all menus, slider, and buttons in toolBox with corresponding
* methods in visualizer required once a modification has been done.
* Ther's two types of tools, some of them exist inside the canvas and some of them outside.
* The ones inside canvas are CanvasSliderDiv & InformationWindow which are specially handled with
* a React Portal method.
* @example
* const audioFileClass = new AudioFile();
* return (
* <Toolbox
* audioFile={audioFileClass}
* />
* )
*/
class Toolbox extends React.Component {
    /**
    * Creates a toolBox.
    * @constructor
    * @property {module:Tools/index.ToolboxState} state - React component state.
    * @public
    */
    constructor(props) {
        super(props);
        this.state = {
            stftConf: {
                window_function: this.props.STFTconfig.window_function,
                window_size: this.props.STFTconfig.window_size,
                hop_length: this.props.STFTconfig.hop_length,
            },
            colorConf: {
                lim_inf: 0,
                lim_sup: 1,
            },
            timeSettings: {
                duration: 1,
                initialTime: 0,
                finalTime: 0,
            },
            dragging: false,
            cursorInfo: { time: 0, frequency: 0 },
            zoomActive: false,
            infoWindowActive: false,
        };
    }

    /**
     * Unset drag and zoom on mouse up.
     * @private
     */
    onMouseUp() {
        if (!this.props.isActive()) return;

        this.setState((prevState) => {
            return {
                zoomActive: false,
                dragging: false,
            };
        });
    }

    /**
     * Used to set initTime and finalTime in state.timeSettings.
     * @param {number} initTime - initialTime for state.timeSettings.
     * @param {number} finalTine - finalTime for state.timeSettings.
     * @private
     */
    setSliderTimes(initTime, finalTime) {
        this.setState((prevState) => {
            const [duration] = [prevState.timeSettings.duration];
            return {
                timeSettings: {
                    duration,
                    initialTime: Math.max(0, initTime),
                    finalTime: Math.min(duration, finalTime),
                },
            };
        });
    }

    /**
     * Set state.cursorInfo with values.
     * @private
     */
    setCursorInfo(time, frequency) {
        this.setState({ cursorInfo: { time, frequency } });
    }

    /**
    * Completes some events of SliderBlockDiv by adding functionality in props.canvas.
    * @private
    */
    addEventsToCanvas() {
        const { canvas } = this.props;
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('mousemove', (event) => this.draggingOutDiv(event));
    }

    /**
    * Set window size in state.stftConf.
    * Modifies window size in state and calls for window size modification in props.
    * @param {number} windowSize - New window size value.
    * @public
    */
    handleWindowSizeChange(windowSize) {
        this.setState((prevState) => {
            const realValue = Math.max(windowSize, prevState.stftConf.hop_length);
            this.props.modifyWindowSize(realValue);
            return {
                stftConf: {
                    ...prevState.stftConf,
                    window_size: realValue,
                },
            };
        });
    }

    /**
    * Set window type in state.stftConf.
    * Modifies window function in menu and calls for window function modification in props.
    * @param {string} type - New window type name.
    * @public
    */
    handleWindowFunctionChange(type) {
        this.setState((prevState) => {
            this.props.modifyWindowFunction(type);
            return {
                stftConf: {
                    ...prevState.stftConf,
                    window_function: type,
                },
            };
        });
    }

    /**
    * Set hop length in state.stftConf.
    * Modifies window hop length in menu and calls hop length modification in props.
    * @param {number} newHopLength - New hop length value.
    * @public
    */
    handleWindowHopChange(newHopLength) {
        this.setState((prevState) => {
            const realValue = Math.min(prevState.stftConf.window_size, newHopLength);
            this.props.modifyHopLength(realValue);
            return {
                stftConf: {
                    ...prevState.stftConf,
                    hop_length: realValue,
                },
            };
        });
    }

    /**
    * Triggers a modification of colorMap with props.modifyColorMap;
    * @param {number} color - New colorMap number.
    * @public
    */
    handleColorMapChange(color) {
        this.props.modifyColorMap(parseFloat(color));
    }

    /**
    * Set color filter limits.
    * Triggers props.modifyInfFilter and props.modifySupFilter methods.
    * @param {number[]} value - Values to set as inferior and superior limit filters in colormap.
    * @public
    */
    handleFilterChange(value) {
        this.setState((prevState) => {
            const [newInf, newSup] = value;

            if (newInf !== prevState.colorConf.lim_inf) {
                this.props.modifyInfFilter(newInf);
            }

            if (newSup !== prevState.colorConf.lim_sup) {
                this.props.modifySupFilter(newSup);
            }

            return {
                colorConf: {
                    ...prevState.colorConf,
                    lim_inf: newInf,
                    lim_sup: newSup,
                },
            };
        });
    }

    /**
    * Sets newTime at center of canvas triggering props.moveToCenter method.
    * @param {number} - Time where spectrogram view should be centered.
    * @private
    */
    handleTranslation(newTime) {
        this.props.moveToCenter(newTime);
    }

    /**
    * Trigger reproducer props.
    * @private
    */
    reproduce() {
        this.props.reproduceAndPause();
    }

    /**
    * Hide or show information window.
    * @private
    */
    showHideInfoWindow() {
        this.props.visualizerActivator();
        const infoWindow = document.getElementById('infoWindow');
        if (infoWindow.style.display === 'none') {
            document.getElementById('infoWindow').style.display = 'block';
        } else {
            infoWindow.style.display = 'none';
        }

        this.setState((prevState) => ({ infoWindowActive: !prevState.infoWindowActive }));
    }

    updateAudioLength(duration) {
        this.setState((prevState) => ({
            timeSettings: {
                ...prevState.timeSettings,
                duration,
            },
        }));
    }

    /**
    * Moves Slider div center to clicked position.
    * Computes time to clicked position  and calls props.moveToCenter in time.
    * @param {Event} - Click on div containing sliderDiv block.
    * @private
    */
    clickingDiv(event) {
        if (!this.props.isActive()) return;

        const times = this.props.canvasTimes();
        const centralTime = this.props.getDenormalizedTime(event);
        this.props.moveToCenter(centralTime);
        const [leftTime, rigthTime] = [times.leftTime, times.rigthTime];
        const timeLength = rigthTime - leftTime;
        this.setSliderTimes(centralTime - timeLength / 2, centralTime + timeLength / 2);
        this.setState({ dragging: true });
    }

    dragDivSlider(event) {
        if (!this.props.isActive()) return;

        const times = this.props.canvasTimes();
        if (this.state.dragging) {
            const centralTime = this.props.getDenormalizedTime(event);
            this.props.moveToCenter(centralTime);
            const [leftTime, rigthTime] = [times.leftTime, times.rigthTime];
            const timeLength = rigthTime - leftTime;
            this.setSliderTimes(centralTime - timeLength / 2, centralTime + timeLength / 2);
        }
    }

    moveSliderFromCanvas() {
        const times = this.props.canvasTimes();
        this.setState((prevState) => ({
            timeSettings: {
                ...prevState.timeSettings,
                initialTime: times.leftTime,
                finalTime: times.rigthTime,
            },
        }));
    }

    computeInitialPixel() {
        const { initialTime } = this.state.timeSettings;
        const initialPixel = (initialTime / this.state.timeSettings.duration);
        return initialPixel * this.props.canvas.width;
    }

    computePixelLength() {
        let range = this.state.timeSettings.finalTime - this.state.timeSettings.initialTime;
        range = Math.abs(range);
        const pixelLength = this.props.canvas.width * (range / this.state.timeSettings.duration);
        return pixelLength;
    }

    draggingOutDiv(event) {
        if (this.state.dragging) {
            this.dragDivSlider(event);
        }
    }

    // ---------------Building stuff -----------

    buildSliderDiv() {
        return (
            <div
                id="sliderDiv"
                style={{
                    left: this.computeInitialPixel(),
                    position: 'absolute',
                    width: this.computePixelLength(),
                    height: '20px',
                    zIndex: '2',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                }}
            />
        );
    }

    buildCanvasSlider() {
        return (
            <div
                style={canvasDivStyle}
                onMouseMove={(event) => this.dragDivSlider(event)}
                onMouseUp={() => this.onDragUp()}
                onMouseDown={(event) => this.clickingDiv(event)}
            >
                { this.buildSliderDiv() }
            </div>
        );
    }

    onDragUp() {
        if (!this.props.isActive()) return;
        this.setState({ dragging: false });
    }

    buildInfoWindow() {
        return (
            <div
                id="infoWindow"
                style={infoWindowStyle}
            >
                <p style={{ color: '#ffffff' }}>
                    {this.state.cursorInfo.time}
                </p>
                <p style={{ color: '#ffffff' }}>
                    {this.state.cursorInfo.frequency}
                </p>
            </div>
        );
    }

    buildPreviousViewButton() {
        return (
            <button
                type="submit"
                className={buttonClass}
                onClick={() => this.props.revertAction()}
            >
                <i className="fas fa-undo" />
            </button>
        );
    }

    buildHomeViewButton() {
        return (
            <button
                type="submit"
                className={buttonClass}
                onClick={() => this.props.home()}
            >
                <i className="fas fa-home" />
            </button>
        );
    }

    handleMoveButtonClick() {
        this.props.visualizerActivator();
        this.setState((prevState) => {
            if (prevState.zoomActive) {
                this.props.switchButton();
            }
            return { zoomActive: false };
        });
    }

    handleZoomButtonClick() {
        this.props.visualizerActivator();
        this.setState((prevState) => {
            this.props.switchButton();
            return { zoomActive: !prevState.zoomActive };
        });
    }

    buildMoveButton() {
        const active = this.props.isActive();
        const className = active && !this.state.zoomActive ? activeButtonClass : buttonClass;

        return (
            <button
                type="submit"
                className={className}
                onClick={() => this.handleMoveButtonClick()}
            >
                <i className="fas fa-arrows-alt" />
            </button>
        );
    }

    buildZoomToolButton() {
        const className = this.state.zoomActive ? activeButtonClass : buttonClass;

        return (
            <button
                type="submit"
                className={className}
                onClick={() => this.handleZoomButtonClick()}
            >
                <i className="fas fa-search-plus" /> <i className="fas fa-expand" />
            </button>
        );
    }

    buildInfoWindowButton() {
        const className = this.state.infoWindowActive ? activeButtonClass : buttonClass;

        return (
            <button
                type="submit"
                className={className}
                onClick={() => this.showHideInfoWindow()}
            >
                <i className="fas fa-info-circle" />
            </button>
        );
    }

    buildWindowTypeSelect() {
        return (
            <div className={selectClass}>
                <div className="input-group-prepend">
                    <label className="input-group-text" htmlFor="windowTypeSelect">Type</label>
                </div>
                <select
                    value={this.state.stftConf.window_function}
                    onChange={(event) => this.props.modifyWindowFunction(event.target.value)}
                    className="custom-select"
                    id="windowTypeSelect"
                >
                    <option value="hann">Hann</option>
                    <option value="hamming"> Hamming </option>
                    <option value="float32"> Linear </option>
                </select>
            </div>
        );
    }

    buildWindowSizeSelect() {
        return (
            <div className={selectClass}>
                <div className="input-group-prepend">
                    <label className="input-group-text" htmlFor="windowSizeSelect">
                        <i className="fas fa-arrows-alt-h" />
                    </label>
                </div>
                <select
                    value={this.state.stftConf.window_size}
                    onChange={(event) => this.handleWindowSizeChange(event.target.value)}
                    className="custom-select"
                    id="windowSizeSelect"
                >
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                </select>
            </div>
        );
    }

    buildWindowHopSelect() {
        return (
            <div className={selectClass}>
                <div className="input-group-prepend">
                    <label className="input-group-text" htmlFor="windowHopSelect">Hop</label>
                </div>
                <select
                    value={this.state.stftConf.hop_length}
                    onChange={(event) => this.handleWindowHopChange(event.target.value)}
                    className="custom-select"
                    id="windowHopSelect"
                >
                    <option value="256">256</option>
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                </select>
            </div>
        );
    }

    buildColorMapSelector() {
        return (
            <div className={selectClass}>
                <div className="input-group-prepend">
                    <label className="input-group-text" htmlFor="colormapSelect">
                        <i className="fas fa-palette" />
                    </label>
                </div>
                <select
                    onChange={(event) => this.handleColorMapChange(event.target.value)}
                    className="custom-select"
                    id="colormapSelect"
                >
                    <option value="0">Grass</option>
                    <option value="0.1"> Phanton Grass</option>
                    <option value="0.2"> Purple Haze </option>
                    <option value="0.3"> Grays </option>
                    <option value="0.4"> Fish tank </option>
                    <option value="0.6"> Pink Floyd</option>
                    <option value="0.7"> Dark Sunset</option>
                    <option value="0.8"> Grapes </option>
                    <option value="0.9"> Kind of Blue  </option>
                    <option value="1.0"> Magma </option>
                </select>
            </div>
        );
    }

    buildFilterSlider() {
        const currentValue = [
            this.state.colorConf.lim_inf,
            this.state.colorConf.lim_sup,
        ];

        return (
            <div className="form-group row mx-1 h-100 my-0" style={{ width: '300px' }}>
                <label className="col-sm-2 col-form-label" htmlFor="filterRange">
                    Filter:
                </label>
                <div className="col-sm-10 h-100">
                    <Range
                        id="filterRange"
                        className="form-control-range h-100 d-flex align-items-center"
                        step={0.01}
                        min={0}
                        max={1}
                        defaultValue={[0, 1]}
                        values={currentValue}
                        onChange={(value) => this.handleFilterChange(value)}
                    />
                </div>
            </div>
        );
    }

    buildReproductionButton() {
        return (
            <button
                type="button"
                className={buttonClass}
                onClick={() => this.props.playAndPause()}
            >
                <i className="fas fa-play" /> <i className="fas fa-pause" />
            </button>
        );
    }

    render() {
        return (
            <div className="col">
                {ReactDOM.createPortal(
                    <div>
                        {this.buildCanvasSlider()}
                        {this.buildInfoWindow()}
                    </div>,

                    this.props.canvas.parentNode,
                )}

                <div className="row d-flex justify-content-start">
                    <div>
                        {this.buildMoveButton()}
                    </div>
                    <div>
                        {this.buildZoomToolButton()}
                    </div>
                    <div>
                        {this.buildHomeViewButton()}
                    </div>
                    <div>
                        {this.buildPreviousViewButton()}
                    </div>
                    <div>
                        {this.buildInfoWindowButton()}
                    </div>
                    <div>
                        {this.buildReproductionButton()}
                    </div>
                </div>

                <div className="row d-flex justify-content-start">
                    <div>
                        {this.buildWindowTypeSelect()}
                    </div>
                    <div>
                        {this.buildWindowSizeSelect()}
                    </div>
                    <div>
                        {this.buildWindowHopSelect()}
                    </div>
                    <div>
                        {this.buildColorMapSelector()}
                    </div>
                    <div>
                        {this.buildFilterSlider()}
                    </div>
                </div>
            </div>
        );
    }
}

export default Toolbox;

Toolbox.propTypes = {
    /**
    * STFT configurations for STFTmenus.
    */
    STFTconfig: PropTypes.object.isRequired,
    /**
    * Canvas where visualization it's taking place.
    */
    canvas: PropTypes.object.isRequired,
    /**
    * Computes canvas left and rigth border times.
    */
    canvasTimes: PropTypes.func.isRequired,
    /**
    *Modifies value in zoomSwitchButton state.
    */
    switchButton: PropTypes.func.isRequired,
    /**
    * Reverts last zoom tool transformation.
    */
    revertAction: PropTypes.func.isRequired,
    /**
    * Set transformation as initialized.
    */
    home: PropTypes.func.isRequired,
    /**
    * Modifies window type.
    */
    modifyWindowFunction: PropTypes.func.isRequired,
    /**
    * Modifies hop length.
    */
    modifyHopLength: PropTypes.func.isRequired,
    /**
    *Modifies window size.
    */
    modifyWindowSize: PropTypes.func.isRequired,
    /**
    * Set color map.
    */
    modifyColorMap: PropTypes.func.isRequired,
    /**
    * Set inferior filter value.
    */
    modifyInfFilter: PropTypes.func.isRequired,
    /**
    * Set superior filter value.
    */
    modifySupFilter: PropTypes.func.isRequired,
    /**
    * Moves clicked point to center of canvas.
    */
    moveToCenter: PropTypes.func.isRequired,
    /**
    * Get audio time in proportion to point position in relation with canvas width.
    */
    getDenormalizedTime: PropTypes.func.isRequired,
    /**
    * Method to play audio.
    */
    playAndPause: PropTypes.func.isRequired,
};
