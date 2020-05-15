/**
* module for tool box. 
* @module Tools/index
* @see module:Tools.index.js
*/

// This file should be used to code tge component related to the tools needed in visualizator
import React from 'react';
import ReactDOM from 'react-dom';

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
* Creates canvas representing block.
* @param {Object} props - Properties.
* @param {number} props.initialTime - Left border canvas time.
* @param {number} props.finalTime - Rigth border canvas time.
* @param {number} props.audioDurarion - Audio file duration.
* @param {number} props.containerLength - Canvas container length.
* @return {Object} React element.
*/
function SliderDiv(props) {
    const initialPixel = (props.initialTime / props.audioDuration) * props.containerLength;
    const pixelLength = props.containerLength
        * (Math.abs(props.finalTime - props.initialTime) / props.audioDuration);
    return (
        <div
            id = "sliderDiv"
            style={{
                left: initialPixel,
                position: 'absolute',
                width: pixelLength,
                height: '20px',
                zIndex: '2', 
                backgroundColor: 'rgba(0,0,0,0.3)',
            }} />
    )
}

/**
* Creates cursor information window.
* @param {Object} props - Properties.
* @param {number} props.time - Cursor position time.
* @param {number} props.frequency - Cursor position frequency.
* @return {Object} React element.
*/
function InfoWindow(props) {
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
* Creates a functional stripe with a slider div.
* @param {Object} props - Properties.
* @param {method} props.onMouseMove - Event Listener.
* @param {method} props.onMouseUp - Event Listener. 
* @param {method} props.onMouseDown - Event Listener.
* @return {Object} React Element.
*/
function CanvasSliderDiv(props) {
    return (
        <div
            style={canvasDivStyle}
            onMouseMove={props.onMouseMove}
            onMouseUp={props.onMouseUp}
            onMouseDown={props.onMouseDown}>
            <SliderDiv
                initialTime={props.initialTime}
                finalTime={props.finalTime}
                audioDuration={props.audioDuration}
                containerLength={props.canvasDivLength} />
        </div>
    );
}

/**
* Creates information window and zooming tool switches.
* @param {Object} props - Properties.
* @param {Method} props.switchButton - Activates zooming tool.
* @param {Method} props.showHideInfoWindow - Show or hide information window.
* @param {Object} React element.
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
                    onChange={() => { props.showHideInfoWindow() }}
                />
                <label className="custom-control-label" htmlFor="informationWindowSwitch">
                    Information window.
                </label>
            </div>
        </div>
    );
}

/**
* Creates action buttons.
* @param {Object} props - Properties.
* @param {Method} props.revertAction - Returns to previous zoom scale.
* @param {Method} props.home - Returns to initial time and frequency state.
* @param {Object} React element.
*/
function ActionBottons(props) {
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
* Creates menus to modify STFT configurations.
* @param {Object} props - Properties.
* @param {Method} props.handleWindowFunctionChange - Sets windowing type. 
* @param {Method} props.showHideInfoWindow - Show or hide information window.
* @param {Object} React element.
*/
function STFTmenus(props) {
    return (
        <div>
            <select
                style={menuStyle}
                onChange={(event) => {
                    props.handleWindowFunctionChange(event.target.value);
                }}
            >
                <optgroup label="Window Type">
                    <option value="hann">Hann</option>
                    <option value="hamming"> Hamming </option>
                    <option value="float32"> Linear </option>
                </optgroup>
            </select>

            <select
                style={menuStyle}
                onChange={(event) => {
                    props.handleWindowSizeChange(event.target.value);
                }}
            >
                <optgroup label="Window Size">
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                </optgroup>
            </select>

            <select
                style={menuStyle}
                onChange={(event) => {
                    props.handleWindowHopChange(event.target.value);
                }}
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

function ColorMenu(props) {
    return (
        <div>
            <select
                style={menuStyle}
                onChange={(event) => {props.handleColorMapChange(event.target.value)}}       
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

function ColorFilters(props) {
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
                        onChange={(event) => props.handleMinFilterChange(event.target.value)}
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
                        onChange={(event) => props.handleMaxFilterChange(event.target.value)}
                        value={props.lim_sup}
                    />
                </label>
            </div>
        </div>
    )
}    

 
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


class Toolbox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            window_size: props.config.stft.window_size,
            window_function: props.config.stft.window_function,
            hop_length: props.config.stft.hop_length,
            color_map: '0.0',
            lim_inf: 0,
            lim_sup: 1,
            duration: 1,
            initialTime: 0,
            finalTime: 0,
            dragging: false,
            cursorInfo: { time: 0, frequency: 0 },
        };

        this.props.audioFile.waitUntilReady().then(() => {
            this.setState({ duration: this.props.audioFile.mediaInfo.durationTime });
        })
    }


    componentDidMount() {
        this.addEventsToCanvas();
    }

    setSliderTimes(initTime, finalTime) {
        const [duration] = [this.state.duration];
        this.setState(
            () => ({
                initialTime: Math.max(0, initTime),
                finalTime: Math.min(duration, finalTime),
            }),
        );
    }

    addEventsToCanvas() {
        this.uncheckZoomTag = this.uncheckZoomTag.bind(this);
        this.props.canvas.addEventListener('mouseup', () => {
            this.uncheckZoomTag();
            this.unclickingDiv();
        });
        this.props.canvas.addEventListener('mousemove', (e) => {
            this.draggingOutDiv(e)});
    }

    handleWindowSizeChange(value) {
        this.setState({ window_size: value });
        this.props.modifyWindowSize(value);
        // this.props.modifyWindowSize(parseInt(value, 10));
    }

    handleWindowFunctionChange(type) {
        this.setState({ window_function: type });
        this.props.modifyWindowFunction(type);
    }

    handleWindowHopChange(newHopLength) {
        const hopLength = Math.min(this.state.window_size, newHopLength);
        this.setState({ hop_length: hopLength });
        this.setState(
            () => ({ hop_length: hopLength }),
            () => this.props.modifyHopLength(hopLength),
        );
    }

    handleColorMapChange(color) {
        this.setState({ color_map: color });
        console.log('this.state', this.state);
        this.props.modifyColorMap(parseFloat(color));
    }

    handleMinFilterChange(value) {
        this.setState({ lim_inf: value });
        this.props.modifyMinFilter(value);
    }

    handleMaxFilterChange(value) {
        this.setState({ lim_sup: value });
        this.props.modifyMaxFilter(value);
    }

    handleTranslation(newTime) {
        this.props.moveToCenter(newTime);
    }

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
        this.setState({cursorInfo:{ time:time, frequency:frequency}});
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
        return x * this.state.duration;
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
        this.setState({
            initialTime: times.leftTime,
            finalTime: times.rigthTime,
        });
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
                            canvas={this.props.canvas}
                            audioDuration={this.state.duration}
                            initialTime={this.state.initialTime}
                            finalTime={this.state.finalTime}
                            canvasDivLength={this.props.canvas.width}
                            onMouseDown={(event) => this.clickingDiv(event)}
                            onMouseMove={(event) => this.dragDivSlider(event)}
                            onMouseUp={(event) => this.unclickingDiv(event)} />
                        <InfoWindow 
                            time={this.state.cursorInfo.time}
                            frequency={this.state.cursorInfo.frequency} />
                    </div>,
                    this.props.canvasContainer,
                )}
                
                <div>
                    <SwitchButtons 
                        zoomSwitchButton={() => this.props.switchButton()} 
                        infoSwitchButton={() => this.showHideInfoWindow()} />
                </div>

                <div>
                    <ActionBottons 
                        home={() => this.props.home()}
                        revertAction={() => this.props.revertAction()} />
                </div>

                <div>
                    <STFTmenus
                        handleWindowFunctionChange={(value) => this.handleWindowFunctionChange(value)}
                        handleWindowSizeChange={(value) => this.handleWindowSizeChange(value)}
                        handleWindowHopChange={(value) => this.handleWindowHopChange(value)} />
                </div>

                <div>
                    <ColorMenu
                        handleColorMapChange={(value) => this.handleColorMapChange(value)}/>
                </div>

                <div>
                    <ColorFilters
                        handleMinFilterChange={(value) => this.handleMinFilterChange(value)}
                        lim_inf={this.state.lim_inf}
                        handleMaxFilterChange={(value) => this.handleMaxFilterChange(value)}
                        lim_sup={this.state.lim_sup} />
                </div>
                <div>   
                    <Reproductor reproduce={() => this.reproduce()} />
                </div>
            </div>
        );
    }
}

export default Toolbox;