// This file should be used to code tge component related to the tools needed in visualizator
import React from 'react';


export default class Toolbox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            window_size: 1024,
            window_function: 'hann',
            hop_length: 256,
            color_map: 'Grass',
            lim_inf: 0,
            lim_sup: 1,
            reproduction_time: 0,
        };
    }

    handleWindowSizeChange(value) {
        this.setState({ window_size: value });
        this.props.modifyWindowSize(parseInt(value, 10));
    }

    handleWindowFunctionChange(type) {
        this.setState({ window_function: type });
        this.props.modifyWindowFunction(type);
    }

    handleWindowHopChange(percentage) {
        this.setState(
            (state) => ({ hop_length: state.window_size * percentage }),
            () => this.props.modifyHopLength(this.state.hop_length),
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

    handleReproductionTime(normalizedTime) {
        this.setState({ reproduction_time: normalizedTime });
    }

    reproduce() {
        this.props.reproduce(this.state.reproduction_time);
    }


    render() {
        const buttonstyle = {
            align: 'left',
            width: '90%',
            margin: '10px',
        };

        return (
            <div className="btn-group-vertical">

                <div className="custom-control custom-switch" style={buttonstyle}>
                    <input
                        type="checkbox"
                        id="customSwitch1"
                        className="custom-control-input"
                        onChange={() => this.props.switchButton()}
                    />
                    <label className="custom-control-label" htmlFor="customSwitch1">Zoom Tool</label>
                </div>

                <div className="custom-control custom-switch" style={buttonstyle}>

                    <input
                        type="checkbox"
                        id="informationWindow"
                        className="custom-control-input"
                        onChange={() => this.props.showInfoWindow()} 
                        // style={buttonstyle}
                    />
                    <label className="custom-control-label" htmlFor="informationWindow">Information Window</label>

                </div>    


                <select
                    style={buttonstyle}
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
                    style={buttonstyle}
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
                    style={buttonstyle}
                    onChange={(event) => this.handleWindowHopChange(event.target.value)}
                    value={this.state.hop_length}
                >
                    <optgroup label="Hop Length">
                        <option value=".25">25%</option>
                        <option value=".5">50%</option>
                        <option value=".75">75%</option>
                    </optgroup>
                </select>


                <select
                    style={buttonstyle}
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

                <label>
                    Filtro inferior
                    <input
                        id="minFilter"
                        name="minFilter"
                        style={buttonstyle}
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        onChange={(event) => this.handleMinFilterChange(event.target.value)}
                        value={this.state.lim_inf}
                    />
                </label>

                <label>
                    Filtro superior
                    <input
                        id="maxFilter"
                        name="maxFilter"
                        style={buttonstyle}
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        onChange={(event) => this.handleMaxFilterChange(event.target.value)}
                        value={this.state.lim_sup}
                    />
                </label>

                <label>
                    Tiempo inicial de reproduccion
                    <input 
                        id="timeLSelector"
                        name="timeSelector"
                        style={buttonstyle}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        onChange={(event) => this.handleReproductionTime(event.target.value)}
                        value = {this.state.reproduction_time}
                    />
                </label>

                <p 
                    margin-left='40px'
                >
                {this.state.reproduction_time}
                </p>

                <div>   
                    <button
                        style={buttonstyle}
                        type="button"
                        className="play"
                        onClick={() => this.reproduce()}
                    >
                    Play
                    </button>
                    <button
                        style={buttonstyle}
                        type="button"
                        className="stop"
                        onClick={() => this.props.stopReproduction()}
                    >
                    Stop
                    </button>
                </div>       

            </div>
        );
    }
}
