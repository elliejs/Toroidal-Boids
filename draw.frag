#ifdef GL_ES
precision mediump float;
#endif

varying vec3 pVel;

void main() {
  gl_FragColor = vec4(pVel, 1.);
}
