/**
* module for tool box.
* @module Tools/index
* @see module:Tools/index.js
*/

// This file should be used to code tge component related to the tools needed in visualizator
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

const menuStyle = {
    align: 'left',
    width: '90%',
    margin: '10px',
};

const buttonStyle = {
    align: 'left',
    width: '50%',
    margin: '10px',
};

const sliderStyle = {
    align: 'left',
    width: '90%',
    margin: '10px',
};

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
    * @property {module:Tools/index.state} state - React component state.
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
        };
    }

    componentDidMount() {
        this.addEventsToCanvas();
    }

    upgradeAudioLength(duration) {
        this.setState((prevState) => ({
            timeSettings: {
                ...prevState.timeSettings,
                duration: duration,
            },
        }));
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
                    duration: duration,
                    initialTime: Math.max(0, initTime),
                    finalTime: Math.min(duration, finalTime),
                },
            };
        });
    }

    /**
    * Completes some events of SliderBlockDiv by adding functionality in props.canvas.
    * @private
    */
    addEventsToCanvas() {
        this.uncheckZoomTag = this.uncheckZoomTag.bind(this);
        this.props.canvas.addEventListener('mouseup', () => {
            this.uncheckZoomTag();
                this.unclickingDiv();
        });
        this.props.canvas.addEventListener('mousemove', (e) => {
            this.draggingOutDiv(e)});
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
            this.props.setSTFT.modifyWindowSize(realValue);
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
            this.props.setSTFT.modifyWindowFunction(type);
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
            this.props.setSTFT.modifyHopLength(realValue);
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
        this.props.setColorMap.modifyColorMap(parseFloat(color));
    }

    /**
    * Set lim_inf in state.colorConf.
    * Triggers props.modifyInfFilter method.
    * @param {number} value - Value to set as inferior limin filter in colorMap.
    * @public
    */
    handleMinFilterChange(value) {
        this.setState((prevState) => {
            this.props.setColorMap.modifyInfFilter(value);
            return {
                colorConf: {
                    ...prevState.colorConf,
                    lim_inf: value,
                },
            };
        });
    }

    /**
    * Set lim_sup value in state.colorConf.
    * Triggers props.modifySupFilter method.
    * @param {number} value - Value to set as superior limit filter in colorMap.
    * @public
    */
    handleMaxFilterChange(value) {
        this.setState((prevState) => {
            this.props.setColorMap.modifySupFilter(value);
            return {
                colorConf: {
                    ...prevState.colorConf,
                    lim_sup: value,
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
        this.props.movement.moveToCenter(newTime);
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
        const infoWindow = document.getElementById('infoWindow');
        if (infoWindow.style.display === 'none'){
            document.getElementById('infoWindow').style.display='block'
        } else {
            infoWindow.style.display='none';
        }
    }

    /**
    * Set state.cursorInfo with values.
    * @private
    */
    setCursorInfo(time, frequency) {
        this.setState({ cursorInfo: { time: time, frequency: frequency } });
    }

    /**
    * Modifies zoomSwitch value
    * @provate
    */
    uncheckZoomTag() {
        // this.setState({dragging: false });
        const checkBox = document.getElementById('customSwitch1');
        if (checkBox.checked === true) {
            this.props.movement.zoomOnRectangle(event);
            // this.props.switchButton();
        }
        checkBox.checked = false;
    }

    /**
    * Moves Slider div center to clicked position.
    * Computes time to clicked position  and calls props.moveToCenter in time.
    * @param {Event} - Click on div containing sliderDiv block.
    * @private
    */
    clickingDiv(event) {
        const times = this.props.canvasTimes();
        const centralTime = this.props.movement.sliderCoords(event);
        this.props.movement.moveToCenter(centralTime);
        const [leftTime, rigthTime] = [times.leftTime, times.rigthTime];
        const timeLength = rigthTime - leftTime;
        this.setSliderTimes(centralTime - timeLength / 2, centralTime + timeLength / 2);
        this.setState({ dragging: true });
    }

    dragDivSlider(event) {
        const times = this.props.canvasTimes();
        if (this.state.dragging) {
            const centralTime = this.props.movement.sliderCoords(event);
            this.props.movement.moveToCenter(centralTime);
            const [leftTime, rigthTime] = [times.leftTime, times.rigthTime];
            const timeLength = rigthTime - leftTime;
            this.setSliderTimes(centralTime - timeLength / 2, centralTime + timeLength / 2);
        }
    }

    unclickingDiv() {
        this.setState({ dragging: false });
    }

    moveSliderFromCanvas() {
        const times = this.props.canvasTimes();
        this.setState((prevState) => {
            return {
                timeSettings: {
                    ...prevState.timeSettings,
                    initialTime: times.leftTime,
                    finalTime: times.rigthTime,
                },
            };
        });
    }

    computeInitialPixel() {
        const initialTime = this.state.timeSettings.initialTime;
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

    //---------------Building stuff -----------

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
                }} />
        )
    }

    buildCanvasSlider() {
        return (
            <div
                style={canvasDivStyle}
                onMouseMove={(event) => this.dragDivSlider(event)}
                onMouseUp={(event) => this.unclickingDiv(event)}
                onMouseDown={(event) => this.clickingDiv(event)} >
                { this.buildSliderDiv() }

            </div>
        );
    }

    buildInfoWindow() {
        return (
            <div
                id = "infoWindow"
                style={infoWindowStyle}>
                <p style={{ color: '#ffffff' }}>
                    {this.state.cursorInfo.time}
                </p>
                <p style={{ color: '#ffffff' }}>
                    {this.state.cursorInfo.frequency}
                </p>
            </div>
        )
    }

    buildActionButtons() {
        return (
            <div>
                <button
                    style={buttonStyle}
                    onClick={() => this.props.actionButtons.revertAction()} >
                    Visualizacion previa
                </button>

                <button
                    style={buttonStyle}
                    onClick={() => this.props.actionButtons.home()}
                >
                    Vista Initial
                </button>
            </div>
        );
    }

    buildSwitchButtons() {
        return (
            <div>
                <div className="custom-control custom-switch">
                    <input
                        style={sliderStyle}
                        type="checkbox"
                        id="customSwitch1"
                        className="custom-control-input"
                        onChange={() => { this.props.switchButton(); }}
                    />
                    <label className="custom-control-label" htmlFor="customSwitch1">
                        Zoom Tool.
                    </label>
                </div>
                <div className="custom-control custom-switch">
                    <input
                        style={menuStyle}
                        type="checkbox"
                        id="informationWindowSwitch"
                        className="custom-control-input"
                        onChange={() => { this.showHideInfoWindow(); }}
                    />
                    <label className="custom-control-label" htmlFor="informationWindowSwitch">
                        Information window.
                    </label>
                </div>
            </div>
        );
    }

    buildSTFTMenus() {
        return (
            <div>
                <select
                    style={menuStyle}
                    // value={this.state.stftConf.window_function}
                    onChange={(event) => {
                        // this.handleWindowFunctionChange(event.target.value); }}
                        this.props.setSTFT.modifyWindowFunction(event.target.value); }}
                >
                    <optgroup label="Window Type">
                        <option value="hann">Hann</option>
                        <option value="hamming"> Hamming </option>
                        <option value="float32"> Linear </option>
                    </optgroup>
                </select>

                <select
                    style={menuStyle}
                    value={this.state.stftConf.window_size}
                    onChange={(event) => { this.handleWindowSizeChange(event.target.value); }}
                >
                    <optgroup label="Window Size">
                        <option value="512">512</option>
                        <option value="1024">1024</option>
                        <option value="2048">2048</option>
                    </optgroup>
                </select>

                <select
                    style={menuStyle}
                    value={this.state.stftConf.hop_length}
                    onChange={(event) => { this.handleWindowHopChange(event.target.value); }}
                >
                    <optgroup label="Hop Length">
                        <option value="256">256</option>
                        <option value="512">512</option>
                        <option value="1024">1024</option>
                    </optgroup>
                </select>
            </div>
        );
    }

    buildColorMapSelector() {
        return (
            <div>
                <select
                    style={menuStyle}
                    onChange={(event) => { this.handleColorMapChange(event.target.value) }}
                >
                    <optgroup label="Color map">
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
                    </optgroup>
                </select>

            </div>
        );
    }

    buildColorFilterSliders() {
        return (
            <div>
                <div>
                    <label style={sliderStyle}>
                        Filtro inferior:
                        <input
                            id="minFilter"
                            name="minFilter"
                            style={menuStyle}
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            onChange={(event) => this.handleMinFilterChange(event.target.value)}
                            value={this.state.colorConf.lim_inf}
                        />
                    </label>
                </div>
                <div>
                    <label style={sliderStyle}>
                        Filtro superior:
                        <input
                            id="maxFilter"
                            name="maxFilter"
                            style={menuStyle}
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            onChange={(event) => this.handleMaxFilterChange(event.target.value)}
                            value={this.state.colorConf.lim_sup}
                        />
                    </label>
                </div>
            </div>
        );
    }

    buildReproductionButton() {
        return (
            <div>
                <button
                    style={{ margin: '10px' }}
                    type="button"
                    className="play"
                    onClick={() => this.props.playAndPause()}
                >
                    Play/Pause
                </button>
            </div>
        );
    }

    render() {

        return (
            <div className="btn-group-vertical">
                {ReactDOM.createPortal(
                    <div>
                        {this.buildCanvasSlider()}
                        {this.buildInfoWindow()}
                    </div>,

                    this.props.canvas.parentNode,
                )}

                <div>
                    {this.buildSwitchButtons()}
                </div>

                <div>
                    {this.buildActionButtons()}
                </div>

                <div>
                    {this.buildSTFTMenus()}
                </div>

                <div>
                    {this.buildColorMapSelector()}
                </div>

                <div>
                    {this.buildColorFilterSliders()}
                </div>
                <div>
                    {this.buildReproductionButton()}
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
    * Computes canvas borders times.
    */
    canvasTimes: PropTypes.func.isRequired,
    /**
    *Modifies state in zoomSwitchButton
    */
    switchButton: PropTypes.func.isRequired,
    /**
    * Methods to return to past images.
    */
    actionButtons: PropTypes.shape({
        revertAction: PropTypes.func,
        home: PropTypes.func,
    }),
    /**
    * Methods to modify stft computations settings.
    */
    setSTFT: PropTypes.shape({
        modifyWindowFunction: PropTypes.func.isRequired,
        modifyHopLength: PropTypes.func.isRequired,
        modifyWindowSize: PropTypes.func.isRequired,

    }),
    /**
    * Methods to modify colorMap settings.
    */
    setColorMap: PropTypes.shape({
        modifyColorMap: PropTypes.func.isRequired,
        modifyInfFilter: PropTypes.func.isRequired,
        modifySupFilter: PropTypes.func.isRequired,
    }),
    /**
    * Methods required to move sliderDiv.
    */
    movement: PropTypes.shape({
        moveToCenter: PropTypes.func.isRequired,
        sliderCoords: PropTypes.func.isRequired,
    }),
    /**
    * Method to play audio.
    */
    playAndPause: PropTypes.func.isRequired,
};

