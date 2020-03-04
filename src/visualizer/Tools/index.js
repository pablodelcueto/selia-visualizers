// This file should be used to code tge component related to the tools needed in visualizator
import React from 'react';
import Slider from 'react-input-slider';
// import 


export default class Toolbox extends React.Component{
    constructor(props){
        super(props)
        this.state={
            window_size:1024,
            window_function: 'hann',
            hop_length : 256,
            color : 'magma',
            lim_inf : 0,
            lim_sup : 1,
        }
    }

     handleWindowSizeChange = (value) =>{
         this.setState({window_size: value});
         this.props.modifyWindowSize(parseInt(value));
     }

     handleWindowFunctionChange = (type) =>{
         this.setState({window_function: type});
         this.props.modifyWindowFunction(type);
     }

     handleWindowHopChange = (percentage) => {
         let newHop = this.state.window_size*percentage;
         this.setState({hop_length: newHop});
         this.props.modifyHopLength(newHop);
     }

     handleColorMapChange = (color) =>{
         this.setState({color: color});
         this.props.modifyColorMap(parseFloat(color));
     }

     handleMinFilterChange = (value) =>{
         this.props.modifyMinFilter (value);
     }

     handleMaxFilterChange = (value) => {
         this.props.modifyMaxFilter(value);
     }


    render(){
        let buttonstyle={
            align:'left',
            width:'90%',
            margin:'10px',
        };

        return (
            <div className="btn-group-vertical" >
                
                <div className="custom-control custom-switch" style={buttonstyle}>
                  <input type="checkbox"  id = "customSwitch1"

                                          className="custom-control-input" 
                                          id="customSwitch1"
                                          onChange = {() => this.props.switchButton()}  />
                  <label className="custom-control-label" htmlFor="customSwitch1">Zoom Tool</label>
                </div>

                <button style = {buttonstyle}
                        onClick={()=>this.props.showInfoWindow()} >
                        {" Information Window"}
                </button>
                

                <select style = {buttonstyle} onChange={(event)=>  {
                                                    this.handleWindowFunctionChange(event.target.value)}} >                                                        
                    <optgroup label = "Window Type">
                    <option value="hann" >Hann</option>
                    <option value = "hamming"> Hamming </option>
                    <option value="float32"> Linear </option>
                    </optgroup>
                </select>  

                <select style = {buttonstyle} onChange={(event) =>  {
                                                    this.handleWindowSizeChange(event.target.value)}} > 
                    <optgroup label = "Window Size">
                    <option value="512" >512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                    </optgroup>
                </select> 

                <select style = {buttonstyle} onChange = {(event) => {
                                                    this.handleWindowHopChange(event.target.value)}} >
                    <optgroup label = "Hop Length">
                    <option value=".25" >25%</option>
                    <option value=".5">50%</option>
                    <option value=".75">75%</option>
                    </optgroup>
                </select> 


                <select style = {buttonstyle} onChange={ (event)=>this.handleColorMapChange(event.target.value)} > 
                    <optgroup label = "Color map">
                    <option value = "0" >Grass</option>
                    <option value = "0.1" > Phanton Grass</option>
                    <option value = "0.2" > Purple Haze </option>
                    <option value = "0.3" > Grays </option>
                    <option value = "0.4" > Fish tank </option>
                    <option value = "0.6" > Pink Floyd</option>
                    <option value = "0.7" > Dark Sunset</option>
                    <option value = "0.8" > Grapes </option>
                    <option value = "0.9" > Kind of Blue  </option> 
                    <option value = "1.0" > Magma </option> 
                    </optgroup>
                </select>   

                <input id="minFilter"style = {buttonstyle} type = {"range"} min="0" max="1" step="0.1"  onChange=
                                                                    { (event) => this.handleMinFilterChange(event.target.value)} />
                <label htmlFor = "minFilter" style={{margin:'10px'}}> Filtro inferior </label>
                <input id="maxFilter" style = {buttonstyle} type={"range"} min = '0' max= '1' step="0.1"  onChange=
                                                                    {(event)=> this.handleMaxFilterChange(event.target.value)} />
                <label htmlFor="maxFilter" style={{margin:'10px'}}> Filtro superior </label> 
            </div> 
            )
    }
}



