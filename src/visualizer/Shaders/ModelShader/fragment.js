export default `
    precision highp float;
    varying vec4 v_destinationColor;
    varying vec2 v_texcoord;

    // uniform sampler2D u_texture;

    void main(void) {
        gl_FragColor = v_destinationColor;
        // gl_FragColor = vec4(1.0,0.0,0.0,1.0);
    }
`;