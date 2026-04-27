// asg2.js - Blocky Tiger

const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotationMatrix;

void main() {
  gl_Position = u_GlobalRotationMatrix * u_ModelMatrix * a_Position;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;

void main() {
  gl_FragColor = u_FragColor;
}
`;

let canvas;
let gl;

let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotationMatrix;

// Global rotation / zoom
let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_zoom = 0.80;

// Joint sliders
let g_upperLegAngle = 0;
let g_lowerLegAngle = 0;
let g_pawAngle = 0;
let g_tailAngle = 0;
let g_headAngle = 0;

// Walking animation leg angles
let g_frontLeftUpper = 0;
let g_frontLeftLower = 0;
let g_frontLeftPaw = 0;

let g_backLeftUpper = 0;
let g_backLeftLower = 0;
let g_backLeftPaw = 0;

let g_frontRightUpper = 0;
let g_frontRightLower = 0;
let g_frontRightPaw = 0;

let g_backRightUpper = 0;
let g_backRightLower = 0;
let g_backRightPaw = 0;

// Animation
let g_animationOn = false;
let g_startTime = performance.now() / 1000.0;
let g_seconds = 0;

// Poke animation
let g_pokeAnimation = false;
let g_pokeStartTime = 0;

// Mouse rotation
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

// Performance
let g_lastFrameTime = performance.now();

// Colors
const TIGER_ORANGE = [1.0, 0.45, 0.08, 1.0];
const TIGER_DARK_ORANGE = [0.85, 0.30, 0.04, 1.0];
const BLACK = [0.02, 0.02, 0.02, 1.0];
const WHITE = [0.95, 0.90, 0.82, 1.0];
const PINK = [1.0, 0.55, 0.55, 1.0];

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  gl.clearColor(0.04, 0.04, 0.06, 1.0);

  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log("Failed to get WebGL context");
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get a_Position");
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.log("Failed to get u_FragColor");
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrix) {
    console.log("Failed to get u_ModelMatrix");
    return;
  }

  u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotationMatrix");
  if (!u_GlobalRotationMatrix) {
    console.log("Failed to get u_GlobalRotationMatrix");
    return;
  }

  let identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, identityM.elements);
}

function addActionsForHtmlUI() {
  document.getElementById("animationOnButton").onclick = function() {
    g_animationOn = true;
  };

  document.getElementById("animationOffButton").onclick = function() {
    g_animationOn = false;
  };

  document.getElementById("globalXSlide").addEventListener("input", function() {
    g_globalAngleX = Number(this.value);
    renderScene();
  });

  document.getElementById("globalYSlide").addEventListener("input", function() {
    g_globalAngleY = Number(this.value);
    renderScene();
  });

  document.getElementById("zoomSlide").addEventListener("input", function() {
    g_zoom = Number(this.value) / 100;
    renderScene();
  });

  document.getElementById("upperLegSlide").addEventListener("input", function() {
    g_upperLegAngle = Number(this.value);
    renderScene();
  });

  document.getElementById("lowerLegSlide").addEventListener("input", function() {
    g_lowerLegAngle = Number(this.value);
    renderScene();
  });

  document.getElementById("pawSlide").addEventListener("input", function() {
    g_pawAngle = Number(this.value);
    renderScene();
  });

  document.getElementById("tailSlide").addEventListener("input", function() {
    g_tailAngle = Number(this.value);
    renderScene();
  });

  document.getElementById("headSlide").addEventListener("input", function() {
    g_headAngle = Number(this.value);
    renderScene();
  });

  canvas.onmousedown = function(ev) {
    if (ev.shiftKey) {
      g_pokeAnimation = true;
      g_pokeStartTime = g_seconds;
      return;
    }

    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  canvas.onmouseup = function() {
    g_mouseDown = false;
  };

  canvas.onmouseleave = function() {
    g_mouseDown = false;
  };

  canvas.onmousemove = function(ev) {
    if (!g_mouseDown) return;

    let dx = ev.clientX - g_lastMouseX;
    let dy = ev.clientY - g_lastMouseY;

    g_globalAngleY += dx * 0.5;
    g_globalAngleX += dy * 0.5;

    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;

    renderScene();
  };
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;

  updateAnimationAngles();
  renderScene();

  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_animationOn) {
    let walk = Math.sin(g_seconds * 3.0);
    let leftStep = walk;
    let rightStep = -walk;

    // Left side moves together
    g_frontLeftUpper = 26 * leftStep;
    g_backLeftUpper = 26 * leftStep;

    g_frontLeftLower = -18 * leftStep;
    g_backLeftLower = -18 * leftStep;

    g_frontLeftPaw = 12 * leftStep;
    g_backLeftPaw = 12 * leftStep;

    // Right side moves together, opposite phase
    g_frontRightUpper = 26 * rightStep;
    g_backRightUpper = 26 * rightStep;

    g_frontRightLower = -18 * rightStep;
    g_backRightLower = -18 * rightStep;

    g_frontRightPaw = 12 * rightStep;
    g_backRightPaw = 12 * rightStep;

    // Tail follows stepping side left/right
    g_tailAngle = 22 * leftStep;

    // Small head motion
    g_headAngle = 6 * Math.sin(g_seconds * 1.5);
  } else {
    // When animation is off, keep slider control on one full 3-level leg chain
    g_frontLeftUpper = 0;
    g_frontLeftLower = 0;
    g_frontLeftPaw = 0;

    g_backLeftUpper = 0;
    g_backLeftLower = 0;
    g_backLeftPaw = 0;

    g_frontRightUpper = 0;
    g_frontRightLower = 0;
    g_frontRightPaw = 0;

    g_backRightUpper = g_upperLegAngle;
    g_backRightLower = g_lowerLegAngle;
    g_backRightPaw = g_pawAngle;
  }

  if (g_pokeAnimation) {
    let pokeTime = g_seconds - g_pokeStartTime;

    if (pokeTime < 1.5) {
      g_headAngle = 25 * Math.sin(pokeTime * 15);
      g_tailAngle = 45 * Math.sin(pokeTime * 18);
    } else {
      g_pokeAnimation = false;
    }
  }
}

function renderScene() {
  let startTime = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let globalRotMat = new Matrix4();

  // Zoom is applied to the whole animal
  globalRotMat.scale(g_zoom, g_zoom, g_zoom);

  globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
  globalRotMat.rotate(g_globalAngleY, 0, 1, 0);

  gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotMat.elements);

  drawTiger();

  let duration = performance.now() - startTime;
  let now = performance.now();
  let fps = 1000.0 / (now - g_lastFrameTime);
  g_lastFrameTime = now;

  document.getElementById("performance").innerHTML =
  "ms: " + duration.toFixed(2) + " fps: " + Math.floor(fps);
}

function drawTiger() {
  // Body
  drawCubePart(
    new Matrix4()
      .translate(0.0, 0.0, 0.0)
      .scale(1.25, 0.55, 0.45),
    TIGER_ORANGE
  );

  // White belly / underside
  drawCubePart(
    new Matrix4()
      .translate(0.05, -0.24, 0.0)
      .scale(0.80, 0.08, 0.26),
    WHITE
  );

  // Head base matrix
  let headM = new Matrix4();
  headM.translate(0.82, 0.16, 0.0);
  headM.rotate(g_headAngle, 0, 1, 0);
  let headBase = new Matrix4(headM);

  // Head
  drawCubePart(
    new Matrix4(headBase)
      .scale(0.42, 0.40, 0.40),
    TIGER_ORANGE
  );

  // Snout
  drawCubePart(
    new Matrix4(headBase)
      .translate(0.27, -0.06, 0.0)
      .scale(0.22, 0.18, 0.22),
    WHITE
  );

  // Nose
  drawCubePart(
    new Matrix4(headBase)
      .translate(0.40, -0.02, 0.0)
      .scale(0.07, 0.07, 0.11),
    PINK
  );

  // Eyes
  drawCubePart(
    new Matrix4(headBase)
      .translate(0.22, 0.10, -0.16)
      .scale(0.05, 0.05, 0.04),
    BLACK
  );

  drawCubePart(
    new Matrix4(headBase)
      .translate(0.22, 0.10, 0.16)
      .scale(0.05, 0.05, 0.04),
    BLACK
  );

  // Ears
  drawCubePart(
    new Matrix4(headBase)
      .translate(-0.08, 0.30, -0.17)
      .rotate(25, 1, 0, 0)
      .scale(0.14, 0.20, 0.08),
    TIGER_DARK_ORANGE
  );

  drawCubePart(
    new Matrix4(headBase)
      .translate(-0.08, 0.30, 0.17)
      .rotate(-25, 1, 0, 0)
      .scale(0.14, 0.20, 0.08),
    TIGER_DARK_ORANGE
  );

  // =========================
  // BODY STRIPES - LEFT SIDE
  // =========================
  drawBodyStripe(-0.54, 0.10, -1, 34, 0.040, 0.22);
  drawBodyStripe(-0.42, 0.08, -1, 28, 0.044, 0.20);
  drawBodyStripe(-0.28, 0.07, -1, 22, 0.048, 0.19);
  drawBodyStripe(-0.12, 0.06, -1, 14, 0.050, 0.20);
  drawBodyStripe( 0.05, 0.06, -1,  6, 0.048, 0.20);
  drawBodyStripe( 0.23, 0.05, -1, -4, 0.046, 0.18);
  drawBodyStripe( 0.40, 0.05, -1, -14, 0.043, 0.16);
  drawBodyStripe( 0.54, 0.06, -1, -22, 0.038, 0.13);

  // ==========================
  // BODY STRIPES - RIGHT SIDE
  // ==========================
  drawBodyStripe(-0.54, 0.10, 1, -34, 0.040, 0.22);
  drawBodyStripe(-0.42, 0.08, 1, -28, 0.044, 0.20);
  drawBodyStripe(-0.28, 0.07, 1, -22, 0.048, 0.19);
  drawBodyStripe(-0.12, 0.06, 1, -14, 0.050, 0.20);
  drawBodyStripe( 0.05, 0.06, 1,  -6, 0.048, 0.20);
  drawBodyStripe( 0.23, 0.05, 1,   4, 0.046, 0.18);
  drawBodyStripe( 0.40, 0.05, 1,  14, 0.043, 0.16);
  drawBodyStripe( 0.54, 0.06, 1,  22, 0.038, 0.13);

  // =================
  // TOP / BACK STRIPES
  // =================
  drawTopStripe(-0.50,  0.00,  18, 0.036, 0.14);
  drawTopStripe(-0.30,  0.02,  10, 0.034, 0.17);
  drawTopStripe(-0.08,  0.01,   4, 0.032, 0.20);
  drawTopStripe( 0.15, -0.01,  -4, 0.032, 0.20);
  drawTopStripe( 0.36, -0.02, -12, 0.034, 0.17);
  drawTopStripe( 0.54,  0.00, -18, 0.036, 0.13);

  // Head stripes
  drawCubePart(
    new Matrix4(headBase)
      .translate(0.02, 0.24, 0.0)
      .scale(0.06, 0.04, 0.42),
    BLACK
  );

  drawCubePart(
    new Matrix4(headBase)
      .translate(0.15, 0.23, -0.19)
      .scale(0.05, 0.04, 0.10),
    BLACK
  );

  drawCubePart(
    new Matrix4(headBase)
      .translate(0.15, 0.23, 0.19)
      .scale(0.05, 0.04, 0.10),
    BLACK
  );

  // Legs
  // left side = z -0.18
  drawLeg(0.42, -0.27, -0.18, g_frontLeftUpper, g_frontLeftLower, g_frontLeftPaw);
  drawLeg(-0.38, -0.27, -0.18, g_backLeftUpper, g_backLeftLower, g_backLeftPaw);

  // right side = z 0.18
  drawLeg(0.42, -0.27, 0.18, g_frontRightUpper, g_frontRightLower, g_frontRightPaw);
  drawLeg(-0.38, -0.27, 0.18, g_backRightUpper, g_backRightLower, g_backRightPaw);

  // Tail, 3-part chain using cylinder primitive
  drawTail();
}

function drawBodyStripe(x, y, side, angle, width = 0.05, height = 0.20) {
  // Body side surface is near z = +/-0.225
  // Keep it only slightly outside so it is visible but not floating
  let z = side * 0.229;

  drawCubePart(
    new Matrix4()
      .translate(x, y, z)
      .rotate(angle, 0, 0, 1)
      .scale(width, height, 0.014),
    BLACK
  );
}

function drawTopStripe(x, z, angle, width = 0.034, length = 0.16) {
  // Top of body is around y = 0.275
  // Put stripes just above it, not too high
  drawCubePart(
    new Matrix4()
      .translate(x, 0.272, z)
      .rotate(angle, 0, 1, 0)
      .scale(width, 0.014, length),
    BLACK
  );
}

function drawLeg(x, y, z, upperAngle, lowerAngle, pawAngle) {
  // Upper leg joint
  let upper = new Matrix4();
  upper.translate(x, y, z);
  upper.rotate(upperAngle, 0, 0, 1);

  drawCubePart(
    new Matrix4(upper)
      .translate(0, -0.16, 0)
      .scale(0.18, 0.32, 0.16),
    TIGER_ORANGE
  );

  // Lower leg connected to upper leg
  let lower = new Matrix4(upper);
  lower.translate(0, -0.33, 0);
  lower.rotate(lowerAngle, 0, 0, 1);

  drawCubePart(
    new Matrix4(lower)
      .translate(0, -0.13, 0)
      .scale(0.15, 0.28, 0.14),
    TIGER_DARK_ORANGE
  );

  // Paw connected to lower leg
  let paw = new Matrix4(lower);
  paw.translate(0.04, -0.28, 0);
  paw.rotate(pawAngle, 0, 0, 1);

  drawCubePart(
    new Matrix4(paw)
      .translate(0.07, -0.03, 0)
      .scale(0.25, 0.10, 0.18),
    WHITE
  );
}

function drawTail() {
  let tail = new Matrix4();
  tail.translate(-0.68, 0.02, 0.0);

  // Tail follows the stepping side left/right
  tail.rotate(g_tailAngle, 0, 1, 0);

  // Fixed downward angle
  tail.rotate(25, 0, 0, 1);

  // Point tail backward
  tail.rotate(-90, 0, 1, 0);

  drawCylinderPart(
    new Matrix4(tail)
      .scale(0.08, 0.08, 0.40),
    TIGER_ORANGE
  );

  let tail2 = new Matrix4(tail);
  tail2.translate(0, 0, 0.35);
  tail2.rotate(g_tailAngle * 0.35, 0, 1, 0);

  drawCylinderPart(
    new Matrix4(tail2)
      .scale(0.075, 0.075, 0.34),
    TIGER_ORANGE
  );

  let tail3 = new Matrix4(tail2);
  tail3.translate(0, 0, 0.30);
  tail3.rotate(g_tailAngle * 0.25, 0, 1, 0);

  drawCylinderPart(
    new Matrix4(tail3)
      .scale(0.07, 0.07, 0.28),
    TIGER_DARK_ORANGE
  );

  // Black tail tip
  let tailTip = new Matrix4(tail3);
  tailTip.translate(0, 0, 0.25);

  drawCylinderPart(
    new Matrix4(tailTip)
      .scale(0.075, 0.075, 0.12),
    BLACK
  );
}

function drawCubePart(matrix, color) {
  let cube = new Cube();
  cube.color = color;
  cube.matrix = matrix;
  cube.render();
}

function drawCylinderPart(matrix, color) {
  let cylinder = new Cylinder();
  cylinder.color = color;
  cylinder.matrix = matrix;
  cylinder.render();
}

// ======================================================
// Optimized cube drawing with one reusable buffer
// ======================================================

let g_cubeBuffer = null;

function initCubeBuffer() {
  if (g_cubeBuffer !== null) return;

  let vertices = new Float32Array([
    // Front face
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,

    // Back face
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,

    // Top face
    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,

    // Bottom face
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,

    // Right face
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,

    // Left face
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
  ]);

  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

function drawCubeWithColor(rgba) {
  initCubeBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Front face
  gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Back face
  gl.uniform4f(
    u_FragColor,
    rgba[0] * 0.85,
    rgba[1] * 0.85,
    rgba[2] * 0.85,
    rgba[3]
  );
  gl.drawArrays(gl.TRIANGLES, 6, 6);

  // Top face
  gl.uniform4f(
    u_FragColor,
    Math.min(rgba[0] * 1.05, 1.0),
    Math.min(rgba[1] * 1.05, 1.0),
    Math.min(rgba[2] * 1.05, 1.0),
    rgba[3]
  );
  gl.drawArrays(gl.TRIANGLES, 12, 6);

  // Bottom face
  gl.uniform4f(
    u_FragColor,
    rgba[0] * 0.65,
    rgba[1] * 0.65,
    rgba[2] * 0.65,
    rgba[3]
  );
  gl.drawArrays(gl.TRIANGLES, 18, 6);

  // Right face
  gl.uniform4f(
    u_FragColor,
    rgba[0] * 0.9,
    rgba[1] * 0.9,
    rgba[2] * 0.9,
    rgba[3]
  );
  gl.drawArrays(gl.TRIANGLES, 24, 6);

  // Left face
  gl.uniform4f(
    u_FragColor,
    rgba[0] * 0.75,
    rgba[1] * 0.75,
    rgba[2] * 0.75,
    rgba[3]
  );
  gl.drawArrays(gl.TRIANGLES, 30, 6);
}

// Backup plain cube draw function
function drawCube() {
  initCubeBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// ======================================================
// Optimized cylinder drawing with reusable buffers
// ======================================================

let g_cylinderBuffers = {};

function drawCylinder(segments) {
  if (!g_cylinderBuffers[segments]) {
    let vertices = [];

    for (let i = 0; i < segments; i++) {
      let angle1 = (i * 2 * Math.PI) / segments;
      let angle2 = ((i + 1) * 2 * Math.PI) / segments;

      let x1 = Math.cos(angle1) * 0.5;
      let y1 = Math.sin(angle1) * 0.5;
      let x2 = Math.cos(angle2) * 0.5;
      let y2 = Math.sin(angle2) * 0.5;

      // Side rectangle split into two triangles
      vertices.push(x1, y1, -0.5);
      vertices.push(x2, y2, -0.5);
      vertices.push(x2, y2,  0.5);

      vertices.push(x1, y1, -0.5);
      vertices.push(x2, y2,  0.5);
      vertices.push(x1, y1,  0.5);

      // Front cap
      vertices.push(0, 0, 0.5);
      vertices.push(x1, y1, 0.5);
      vertices.push(x2, y2, 0.5);

      // Back cap
      vertices.push(0, 0, -0.5);
      vertices.push(x2, y2, -0.5);
      vertices.push(x1, y1, -0.5);
    }

    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    g_cylinderBuffers[segments] = {
      buffer: buffer,
      count: vertices.length / 3
    };
  }

  let cylinder = g_cylinderBuffers[segments];

  gl.bindBuffer(gl.ARRAY_BUFFER, cylinder.buffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, cylinder.count);
}