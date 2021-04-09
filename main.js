const glslify  = require('glslify')
const shell    = require('gl-now')(extensions = ['OES_texture_float', 'WEBGL_color_buffer_float'])
const glShader = require('gl-shader')
const Buffer   = require('gl-buffer')
const Texture  = require('gl-texture2d')
const FBO      = require("gl-fbo")
const mat4     = require('gl-mat4')
const ndarray  = require('ndarray')
const fillscr  = require('a-big-triangle')

const canvas   = document.body.appendChild(document.createElement('canvas'))
var createCamera = require('perspective-camera')

var camera    = require('lookat-camera')()
var fit      = require('canvas-fit')


window.addEventListener('resize', fit(canvas), false)

let res,
    time
let gl,
    cube_wireframe,
    pixelIndexes,
    triangles
let shader_wireframe,
    shader_particles,
    shader_update,
    fbos
var current = 0,
    f_imp = 0.01,
    s_imp = 1,
    a_imp = 1,
    c_imp = 1,
    r_inner = 0.1,
    r_outer = 0.2
const zoffset = 4,
      numParticles = 75,
      cube_max = 1,
      cube_min = -1,
      max_speed = 0.005

window.onkeydown = function (e) {
  switch(e.keyCode) {
    case 38:
      camera.position[1] += 0.1;
      break;
    case 40:
      camera.position[1] -= 0.1;
      break;
    case 39:
      camera.position[0] -= 0.1;
      break;
    case 37:
      camera.position[0] += 0.1;
      break;
    case 87:
      camera.position[2] += 0.1;
      break;
    case 83:
      camera.position[2] -= 0.1;
      break;
    case 90:
      gl_init();
      break;
    case 81:
      f_imp += 0.01;
      document.getElementById("f_imp").innerHTML = "Q/A:     +/-      total importance: " + f_imp
      break;
    case 65:
      f_imp -= 0.01;
      if(f_imp < 0.) f_imp = 0.
      document.getElementById("f_imp").innerHTML = "Q/A:     +/-      total importance: " + f_imp
      break;
    case 69:
      s_imp += 1.
      document.getElementById("s_imp").innerHTML = "E/D:     +/- separation importance: " + s_imp
      break;
    case 68:
      s_imp -= 1.
      if(s_imp < 0.) s_imp = 0.
      document.getElementById("s_imp").innerHTML = "E/D:     +/- separation importance: " + s_imp
      break;
    case 82:
      a_imp += 1.
      document.getElementById("a_imp").innerHTML = "R/F:     +/-  alignment importance: " + a_imp
      break;
    case 70:
      a_imp -= 1.
      if(a_imp < 0.) a_imp = 0.
      document.getElementById("a_imp").innerHTML = "R/F:     +/-  alignment importance: " + a_imp
      break;
    case 84:
      c_imp += 1.
      document.getElementById("c_imp").innerHTML = "T/G:     +/-   cohesion importance: " + c_imp
      break;
    case 71:
      c_imp -= 1.
      if(c_imp < 0.) c_imp = 0.
      document.getElementById("c_imp").innerHTML = "T/G:     +/-   cohesion importance: " + c_imp
      break;
    case 89:
      r_inner += 0.05
      document.getElementById("r_inner").innerHTML = "Y/H:     +/-     inner ring radius: " + r_inner
      break;
    case 72:
      r_inner -= 0.05
      if(r_inner < 0.) r_inner = 0.
      document.getElementById("r_inner").innerHTML = "Y/H:     +/-     inner ring radius: " + r_inner
      break;
    case 85:
      r_outer += 0.05
      document.getElementById("r_outer").innerHTML = "U/J:     +/-     outer ring radius: " + r_outer
      break;
    case 74:
      r_outer -= 0.05
      if(r_outer < 0.) r_outer = 0.
      document.getElementById("r_outer").innerHTML = "U/J:     +/-     outer ring radius: " + r_outer
      break;
  }
}

function genSomePointsAndVels(numParticles) {
  var result = new Float32Array(numParticles * numParticles * 4 * 2)
  for(var i = 0; i < numParticles * numParticles * 2; i++) {
    //location
    result[i * 4 + 0] = Math.random()
    result[i * 4 + 1] = Math.random()
    result[i * 4 + 2] = Math.random()
    result[i * 4 + 3] = max_speed//1.
  }

  return ndarray(result, [numParticles, numParticles * 2, 4])
}

