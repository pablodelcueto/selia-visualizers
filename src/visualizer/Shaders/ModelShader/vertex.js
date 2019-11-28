import Locations from './locations';

export default `                             
    precision highp float;  
    varying vec4 v_destinationColor;

    attribute vec2 ${Locations.POSITION};
    attribute float ${Locations.COLOR}; 

    void main(void) {    
        gl_Position = vec4(${Locations.POSITION},0.0,1.0);
        
        v_destinationColor = (${Locations.COLOR})*vec4(.1412,0.067,.4716,1.0)
                                         + (1.0 - (${Locations.COLOR})) * vec4(0.1, 0.1, 0.0, 1.0);
        
        // v_destinationColor = vec4(${Locations.COLOR}/20.0*.1412, 
        //                           ${Locations.COLOR}/20.0*0.067,
        //                           ${Locations.COLOR}/20.0*0.4716,
        //                              1.0);   
        // v_destinationColor = vec4(${Locations.COLOR}/200.0,0.0,0.0,${Locations.COLOR});  
        // v_destinationColor = vec4($Locations.COLOR);                            
    }

`;