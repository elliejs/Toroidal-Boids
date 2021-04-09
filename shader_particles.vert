#ifdef GL_ES
precision mediump float;
#endif

attribute vec2 aPos;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

uniform sampler2D particle_info;

uniform vec3 resolution;

varying vec3 pVel;

void main() {
  float xpos = aPos.x;
  float ypos = aPos.y;

  bool locNotVel = ypos < 0.5;
  float yloc = locNotVel ? ypos : ypos - 0.5;
  float yvel = locNotVel ? ypos + 0.5 : ypos;

  vec3 loc = texture2D(particle_info, vec2(xpos, yloc)).xyz;
  vec3 vel = texture2D(particle_info, vec2(xpos, yvel)).xyz;

  float range = resolution.y - resolution.x;
  vec3 almost_fixed = (loc * range) + resolution.x;
  vec3 pos_fixed = vec3(almost_fixed.xy, almost_fixed.z + resolution.z);

  gl_Position = uProjection * uView * uModel * vec4(pos_fixed, 1.);
  gl_PointSize = 5.;
  pVel = vel;
}
