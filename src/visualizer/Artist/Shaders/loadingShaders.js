  const VERTEX_LOADING_SHADER = `   
      precision mediump float;  
      attribute vec2 a_position;    

      void main() {    
          gl_Position = vec4(a_position, 0.0,1.0);                            
      }
  `;

  const FRAGMENT_LOADING_SHADER = ` 
      precision highp float;

      void main() {
          gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
      }
  `;

  const FRAGMENT_SHADER = `
  precision mediump float;

  // Passed in from the vertex shader.
  varying vec2 v_texcoord;

  // The texture.
  uniform sampler2D u_texture;
  uniform sampler2D u_color;

  // Color map variables
  float column = 0.240;
  float max_lim = 1.0;
  float min_lim = 0.0;
  float epsilon = 4.0;
  float max_value = 100000000.0;

  void main() {
     float min_log = log(epsilon);
     float max_log = log(max_value + epsilon);
     float log_range = max_log - min_log;

     vec4 spec_value = texture2D(u_texture, v_texcoord);
     float log_spec_value = (log(spec_value.r + epsilon) - min_log) / log_range;
     float color_value = 1.0 - (min(max(log_spec_value, min_lim), max_lim) - min_lim) / (max_lim - min_lim);
     // float color_value = (min(max(spec_value.r, min_lim), max_lim) - min_lim) / (max_lim - min_lim);

     vec2 color_coords = vec2(color_value, column);

     gl_FragColor = texture2D(u_color,color_coords);  
  }
  `

  const VERTEX_SHADER = `
  attribute vec4 a_position;
  attribute vec2 a_texcoord;

  uniform mat3 u_matrix;
  varying vec2 v_texcoord;

  void main() {
    // Multiply the position by the matrix.
    // gl_Position = a_position;
    gl_Position = vec4(u_matrix*vec3(a_position.xy,1.0),1.0);
    
    // Pass the texcoord to the fragment shader.
    v_texcoord = vec2(a_texcoord.x,a_texcoord.y);
  }
  `

  export {VERTEX_LOADING_SHADER, FRAGMENT_LOADING_SHADER,VERTEX_SHADER, FRAGMENT_SHADER};