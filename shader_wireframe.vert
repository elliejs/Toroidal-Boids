#ifdef GL_ES
precision mediump float;
#endif

attribute vec3 aPos;

uniform mat4 uProjection;
uniform mat4 uModel;
uniform mat4 uView;

uniform vec3 resolution;

varying vec3 pVel;

void main() {
  float range = resolution.y - resolution.x;
  vec3 almost_fixed = (aPos * range) + resolution.x;
  vec3 pos_fixed = vec3(almost_fixed.xy, almost_fixed.z + resolution.z);

  gl_Position = uProjection * uView * uModel * vec4(pos_fixed, 1.);
  pVel = vec3(aPos);
}
