/**
* module for tool box. 
* @module Tools/index
* @see module:Tools/index.js
*/

// This file should be used to code tge component related to the tools needed in visualizator
import React, { component } from 'react';
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

/**
* @component
* @example
* const props = {time: 0, frequency:10}
* return (
*     <InfoWindow props={props} />   
* )
*/
const InfoWindow = (props) => {
    return (
        <div
            id = "infoWindow"
            style={infoWindowStyle}>
            <p style={{ color: '#ffffff' }}>
                {props.time}
            </p>
            <p style={{ color: '#ffffff' }}>
                {props.frequency}
            </p>  
        </div>
    )
}

/**
* Creates canvas representing block.
* @component
* @example 
* return (
*    <SliderDiv 
*       initialPixel="230"
*       pixelLength="60"
*    />
* )
*/
function SliderDiv(props) {
    return (
        <div
            id="sliderDiv"
            style={{
                left: props.initialPixel,
                position: 'absolute',
                width: props.pixelLength,
                height: '20px',
                zIndex: '2',
                backgroundColor: 'rgba(0,0,0,0.3)',
            }} />
    )
}


/**
* @component
* Creates a fast time translations slider.
* @example
* return (
*     <CanvasSliderDiv
*        onMouseMove={() => onMouseMoveExampleMethod()}
*        onMouseUp={() => onMouseUpExampleMethod()}
*        onMouseDown={() => onMouseDownExampleMethod()}
*        initialPixel="50"
*        pixelLength="30"
*    />
* )
*/
function CanvasSliderDiv(props) {
    return (
        <div
            style={canvasDivStyle}
            onMouseMove={props.onMouseMove}
            onMouseUp={props.onMouseUp}
            onMouseDown={props.onMouseDown}>
            <SliderDiv
                initialPixel={props.initialPixel}
                pixelLength={props.pixelLength}
                 />
        </div>
    );
}

/**
* @component
* Creates information window and zooming tool activator/deactivators.
* @example 
* return (
*    <SwitchButtons
*        switchButton={() => swithButtonExampleMethod()}
*        showHideInfoWindow={() => hideExampleMethod()}
*        />
* )    
*/
function SwitchButtons(props) {
    return (
        <div>
            <div className="custom-control custom-switch">
                <input
                    style={sliderStyle}
                    type="checkbox"
                    id="customSwitch1"
                    className="custom-control-input"
                    onChange={() => { props.switchButton(); }}
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
                    onChange={() => { props.infoSwitchButton()}}
                />
                <label className="custom-control-label" htmlFor="informationWindowSwitch">
                    Information window.
                </label>
            </div>
        </div>
    );
}

/**
* @component
* @example
* return ( 
*        <ActionButtons 
*            home = {() => homeExampleMethod()}
*            revertAction = {() => revertActionExampleMethod()} />
* )
*/
function ActionButtons(props) {
    return (
        <div>
            <button
                style={buttonStyle}
                onClick={() => props.revertAction()} >
                Visualizacion previa
            </button>

            <button
                style={buttonStyle}
                onClick={() => props.home()}
            >
                Vista Initial
            </button>   
        </div>
    );
}

