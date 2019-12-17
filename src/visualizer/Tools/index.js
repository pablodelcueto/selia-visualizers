// This file should be used to code tge component related to the tools needed in visualizator
import React from 'react'
// import 


export default class Toolbox extends React.Component{
    constructor(props){
        super(props)
        this.state={
            windowSize:512,
        }
    }
     handleWindowSizeChange = (e) =>{
         this.setState({
             windowSize:e.target.value
         })
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
                        onClick={()=>this.props.decreaseBrightness()} >
                        {" Brightness: -"}
                </button>
                
                <button  
                    style ={buttonstyle}
                    onClick={()=>this.props.increaseBrightness()} >
                    {"Brightness: +"}
                </button>
                {/*<button style={buttonstyle} onClick={()=>this.props.moveRight()} > {"Move Rigth"}</button>
                <button style={buttonstyle} onClick={()=>this.props.moveLeft()} >{"Move Left"}</button>
                <button style={buttonstyle} onClick={()=>this.props.zoomIn()} >{"Zoom In"}</button>
                <button style={buttonstyle} onClick={()=>this.props.zoomOut()} >{"Zoom Out"}</button>*/}


                <select style = {buttonstyle} onChange={this.handleWindowTypeChange} > 
                    <optgroup label = "Window Type">
                    <option value="Hann" >Hann</option>
                    <option value="Linear"> Linear </option>
                    </optgroup>
                </select>  

                <select style = {buttonstyle} onChange={(e)=>this.props.windowSize(parseInt(e.target.value))} > 
                    <optgroup label = "Window Size">
                    <option value="256" >256</option>
                    <option value="512" >512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                    </optgroup>
                </select> 

                <select style = {buttonstyle} onChange={this.hanleColorMapChange} > 
                    <optgroup label = "Color map">
                    <option value="Blue gum" >Blue gum</option>
                    <option value="Magma">Magma</option>
                    </optgroup>
                </select>   
            </div> 
            )
    }
}



