// asg4.js - Assignment 4: Lighting with Phong shading, point light, spotlight, spheres, and OBJ loading

const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;

void main() {
  vec4 worldPosition = u_ModelMatrix * a_Position;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPosition;
  v_UV = a_UV;
  v_WorldPos = worldPosition.xyz;
  v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
}
`;

const FSHADER_SOURCE = `
precision mediump float;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;

uniform vec4 u_FragColor;
uniform int u_whichTexture;
uniform float u_texColorWeight;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;

uniform vec3 u_CameraPos;
uniform vec3 u_LightPos;
uniform vec3 u_LightColor;
uniform vec3 u_SpotLightPos;
uniform vec3 u_SpotLightDir;
uniform vec3 u_SpotLightColor;
uniform float u_SpotCutoff;
uniform float u_SpotOuterCutoff;

uniform int u_LightOn;
uniform int u_NormalOn;
uniform int u_PointLightOn;
uniform int u_SpotLightOn;
uniform int u_ForceColor;

void main() {
  vec4 textureColor;
  if (u_whichTexture == 0) {
    textureColor = texture2D(u_Sampler0, v_UV);
  } else if (u_whichTexture == 1) {
    textureColor = texture2D(u_Sampler1, v_UV);
  } else if (u_whichTexture == 2) {
    textureColor = texture2D(u_Sampler2, v_UV);
  } else if (u_whichTexture == 3) {
    textureColor = texture2D(u_Sampler3, v_UV);
  } else if (u_whichTexture == 4) {
    textureColor = texture2D(u_Sampler4, v_UV);
  } else {
    textureColor = u_FragColor;
  }

  vec4 baseColor = (1.0 - u_texColorWeight) * u_FragColor + u_texColorWeight * textureColor;

  if (u_ForceColor == 1) {
    gl_FragColor = baseColor;
    return;
  }

  if (u_NormalOn == 1) {
    gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);
    return;
  }

  if (u_LightOn == 0) {
    gl_FragColor = baseColor;
    return;
  }

  vec3 normal = normalize(v_Normal);
  vec3 viewDir = normalize(u_CameraPos - v_WorldPos);
  vec3 ambient = 0.18 * baseColor.rgb;
  vec3 totalLight = ambient;

  if (u_PointLightOn == 1) {
    vec3 lightDir = normalize(u_LightPos - v_WorldPos);
    float nDotL = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = nDotL * baseColor.rgb * u_LightColor;

    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = 0.65 * spec * u_LightColor;

    float distanceToLight = length(u_LightPos - v_WorldPos);
    float attenuation = 1.0 / (1.0 + 0.04 * distanceToLight + 0.008 * distanceToLight * distanceToLight);
    totalLight += attenuation * (diffuse + specular);
  }

  if (u_SpotLightOn == 1) {
    vec3 spotToFrag = normalize(v_WorldPos - u_SpotLightPos);
    float theta = dot(spotToFrag, normalize(u_SpotLightDir));
    float epsilon = u_SpotCutoff - u_SpotOuterCutoff;
    float intensity = clamp((theta - u_SpotOuterCutoff) / epsilon, 0.0, 1.0);

    vec3 spotLightDir = normalize(u_SpotLightPos - v_WorldPos);
    float nDotSpot = max(dot(normal, spotLightDir), 0.0);
    vec3 spotDiffuse = nDotSpot * baseColor.rgb * u_SpotLightColor;

    vec3 spotReflect = reflect(-spotLightDir, normal);
    float spotSpecAmount = pow(max(dot(viewDir, spotReflect), 0.0), 48.0);
    vec3 spotSpecular = 0.85 * spotSpecAmount * u_SpotLightColor;

    float spotDistance = length(u_SpotLightPos - v_WorldPos);
    float spotAttenuation = 1.0 / (1.0 + 0.035 * spotDistance + 0.01 * spotDistance * spotDistance);
    totalLight += intensity * spotAttenuation * (spotDiffuse + spotSpecular);
  }

  gl_FragColor = vec4(min(totalLight, vec3(1.0)), baseColor.a);
}
`;

let canvas;
let gl;
let camera;

let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_ModelMatrix;
let u_NormalMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_whichTexture;
let u_texColorWeight;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
let u_Sampler4;
let u_CameraPos;
let u_LightPos;
let u_LightColor;
let u_SpotLightPos;
let u_SpotLightDir;
let u_SpotLightColor;
let u_SpotCutoff;
let u_SpotOuterCutoff;
let u_LightOn;
let u_NormalOn;
let u_PointLightOn;
let u_SpotLightOn;
let u_ForceColor;

let g_cubeVertexBuffer = null;
let g_cubeUVBuffer = null;
let g_cubeNormalBuffer = null;
let g_sphereVertexBuffer = null;
let g_sphereUVBuffer = null;
let g_sphereNormalBuffer = null;
let g_sphereVertexCount = 0;

let g_startTime = performance.now() / 1000.0;
let g_seconds = 0;
let g_lastFrameTime = performance.now();
let g_lastTickTime = performance.now();
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_keys = {};

let g_lightOn = true;
let g_normalOn = false;
let g_pointLightOn = true;
let g_spotLightOn = true;
let g_animatePointLight = true;

let g_lightPos = [3.0, 4.0, 2.0];
let g_lightColor = [1.0, 0.95, 0.8];
let g_spotLightPos = [-4.0, 5.0, 4.0];
let g_spotTarget = [0.0, 0.8, 0.0];
let g_spotLightColor = [0.45, 0.7, 1.0];

let g_shibaModel = null;

const TEXTURE_GRASS = 0;
const TEXTURE_BRICK = 1;
const TEXTURE_DIRT = 2;
const TEXTURE_WOOD = 3;
const TEXTURE_LEAVES = 4;

const COLORS = {
  sky: [0.42, 0.66, 0.90, 1.0],
  white: [0.94, 0.91, 0.82, 1.0],
  red: [0.90, 0.16, 0.10, 1.0],
  blue: [0.16, 0.45, 0.95, 1.0],
  green: [0.25, 0.70, 0.28, 1.0],
  gold: [1.0, 0.86, 0.20, 1.0],
  purple: [0.55, 0.20, 0.95, 1.0],
  dark: [0.08, 0.08, 0.09, 1.0],
  shiba: [1.0, 0.46, 0.12, 1.0]
};

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initTextures();
  addActionsForHtmlUI();
  initMouseAndKeyboardControls();

  camera = new Camera();
  g_shibaModel = new Model('models/shibainu.obj', window.SHIBA_OBJ_TEXT);

  gl.clearColor(COLORS.sky[0], COLORS.sky[1], COLORS.sky[2], COLORS.sky[3]);
  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');
  u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_SpotLightPos = gl.getUniformLocation(gl.program, 'u_SpotLightPos');
  u_SpotLightDir = gl.getUniformLocation(gl.program, 'u_SpotLightDir');
  u_SpotLightColor = gl.getUniformLocation(gl.program, 'u_SpotLightColor');
  u_SpotCutoff = gl.getUniformLocation(gl.program, 'u_SpotCutoff');
  u_SpotOuterCutoff = gl.getUniformLocation(gl.program, 'u_SpotOuterCutoff');
  u_LightOn = gl.getUniformLocation(gl.program, 'u_LightOn');
  u_NormalOn = gl.getUniformLocation(gl.program, 'u_NormalOn');
  u_PointLightOn = gl.getUniformLocation(gl.program, 'u_PointLightOn');
  u_SpotLightOn = gl.getUniformLocation(gl.program, 'u_SpotLightOn');
  u_ForceColor = gl.getUniformLocation(gl.program, 'u_ForceColor');

  const identity = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, identity.elements);
}

function addActionsForHtmlUI() {
  document.getElementById('lightingButton').onclick = function () {
    g_lightOn = !g_lightOn;
    this.textContent = 'Lighting: ' + (g_lightOn ? 'ON' : 'OFF');
  };

  document.getElementById('normalButton').onclick = function () {
    g_normalOn = !g_normalOn;
    this.textContent = 'Normal Visualization: ' + (g_normalOn ? 'ON' : 'OFF');
  };

  document.getElementById('pointButton').onclick = function () {
    g_pointLightOn = !g_pointLightOn;
    this.textContent = 'Point Light: ' + (g_pointLightOn ? 'ON' : 'OFF');
  };

  document.getElementById('spotButton').onclick = function () {
    g_spotLightOn = !g_spotLightOn;
    this.textContent = 'Spotlight: ' + (g_spotLightOn ? 'ON' : 'OFF');
  };

  document.getElementById('animateButton').onclick = function () {
    g_animatePointLight = !g_animatePointLight;
    this.textContent = 'Animate Point Light: ' + (g_animatePointLight ? 'ON' : 'OFF');
  };

  document.getElementById('resetButton').onclick = function () {
    camera = new Camera();
  };

  function sliderValue(id) {
    return parseFloat(document.getElementById(id).value);
  }

  function disableAnimationForManualPointLight() {
    g_animatePointLight = false;
    document.getElementById('animateButton').textContent = 'Animate Point Light: OFF';
  }

  ['lightX', 'lightY', 'lightZ'].forEach(function (id) {
    document.getElementById(id).oninput = function () {
      disableAnimationForManualPointLight();
      g_lightPos = [sliderValue('lightX'), sliderValue('lightY'), sliderValue('lightZ')];
    };
  });

  ['lightR', 'lightG', 'lightB'].forEach(function (id) {
    document.getElementById(id).oninput = function () {
      g_lightColor = [
        sliderValue('lightR') / 100.0,
        sliderValue('lightG') / 100.0,
        sliderValue('lightB') / 100.0
      ];
    };
  });

  ['spotX', 'spotY', 'spotZ'].forEach(function (id) {
    document.getElementById(id).oninput = function () {
      g_spotLightPos = [sliderValue('spotX'), sliderValue('spotY'), sliderValue('spotZ')];
    };
  });

  ['spotTargetX', 'spotTargetY', 'spotTargetZ'].forEach(function (id) {
    document.getElementById(id).oninput = function () {
      g_spotTarget = [sliderValue('spotTargetX'), sliderValue('spotTargetY'), sliderValue('spotTargetZ')];
    };
  });
}

function initMouseAndKeyboardControls() {
  document.addEventListener('keydown', function (event) {
    g_keys[event.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  });

  document.addEventListener('keyup', function (event) {
    g_keys[event.key.toLowerCase()] = false;
  });

  canvas.onmousedown = function (event) {
    g_mouseDown = true;
    g_lastMouseX = event.clientX;
  };

  canvas.onmouseup = function () {
    g_mouseDown = false;
  };

  canvas.onmouseleave = function () {
    g_mouseDown = false;
  };

  canvas.onmousemove = function (event) {
    if (!g_mouseDown) return;
    let dx = event.clientX - g_lastMouseX;
    g_lastMouseX = event.clientX;
    camera.panByMouse(dx);
  };
}

function tick() {
  const now = performance.now();
  const dt = Math.min((now - g_lastTickTime) / 1000.0, 0.05);
  g_lastTickTime = now;
  g_seconds = performance.now() / 1000.0 - g_startTime;

  handleCameraMovement(dt);

  if (g_animatePointLight) {
    g_lightPos[0] = Math.cos(g_seconds * 0.85) * 4.5;
    g_lightPos[1] = 3.8 + Math.sin(g_seconds * 1.3) * 0.7;
    g_lightPos[2] = Math.sin(g_seconds * 0.85) * 4.5;
    updatePointLightSliderDisplay();
  }

  renderScene();
  requestAnimationFrame(tick);
}

function updatePointLightSliderDisplay() {
  document.getElementById('lightX').value = g_lightPos[0].toFixed(1);
  document.getElementById('lightY').value = g_lightPos[1].toFixed(1);
  document.getElementById('lightZ').value = g_lightPos[2].toFixed(1);
}

function handleCameraMovement(dt) {
  const moveAmount = camera.speed * dt;
  const turnAmount = camera.turnSpeed * dt;

  if (g_keys['w'] || g_keys['arrowup']) camera.moveForward(moveAmount);
  if (g_keys['s'] || g_keys['arrowdown']) camera.moveBackwards(moveAmount);
  if (g_keys['a']) camera.moveLeft(moveAmount);
  if (g_keys['d']) camera.moveRight(moveAmount);
  if (g_keys['q'] || g_keys['arrowleft']) camera.panLeft(turnAmount);
  if (g_keys['e'] || g_keys['arrowright']) camera.panRight(turnAmount);
}

function renderScene() {
  const frameStart = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  sendLightingUniforms();

  drawWorld();
  drawSpheres();
  drawOBJModel();
  drawLightMarkers();
  updateOBJStatus();

  const duration = performance.now() - frameStart;
  const fps = 1000.0 / Math.max(performance.now() - g_lastFrameTime, 0.001);
  g_lastFrameTime = performance.now();
  document.getElementById('performance').innerHTML = 'ms: ' + Math.floor(duration) + ' fps: ' + Math.floor(fps);
}

function sendLightingUniforms() {
  gl.uniform3f(u_CameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);

  gl.uniform3f(u_SpotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  const spotDir = normalize3([
    g_spotTarget[0] - g_spotLightPos[0],
    g_spotTarget[1] - g_spotLightPos[1],
    g_spotTarget[2] - g_spotLightPos[2]
  ]);
  gl.uniform3f(u_SpotLightDir, spotDir[0], spotDir[1], spotDir[2]);
  gl.uniform3f(u_SpotLightColor, g_spotLightColor[0], g_spotLightColor[1], g_spotLightColor[2]);
  gl.uniform1f(u_SpotCutoff, Math.cos(degreesToRadians(13.0)));
  gl.uniform1f(u_SpotOuterCutoff, Math.cos(degreesToRadians(23.0)));

  gl.uniform1i(u_LightOn, g_lightOn ? 1 : 0);
  gl.uniform1i(u_NormalOn, g_normalOn ? 1 : 0);
  gl.uniform1i(u_PointLightOn, g_pointLightOn ? 1 : 0);
  gl.uniform1i(u_SpotLightOn, g_spotLightOn ? 1 : 0);
}

function drawWorld() {
  // Ground
  let ground = new Cube();
  ground.textureNum = TEXTURE_GRASS;
  ground.color = [0.55, 0.82, 0.47, 1.0];
  ground.matrix.setTranslate(0, -0.06, 0);
  ground.matrix.scale(18, 0.12, 18);
  ground.render();

  // Back and side walls
  drawCubeObject([0, 1.0, -8.5], [18, 2.0, 0.25], COLORS.white, TEXTURE_BRICK);
  drawCubeObject([-8.5, 1.0, 0], [0.25, 2.0, 18], COLORS.white, TEXTURE_BRICK);
  drawCubeObject([8.5, 1.0, 0], [0.25, 2.0, 18], COLORS.white, TEXTURE_BRICK);

  // A few blocks from the old virtual-world style scene
  drawCubeObject([-5.3, 0.5, -3.2], [1.2, 1.0, 1.2], COLORS.white, TEXTURE_WOOD);
  drawCubeObject([-4.1, 1.1, -3.2], [1.2, 2.2, 1.2], COLORS.white, TEXTURE_WOOD);
  drawCubeObject([4.4, 0.45, -4.2], [1.2, 0.9, 1.2], COLORS.white, TEXTURE_DIRT);
  drawCubeObject([5.6, 1.05, -4.2], [1.2, 2.1, 1.2], COLORS.white, TEXTURE_DIRT);
  drawCubeObject([4.9, 0.7, 3.8], [1.7, 1.4, 1.7], COLORS.white, TEXTURE_LEAVES);
  drawCubeObject([-4.8, 0.7, 4.5], [1.7, 1.4, 1.7], COLORS.white, TEXTURE_LEAVES);

  // Clean raised platform under the OBJ model.
  // This is a single solid cube so the dog area does not get overlapping/z-fighting pieces.
  drawCubeObject([0, 0.10, 0.85], [3.4, 0.20, 2.6], [0.70, 0.66, 0.56, 1.0], -1);
}

function drawSpheres() {
  let sphere1 = new Sphere();
  sphere1.color = COLORS.red;
  sphere1.matrix.setTranslate(-3.0, 1.0, 1.4);
  sphere1.matrix.scale(0.9, 0.9, 0.9);
  sphere1.render();

  let sphere2 = new Sphere();
  sphere2.color = COLORS.blue;
  sphere2.matrix.setTranslate(3.1, 1.0, 1.1);
  sphere2.matrix.scale(0.95, 0.95, 0.95);
  sphere2.render();

  let sphere3 = new Sphere();
  sphere3.color = COLORS.green;
  sphere3.matrix.setTranslate(0.0, 1.15, -3.3);
  sphere3.matrix.scale(1.05, 1.05, 1.05);
  sphere3.render();
}

function drawOBJModel() {
  if (!g_shibaModel) return;

  // Put the OBJ dog on the center platform. The model data is embedded
  // in shibaObjData.js, so it appears even if fetch() fails.
  g_shibaModel.color = COLORS.shiba;
  g_shibaModel.forceColor = false;
  // Bottom of the normalized model sits just above the platform top.
  g_shibaModel.matrix.setTranslate(0, 1.44, 0.85);
  // No 180-degree turn here: this faces the dog toward the starting camera.
  g_shibaModel.matrix.rotate(0, 0, 1, 0);
  g_shibaModel.matrix.scale(1.35, 1.35, 1.35);
  g_shibaModel.render();

  // No extra locator cube here; the clean platform from drawWorld() is enough.
}

function updateOBJStatus() {
  const status = document.getElementById('objStatus');
  if (!status || !g_shibaModel) return;
  if (g_shibaModel.loaded) {
    status.textContent = 'OBJ model: loaded shibainu.obj (' + g_shibaModel.numVertices + ' vertices)';
  } else if (g_shibaModel.error) {
    status.textContent = 'OBJ model: ERROR loading shibainu.obj. Check the Console.';
  } else {
    status.textContent = 'OBJ model: loading shibainu.obj...';
  }
}

function drawLightMarkers() {
  let pointMarker = new Cube();
  pointMarker.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0];
  pointMarker.forceColor = true;
  pointMarker.matrix.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  pointMarker.matrix.scale(0.28, 0.28, 0.28);
  pointMarker.render();

  let spotMarker = new Cube();
  spotMarker.color = COLORS.purple;
  spotMarker.forceColor = true;
  spotMarker.matrix.setTranslate(g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  spotMarker.matrix.scale(0.32, 0.32, 0.32);
  spotMarker.render();
}

function drawCubeObject(position, scale, color, textureNum) {
  let cube = new Cube();
  cube.color = color;
  cube.textureNum = textureNum;
  cube.matrix.setTranslate(position[0], position[1], position[2]);
  cube.matrix.scale(scale[0], scale[1], scale[2]);
  cube.render();
}

function setNormalMatrix(modelMatrix) {
  const normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
}

function drawCube() {
  initCubeBuffersIfNeeded();

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeVertexBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeUVBuffer);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeNormalBuffer);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function initCubeBuffersIfNeeded() {
  if (g_cubeVertexBuffer) return;

  const vertices = new Float32Array([
    // Front face
    -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5, 0.5,
    -0.5,-0.5, 0.5,   0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
    // Back face
     0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,
     0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5,
    // Top face
    -0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5,-0.5,
    -0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,
    // Bottom face
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,
    -0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5,
    // Right face
     0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5,
     0.5,-0.5, 0.5,   0.5, 0.5,-0.5,   0.5, 0.5, 0.5,
    // Left face
    -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5,
    -0.5,-0.5,-0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5
  ]);

  const uvs = new Float32Array([
    0,0, 1,0, 1,1,   0,0, 1,1, 0,1,
    0,0, 1,0, 1,1,   0,0, 1,1, 0,1,
    0,0, 1,0, 1,1,   0,0, 1,1, 0,1,
    0,0, 1,0, 1,1,   0,0, 1,1, 0,1,
    0,0, 1,0, 1,1,   0,0, 1,1, 0,1,
    0,0, 1,0, 1,1,   0,0, 1,1, 0,1
  ]);

  const normals = new Float32Array([
     0, 0, 1,  0, 0, 1,  0, 0, 1,   0, 0, 1,  0, 0, 1,  0, 0, 1,
     0, 0,-1,  0, 0,-1,  0, 0,-1,   0, 0,-1,  0, 0,-1,  0, 0,-1,
     0, 1, 0,  0, 1, 0,  0, 1, 0,   0, 1, 0,  0, 1, 0,  0, 1, 0,
     0,-1, 0,  0,-1, 0,  0,-1, 0,   0,-1, 0,  0,-1, 0,  0,-1, 0,
     1, 0, 0,  1, 0, 0,  1, 0, 0,   1, 0, 0,  1, 0, 0,  1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0,  -1, 0, 0, -1, 0, 0, -1, 0, 0
  ]);

  g_cubeVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  g_cubeUVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

  g_cubeNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
}

function drawSphere() {
  initSphereBuffersIfNeeded();

  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereVertexBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereUVBuffer);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereNormalBuffer);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertexCount);
}

function initSphereBuffersIfNeeded() {
  if (g_sphereVertexBuffer) return;

  const latBands = 24;
  const lonBands = 24;
  const vertices = [];
  const normals = [];
  const uvs = [];

  function point(lat, lon) {
    const theta = lat * Math.PI / latBands;
    const phi = lon * 2 * Math.PI / lonBands;
    const sinTheta = Math.sin(theta);
    const x = Math.cos(phi) * sinTheta;
    const y = Math.cos(theta);
    const z = Math.sin(phi) * sinTheta;
    return { position: [x, y, z], uv: [lon / lonBands, 1 - lat / latBands] };
  }

  function addVertex(p) {
    vertices.push(p.position[0], p.position[1], p.position[2]);
    normals.push(p.position[0], p.position[1], p.position[2]);
    uvs.push(p.uv[0], p.uv[1]);
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const p1 = point(lat, lon);
      const p2 = point(lat + 1, lon);
      const p3 = point(lat + 1, lon + 1);
      const p4 = point(lat, lon + 1);

      addVertex(p1); addVertex(p2); addVertex(p3);
      addVertex(p1); addVertex(p3); addVertex(p4);
    }
  }

  g_sphereVertexCount = vertices.length / 3;

  g_sphereVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  g_sphereUVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

  g_sphereNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
}

function initTextures() {
  initSingleTexture(TEXTURE_GRASS, 'textures/grass.png', u_Sampler0);
  initSingleTexture(TEXTURE_BRICK, 'textures/brick.png', u_Sampler1);
  initSingleTexture(TEXTURE_DIRT, 'textures/dirt.png', u_Sampler2);
  initSingleTexture(TEXTURE_WOOD, 'textures/wood.png', u_Sampler3);
  initSingleTexture(TEXTURE_LEAVES, 'textures/leaves.png', u_Sampler4);
}

function initSingleTexture(textureUnit, path, samplerUniform) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Temporary 1x1 pixel so objects still render before the image finishes loading.
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([255, 255, 255, 255])
  );

  const image = new Image();
  image.onload = function () {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(samplerUniform, textureUnit);
  };
  image.src = path;
  gl.uniform1i(samplerUniform, textureUnit);
}

function normalize3(v) {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (length < 0.00001) return [0, -1, 0];
  return [v[0] / length, v[1] / length, v[2] / length];
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180.0;
}
