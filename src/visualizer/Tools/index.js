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

function InfoWindow(props) {
    return (
        <div
            id = "infoWindow"
            style={infoWindowStyle}>
            <p style={{color: '#ffffff'}}>
                {props.time}
            </p>
            <p style={{color: '#ffffff'}}>
                {props.frequency}
            </p>    
        </div>
    )
}

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

//--------------------------------------------------------


export default class Toolbox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            window_size: props.config.STFT.window_size,
            window_function: props.config.STFT.window_function,
            hop_length: props.config.STFT.hop_length,
            color_map: '0.0',
            lim_inf: 0,
            lim_sup: 1,
            duration: 1,
            initialTime: 0,
            finalTime: 0,
            dragging: false,
            cursorInfo: { time: 0, frequency: 0 },
        };

        // console.log('tools config', props.config);
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
                <div className="custom-control custom-switch">
                    <input
                        type="checkbox"
                        id="customSwitch1"
                        className="custom-control-input"
                        onChange={() => {
                            this.props.switchButton();
                        }}
                    />
                    <label className="custom-control-label" htmlFor="customSwitch1">
                        Zoom Tool
                    </label>
                </div>
                <div>
                    <button
                        style={buttonStyle}
                        onClick={() => this.props.revertAction()}
                    >
                        Visualizacion previa
                    </button>

                    <button
                        style={buttonStyle}
                        onClick={() => this.props.home()}
                    >
                        Vista Initial
                    </button>   
                </div>

                <div className="custom-control custom-switch" >

                    <input
                        style={buttonStyle}
                        type="checkbox"
                        id="informationWindowSwitch"
                        className="custom-control-input"
                        onChange={() => this.showHideInfoWindow()} 
                    />
                    <label  className="custom-control-label" htmlFor="informationWindowSwitch">
                        Information Window
                    </label>

                </div>    


                <select
                    style={menuStyle}
                    onChange={(event) => {
                        this.handleWindowFunctionChange(event.target.value);
                    }}
                    value={this.state.window_function}
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
                        this.handleWindowSizeChange(event.target.value);
                    }}
                    value={this.state.window_size}
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
                        this.handleWindowHopChange(event.target.value)
                    }}
                    value={this.state.hop_length}
                >
                    <optgroup label="Hop Length">
                        <option value="256">256</option>
                        <option value="512">512</option>
                        <option value="1024">1024</option>
                    </optgroup>
                </select>


                <select
                    style={menuStyle}
                    onChange={(event) => this.handleColorMapChange(event.target.value)}
                    value={this.state.color_map}                 
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

                <label style={buttonStyle}>
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
                        value={this.state.lim_inf}
                    />
                </label>

                <label style={buttonStyle}>
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
                        value={this.state.lim_sup}
                    />
                </label>


                <div>   
                    <button
                        style={{margin:'10px'}}
                        type="button"
                        className="play"
                        onClick={() => this.reproduce()}
                    >
                        Play/Pause
                    </button>

                </div>
            </div>
        );
    }
}