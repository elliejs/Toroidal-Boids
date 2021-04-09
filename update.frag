#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D particle_info;
const float numParticles_dim = 75.;
uniform float f_imp;
uniform float s_imp;
uniform float a_imp;
uniform float c_imp;
uniform float ring_inner;
uniform float ring_outer;

float dist(vec3 a, vec3 b) {
  if(a == b) {
    return 0.;
  } else {
    return sqrt(pow(b.x - a.x, 2.) +
                pow(b.y - a.y, 2.) +
                pow(b.z - a.z, 2.));
  }
}

vec3 zero_monad_normalize(vec3 a) {
  if(a == vec3(0.) || length(a) == 0.) {
    return a;
  } else {
    return normalize(a);
  }
}

vec3 convert_vel(vec4 vel_raw) {
  vec3 vel_adj = (vel_raw.xyz - 0.5) * 2.;
  return vel_adj * vel_raw.w;
}

vec4 SAC_adj_vel(vec3 loc, vec4 vel) {
  vec3 separation_suggestion = vec3(0.);
  vec3 alignment_suggestion = vec3(0.);
  vec3 cohesion_suggestion = vec3(0.);

  float count = 0.;

  for(float i = 0.; i < numParticles_dim; i++) {
    for(float j = 0.; j < numParticles_dim; j++) {
      vec3 cmp_loc = texture2D(particle_info, vec2(i, j)).xyz;
      vec3 cmp_vel = texture2D(particle_info, vec2(i, j + numParticles_dim)).xyz;



      float dist;
      vec3 real_loc;
      if((dist = distance(real_loc = cmp_loc, loc)) < ring_outer ||
         (dist = distance(real_loc = cmp_loc + 1., loc)) < ring_outer ||
         (dist = distance(real_loc = cmp_loc - 1., loc)) < ring_outer ) {
        if(dist < ring_inner) {
          separation_suggestion += (loc - real_loc) * (ring_inner - dist);
        }
        alignment_suggestion  += (cmp_vel - vel.xyz) * (ring_outer - dist);
        cohesion_suggestion   += real_loc;

        count++;
      }
    }
  }
   vec3 final_suggestion;
   if(count > 0.) {
     separation_suggestion = zero_monad_normalize(separation_suggestion) * s_imp;
     alignment_suggestion = zero_monad_normalize(alignment_suggestion) * a_imp;
     cohesion_suggestion = zero_monad_normalize(cohesion_suggestion / count - loc) * c_imp;

     final_suggestion = (separation_suggestion + alignment_suggestion + cohesion_suggestion) * f_imp;
   } else {
     final_suggestion = vec3(0.);
   }
   return vec4(clamp(vel.xyz + final_suggestion, 0., 1.), vel.w);
}


void main() {
  float xpos = gl_FragCoord.x / numParticles_dim;
  float ypos = gl_FragCoord.y / (numParticles_dim * 2.);

  bool locNotVel = ypos < 0.5;

  float yloc = locNotVel ? ypos : ypos - 0.5;
  float yvel = locNotVel ? ypos + 0.5 : ypos;

  vec3 loc = texture2D(particle_info, vec2(xpos, yloc)).xyz;
  vec4 vel = texture2D(particle_info, vec2(xpos, yvel));

  if(locNotVel) {
    gl_FragColor = vec4(mod(loc + convert_vel(vel), 1.), 1.);
  } else {
    gl_FragColor = SAC_adj_vel(loc, vel);
  }
}