function getPixelFloatIndexes(length) {
  var result = new Float32Array(length * length * 2)
  for(var i = 0; i < length; i++) {
    for(var j = 0; j < length; j++) {
      for(var k = 0; k < 2; k++) {
          result[i * length + j * 2 + k] = k ? (i / length) : (j / (length * 2));
      }
    }
  }
  return result
}

function cube() {
  return Buffer(gl, new Float32Array([
    0., 0., 0.,       0., 0., 1.,
    0., 0., 1.,       1., 0., 1.,
    1., 0., 1.,       1., 0., 0.,
    1., 0., 0.,       0., 0., 0.,

    0., 1., 0.,       0., 1., 1.,
    0., 1., 1.,       1., 1., 1.,
    1., 1., 1.,       1., 1., 0.,
    1., 1., 0.,       0., 1., 0.,

    0., 0., 0.,       0., 1., 0.,
    1., 0., 0.,       1., 1., 0.,
    1., 0., 1.,       1., 1., 1.,
    0., 0., 1.,       0., 1., 1.]))
}

function gl_init() {
  //init gl
  gl = shell.gl
  //init shaders
  shader_wireframe = glShader(gl, glslify('./shader_wireframe.vert'), glslify('./draw.frag'))
  shader_particles = glShader(gl, glslify('./shader_particles.vert'), glslify('./draw.frag'))
  shader_update    = glShader(gl, glslify('./simple.vert'),           glslify('./update.frag'))

  //init FBOS
  fbos = [ FBO(gl, [numParticles, numParticles * 2], {float: true}), FBO(gl, [numParticles, numParticles * 2], {float: true}) ]

  fbos[current].color[0].setPixels(genSomePointsAndVels(numParticles))

  cube_wireframe = cube();
  pixelIndexes = Buffer(gl, getPixelFloatIndexes(numParticles))
  triangles = Buffer(gl, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]))

  camera.position = [0.0, 0.0, 0.0]
  camera.target = [0.0, 0.0, zoffset]
  camera.up = [0.0, 1.0, 0.0]
}

shell.on("gl-init", gl_init)


shell.on("tick", function() {
  gl.viewport(0, 0, numParticles, numParticles * 2)

  var prevFBO = fbos[current]
  var currFBO = fbos[current ^= 1]

  //Switch to state fbo
  currFBO.bind()

  shader_update.bind()
  shader_update.uniforms.particle_info = prevFBO.color[0].bind()
  shader_update.uniforms.f_imp = f_imp
  shader_update.uniforms.s_imp = s_imp
  shader_update.uniforms.a_imp = a_imp
  shader_update.uniforms.c_imp = c_imp
  shader_update.uniforms.ring_inner = r_inner
  shader_update.uniforms.ring_outer = r_outer


  triangles.bind()
  shader_update.attributes.position.pointer()
  gl.drawArrays(gl.TRIANGLES, 0, 6)
})

var projection = mat4.create()
var model      = mat4.create()
var view       = mat4.create()

shell.on("gl-render", function() {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  // // gl.enable(gl.DEPTH_TEST)
  // // gl.enable(gl.CULL_FACE)
  //
  camera.view(view)
  //
  var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
  var fieldOfView = Math.PI / 4
  var near = 0.01
  var far  = 100
  //
  mat4.perspective(projection, fieldOfView, aspectRatio, near, far)
  //
  //
  //
  // //draw square wireframe
  shader_wireframe.bind()
  shader_wireframe.uniforms.uProjection = projection
  shader_wireframe.uniforms.uView = view
  shader_wireframe.uniforms.uModel = model
  //
  shader_wireframe.uniforms.resolution = [cube_min, cube_max, zoffset]
  cube_wireframe.bind()
  // gl.bindBuffer(gl.ARRAY_BUFFER, cube_wireframe)
  shader_wireframe.attributes.aPos.pointer()
  gl.drawArrays(gl.LINES, 0, 3 * 8)
  //
  //draw particles
  shader_particles.bind()
  shader_particles.uniforms.uProjection = projection
  shader_particles.uniforms.uView = view
  shader_particles.uniforms.uModel = model

  shader_particles.uniforms.resolution = [cube_min, cube_max, zoffset]
  shader_particles.uniforms.particle_info = fbos[current].color[0].bind()

  pixelIndexes.bind()
  // gl.bindBuffer(gl.ARRAY_BUFFER, pixelIndexes)
  shader_particles.attributes.aPos.pointer()
  gl.drawArrays(gl.POINTS, 0, numParticles * numParticles)
})
