const FRAGMENT_SHADER = `
  precision mediump float;

  // Passed in from the vertex shader.
  varying vec2 v_texcoord;
  varying vec3 v_color;

  // The texture.
  uniform sampler2D u_texture;
  uniform sampler2D u_color;

  //Color setting.
  // uniform float u_colorMap;
  varying vec2 v_colorMap;

  // Color map variables
  float column = 0.45;
  float max_lim = 1.0;
  float min_lim = 0.0;
  float epsilon = 4.0;
  float max_value = 100000000.0;

  void main() {
     // column = v_colorMap.x;
     float min_log = log(epsilon);
     float max_log = log(max_value + epsilon);
     float log_range = max_log - min_log;

     vec4 spec_value = texture2D(u_texture, v_texcoord);
     float log_spec_value = (log(spec_value.r + epsilon) - min_log) / log_range;
     float color_value = 1.0 - (min(max(log_spec_value, min_lim), max_lim) - min_lim) / (max_lim - min_lim);
     // float color_value = (min(max(spec_value.r, min_lim), max_lim) - min_lim) / (max_lim - min_lim);

     vec2 color_coords = vec2(color_value, column);
     // vec2 color_coords = vec2(color_value, v_colorMap.x);

     gl_FragColor = texture2D(u_color,color_coords);
     // gl_FragColor = texture2D(u_color, v_colorMap);  
  }
  `;

const VERTEX_SHADER = `
  attribute vec4 a_position;
  attribute vec2 a_texcoord;

  uniform mat3 u_matrix;
  varying vec2 v_texcoord;

  uniform float u_colorMap;
  varying vec2 v_colorMap;

  void main() {
    // Multiply the position by the matrix.
    // gl_Position = a_position;
    gl_Position = vec4(u_matrix*vec3(a_position.xy,1.0),1.0);
    
    // Pass the texcoord to the fragment shader.
    v_texcoord = vec2(a_texcoord.x,a_texcoord.y);
    // v_color = vec3(u_column.x, u_limFilters.x, u_limFilters.y);
    v_colorMap = vec2(u_colorMap,0);
  }
  `;

export { VERTEX_SHADER, FRAGMENT_SHADER }