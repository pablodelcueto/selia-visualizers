const VERTEX_LOADING_SHADER = `
  attribute vec4 al_position;
  uniform mat3 u_matrix;
  void main() {
    gl_Position = vec4(u_matrix*vec3(al_position.xy,1.0),1.0);
    // gl_Position = al_position;
  }
  `;

const FRAGMENT_LOADING_SHADER = `
  precision mediump float; 
  void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.5);
  }
  `;

const VERTEX_SHADER = `
  // position of point to render. To each of this point will correspond a point of the texture.
  attribute vec4 a_position;
  // vertices that defining the bounding box and orientation of the spectrogram texture. 
  attribute vec2 a_texcoord;

  // transformation matrix to change spectrogram view.
  uniform mat3 u_matrix;

  varying vec2 v_texcoord;

  void main() {
    // Multiply the position by the matrix.
    gl_Position = vec4(u_matrix*vec3(a_position.xy,1.0),1.0);
    
    // Pass the texcoord to the fragment shader.
    v_texcoord = vec2(a_texcoord.x,a_texcoord.y);  
  }
  `;

const FRAGMENT_SHADER = `
  precision mediump float;

  // Passed in from the vertex shader.
  varying vec2 v_texcoord;
  // The texture with stft coefficient values. 
  uniform sampler2D u_texture;
  // The texture with colors related to the coefficient values.
  uniform sampler2D u_color;

  //Color setting.
  //number related to a line in the colorMap image.
  uniform float u_colorMap;
  // Inferior filter.
  uniform float u_minLim;
  // Superior filter.
  uniform float u_maxLim;

  // Value to avoid computing log(0);
  float epsilon = 4.0;
  // Every value above it will be decrease.
  float max_value = 100000000.0;

  void main() {

     float min_log = log(epsilon);
     float max_log = log(max_value + epsilon);
     float log_range = max_log - min_log;

     
     vec4 spec_value = texture2D(u_texture, v_texcoord);
     float log_spec_value = (log(spec_value.r + epsilon) - min_log) / log_range;
     float color_value = 1.0 - (min(max(log_spec_value, u_minLim), u_maxLim) - u_minLim) / (u_maxLim - u_minLim);

     vec2 color_coords = vec2(color_value, u_colorMap);

     gl_FragColor = texture2D(u_color,color_coords);  
  }
  `;


export { VERTEX_SHADER, VERTEX_LOADING_SHADER, FRAGMENT_SHADER, FRAGMENT_LOADING_SHADER };