/**
* @component
* @example
* return(
*    <STFTmenus 
*       handleWindowFunctionChange={() => modifyFunctionExampleMethod()}
*       handleWindowSizeChange={() => modifySizeExampleMethod()}
*       handleWindowHopChange={() => modifyHopExampleMethod()} />
* )
*/
function STFTmenus(props) {
    return (
        <div>
            <select
                style={menuStyle}
                value={props.window_function}
                onChange={(event) => { props.handleWindowFunctionChange(event.target.value); }}
            >
                <optgroup label="Window Type">
                    <option value="hann">Hann</option>
                    <option value="hamming"> Hamming </option>
                    <option value="float32"> Linear </option>
                </optgroup>
            </select>

            <select
                style={menuStyle}
                value={props.window_size}
                onChange={(event) => { props.handleWindowSizeChange(event.target.value); }}
            >
                <optgroup label="Window Size">
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                </optgroup>
            </select>

            <select
                style={menuStyle}
                value={props.hop_length}
                onChange={(event) => { props.handleWindowHopChange(event.target.value); }}
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

/**
* @component
* Creates color map selector.
* @example
* return (
*     <ColorMenu
*        handleColorMapChange={() => colorMapSelector()} 
*     />
* )
*/
function ColorMenu(props) {
    const handleColorMapChange = props;
    return (
        <div>
            <select
                style={menuStyle}
                onChange={(event) => {handleColorMapChange(event.target.value)}}       
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

/**
* @component
* Creates color filter sliders.
* Used to limit color map minimum and maximum values.
* @example
* return (
*     <ColorFilters
*        handleMinFilterChange={() => minFilterSelector()}
*        handleMaxFilterChange={() => maxFilterSelector()}
*     />
* )
*/
function ColorFilters(props) {
    const {handleMinFilterChange, handleMaxFilterChange} = props;
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
                        onChange={(event) => handleMinFilterChange(event.target.value)}
                        value={props.lim_inf}
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
                        onChange={(event) => handleMaxFilterChange(event.target.value)}
                        value={props.lim_sup}
                    />
                </label>
            </div>
        </div>
    )
}    

/**
* @component
* Creates an audio reproduction button.
* @example
* return (
*     <Reproductor
*        reproduce={()=>reproduceExampleMethod()}
*     />
* )
*/
function Reproductor(props) {
    return (
        <div>
            <button
                style={{margin:'10px'}}
                type="button"
                className="play"
                onClick={() => props.reproduce()}
            >
                Play/Pause
            </button>
        </div>    
    )        
}


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
* @class
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
                window_function: this.props.config.stft.window_function,
                window_size: this.props.config.stft.window_size,
                hop_length: this.props.config.stft.hop_length,   
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

        this.props.audioFile.waitUntilReady().then(() => {
            this.setState((prevState) => ({
                timeSettings: {
                    ...prevState.timeSettings,
                    duration: this.props.audioFile.mediaInfo.durationTime,
                },
            }));
        });
    }

    /**
    * Initialize the toolBox.
    * @private
    */
    componentDidMount() {
        this.addEventsToCanvas();
    }

    /**
    * Used to set initTime and finalTime in state.timeSettings.
    * @param {number} initTime - initialTime for state.timeSettings.
    * @param {number} finalTine - finalTime for state.timeSettings.
    * @private
    */
    setSliderTimes(initTime, finalTime) {
        const [duration] = [this.state.timesSettings.duration];
        this.setState(
            () => ({
                timeSettings: {
                    initialTime: Math.max(0, initTime),
                    finalTime: Math.min(duration, finalTime),
                },
            }),
        );
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
        const realValue = Math.max(windowSize, this.state.stftConf.hop_length);
        this.setState((prevState) => ({
            stftConf: {
                ...prevState.stftConf,
                window_size: realValue,
            },
        }));
        this.props.modifyWindowSize(realValue);
    }

    /**
    * Set window type in state.stftConf.
    * Modifies window function in menu and calls for window function modification in props.
    * @param {string} type - New window type name.
    * @public
    */
    handleWindowFunctionChange(type) {
        this.setState((prevState) => ({
            stftConf: {
                ...prevState.stftConf,
                window_function: type,
            },
        }));
        this.props.modifyWindowFunction(type);
    }
 
    /**
    * Set hop length in state.stftConf.
    * Modifies window hop length in menu and calls hop length modification in props.
    * @param {number} newHopLength - New hop length value.
    * @public
    */
    handleWindowHopChange(newHopLength) {
        const realValue = Math.min(this.state.stftConf.window_size, newHopLength);
        this.setState((prevState) => ({
            stftConf: {
                ...prevState.stftConf,
                hop_length: realValue,
            },
        }));
        this.props.modifyHopLength(realValue);
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
    * Set lim_inf in state.colorConf.
    * Triggers props.modifyInfFilter method.
    * @param {number} value - Value to set as inferior limin filter in colorMap.
    * @public
    */
    handleMinFilterChange(value) {
        this.setState((prevState) => ({
            colorConf: {
                ...prevState.colorConf,
                lim_inf: value,
            },
        }));
        this.props.modifyInfFilter(value);
    }

    /**
    * Set lim_sup value in state.colorConf.
    * Triggers props.modifySupFilter method.
    * @param {number} value - Value to set as superior limit filter in colorMap.
    * @public
    */
    handleMaxFilterChange(value) {
        this.setState((prevState) => ({
            colorConf: {
                ...prevState.colorConf,
                lim_sup: value,
            },
        }));
        this.props.modifySupFilter(value);
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

    showHideInfoWindow() {
        let infoWindow = document.getElementById('infoWindow');
        if (infoWindow.style.display === 'none'){
            document.getElementById('infoWindow').style.display='block'
        } else {
            infoWindow.style.display='none';
        }
    }

    setCursorInfo(time, frequency) {
        this.setState({ cursorInfo: { time: time, frequency: frequency } });
    }

    uncheckZoomTag() {
        // this.setState({dragging: false });
        const checkBox = document.getElementById('customSwitch1');
        if (checkBox.checked === true) {
            this.props.switchButton()
        }
        checkBox.checked = false;
    }


    unitaryIntervalToTime(x) {
        return x * this.state.timeSettings.duration;
    }


    clickingDiv(event) {
        const times = this.props.canvasTimes();
        const centralTime = this.unitaryIntervalToTime(this.props.canvasCoords(event));
        this.props.moveToCenter(centralTime);
        const [leftTime, rigthTime] = [times.leftTime, times.rigthTime];
        const timeLength = rigthTime - leftTime;
        this.setSliderTimes(centralTime - timeLength / 2, centralTime + timeLength / 2);
        this.setState({ dragging: true });
    }

    dragDivSlider(event) {
        const times = this.props.canvasTimes();
        if (this.state.dragging) {
            const centralTime = this.unitaryIntervalToTime(this.props.canvasCoords(event));
            this.props.moveToCenter(centralTime);
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
        this.setState((prevState) => ({
            timeSettings: {
                ...prevState.timeSettings,
                initialTime: times.leftTime,
                finalTime: times.rigthTime,
            },
        }));
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

    render() {
        return (
            <div className="btn-group-vertical">
                {ReactDOM.createPortal(
                    <div>
                        <CanvasSliderDiv
                            initialPixel={this.computeInitialPixel()}
                            pixelLength={this.computePixelLength()}
                            onMouseDown={(event) => this.clickingDiv(event)}
                            onMouseMove={(event) => this.dragDivSlider(event)}
                            onMouseUp={(event) => this.unclickingDiv(event)}
                        />
                        <InfoWindow
                            time={this.state.cursorInfo.time}
                            frequency={this.state.cursorInfo.frequency}
                        />
                    </div>,
                    this.props.canvasContainer,
                )}
               
                <div>
                    <SwitchButtons
                        zoomSwitchButton={() => this.props.switchButton()}
                        infoSwitchButton={() => this.showHideInfoWindow()}
                    />
                </div>

                <div>
                    <ActionButtons
                        home={() => this.props.home()}
                        revertAction={() => this.props.revertAction()}
                    />
                </div>

                <div>
                    <STFTmenus
                        handleWindowFunctionChange={
                            (value) => this.handleWindowFunctionChange(value)
                        }
                        handleWindowSizeChange={(value) => this.handleWindowSizeChange(value)}
                        handleWindowHopChange={(value) => this.handleWindowHopChange(value)}
                        window_function={this.state.stftConf.window_function}
                        window_size={this.state.stftConf.window_size}
                        hop_length={this.state.stftConf.hop_length}
                    />
                </div>

                <div>
                    <ColorMenu
                        handleColorMapChange={(value) => this.handleColorMapChange(value)}
                    />
                </div>

                <div>
                    <ColorFilters
                        handleMinFilterChange={(value) => this.handleMinFilterChange(value)}
                        lim_inf={this.state.colorConf.lim_inf}
                        handleMaxFilterChange={(value) => this.handleMaxFilterChange(value)}
                        lim_sup={this.state.colorConf.lim_sup}
                    />
                </div>
                <div>
                    <Reproductor
                        reproduce={() => this.reproduce()}
                    />
                </div>
            </div>
        );
    }
}

export default Toolbox;
// export { Reproductor, Toolbox };

Reproductor.propTypes = {
    reproduce: PropTypes.func.isRequired,
};

Toolbox.propTypes = {
    /**
    * AudioFile
    */
    audioFile: PropTypes.number.isRequired,
};
