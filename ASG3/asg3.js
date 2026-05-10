// asg3.js - Assignment 3: Creating a Virtual World (Hard)

const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
varying vec2 v_UV;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV;
uniform vec4 u_FragColor;
uniform int u_whichTexture;
uniform float u_texColorWeight;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;

void main() {
  vec4 texColor;
  if (u_whichTexture == 0) {
    texColor = texture2D(u_Sampler0, v_UV);
  } else if (u_whichTexture == 1) {
    texColor = texture2D(u_Sampler1, v_UV);
  } else if (u_whichTexture == 2) {
    texColor = texture2D(u_Sampler2, v_UV);
  } else if (u_whichTexture == 3) {
    texColor = texture2D(u_Sampler3, v_UV);
  } else if (u_whichTexture == 4) {
    texColor = texture2D(u_Sampler4, v_UV);
  } else {
    texColor = u_FragColor;
  }

  gl_FragColor = (1.0 - u_texColorWeight) * u_FragColor + u_texColorWeight * texColor;
}
`;

let canvas;
let gl;
let camera;

let a_Position;
let a_UV;
let u_FragColor;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_whichTexture;
let u_texColorWeight;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
let u_Sampler4;

let g_cubeBuffer = null;
let g_lastFrameTime = performance.now();
let g_seconds = 0;
let g_startTime = performance.now() / 1000.0;
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_score = 0;
let g_win = false;
let g_crystalsReady = false;
let g_keys = {};
let g_lastTickTime = performance.now();

const MAP_SIZE = 32;
const WORLD_OFFSET = MAP_SIZE / 2;

const COLORS = {
  sky: [0.47, 0.75, 1.0, 1.0],
  tigerOrange: [1.0, 0.45, 0.08, 1.0],
  darkOrange: [0.85, 0.28, 0.04, 1.0],
  black: [0.02, 0.02, 0.02, 1.0],
  white: [0.95, 0.9, 0.8, 1.0],
  pink: [1.0, 0.55, 0.6, 1.0],
  crystal: [0.25, 0.95, 1.0, 1.0],
  gold: [1.0, 0.8, 0.15, 1.0]
};

const TEXTURE_GRASS = 0;
const TEXTURE_WALL = 1;
const TEXTURE_DIRT = 2;
const TEXTURE_WOOD = 3;
const TEXTURE_LEAF = 4;

const g_baseMap = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4],
  [4, 0, 0, 3, 1, 4, 1, 0, 1, 3, 1, 3, 2, 3, 1, 0, 1, 3, 1, 3, 1, 3, 1, 0, 1, 3, 4, 3, 1, 0, 0, 4],
  [4, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 2, 2, 2, 2, 2, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2, 2, 2, 2, 3, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 4],
  [4, 0, 0, 3, 1, 3, 1, 0, 1, 3, 1, 3, 4, 3, 1, 0, 1, 3, 1, 2, 1, 3, 1, 0, 1, 3, 3, 3, 1, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 3, 1, 2, 1, 0, 1, 3, 1, 3, 3, 3, 1, 0, 1, 3, 1, 4, 1, 3, 1, 0, 1, 3, 2, 3, 1, 0, 0, 4],
  [4, 0, 0, 0, 0, 3, 0, 3, 3, 3, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 0, 4, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 3, 3, 3, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
];

let g_map = g_baseMap.map(row => row.slice());

let g_crystals = [];
let g_guardTigers = [];
let g_playerHitCooldown = 0;
let g_statusMessage = 'Avoid the guardian tigers and collect the crystals.';
let g_gameState = 'playing'; // playing, caught, win


function generateRandomMap() {
  // Build a different connected 32x32 maze every time the page loads.
  // The original hardcoded map above is still kept as a base/reference, but
  // this function creates a new playable map with random wall heights 1-4.
  let open = [];
  for (let z = 0; z < MAP_SIZE; z++) {
    open[z] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      open[z][x] = false;
    }
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  function carveMaze(cx, cz) {
    open[cz][cx] = true;
    let dirs = shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]);

    for (let i = 0; i < dirs.length; i++) {
      let nx = cx + dirs[i][0];
      let nz = cz + dirs[i][1];

      if (nx < 1 || nx >= MAP_SIZE - 1 || nz < 1 || nz >= MAP_SIZE - 1) continue;
      if (open[nz][nx]) continue;

      open[cz + dirs[i][1] / 2][cx + dirs[i][0] / 2] = true;
      carveMaze(nx, nz);
    }
  }

  function clearRoom(cx, cz, radius) {
    for (let z = cz - radius; z <= cz + radius; z++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x >= 1 && x < MAP_SIZE - 1 && z >= 1 && z < MAP_SIZE - 1) {
          open[z][x] = true;
        }
      }
    }
  }

  // Start near the player's reset position and carve a connected maze.
  carveMaze(15, 23);

  // Make the world less cramped by adding rooms and extra gaps.
  clearRoom(16, 24, 2); // player start area
  clearRoom(6, 5, 2);
  clearRoom(25, 5, 2);
  clearRoom(16, 16, 2);
  clearRoom(7, 26, 2);
  clearRoom(25, 26, 2);

  for (let i = 0; i < 5; i++) {
    let cx = 3 + Math.floor(Math.random() * 26);
    let cz = 3 + Math.floor(Math.random() * 26);
    clearRoom(cx, cz, 1 + Math.floor(Math.random() * 2));
  }

  // Randomly knock down some extra walls so each run feels different and
  // guardian tigers have alternate routes through the maze.
  for (let z = 1; z < MAP_SIZE - 1; z++) {
    for (let x = 1; x < MAP_SIZE - 1; x++) {
      if (!open[z][x] && Math.random() < 0.16) {
        open[z][x] = true;
      }
    }
  }

  // Convert open/blocked cells into the assignment's required height map.
  let heights = [1, 2, 2, 3, 3, 4];
  for (let z = 0; z < MAP_SIZE; z++) {
    g_map[z] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      if (x === 0 || x === MAP_SIZE - 1 || z === 0 || z === MAP_SIZE - 1) {
        g_map[z][x] = 4;
      } else if (open[z][x]) {
        g_map[z][x] = 0;
      } else {
        g_map[z][x] = heights[Math.floor(Math.random() * heights.length)];
      }
    }
  }
}

function resetGameWorld(makeNewMap) {
  if (makeNewMap) generateRandomMap();

  camera = new Camera();
  g_score = 0;
  g_win = false;
  g_playerHitCooldown = 0;
  g_keys = {};
  g_crystalsReady = false;
  g_gameState = 'playing';
  hideGameOverlay();

  setupCrystals();
  setupGuardianTigers();

  g_statusMessage = makeNewMap
    ? 'New random maze generated. Avoid the guardian tigers and collect the crystals.'
    : 'Avoid the guardian tigers and collect the crystals.';
}

function mapCellToWorld(mx, mz) {
  return {
    x: mx - WORLD_OFFSET + 0.5,
    z: mz - WORLD_OFFSET + 0.5
  };
}

function isOpenMapCell(mx, mz) {
  return mx >= 1 && mx < MAP_SIZE - 1 &&
         mz >= 1 && mz < MAP_SIZE - 1 &&
         g_map[mz][mx] === 0;
}

function pickRandomOpenCell(minX, maxX, minZ, maxZ, used) {
  let options = [];

  for (let mz = minZ; mz <= maxZ; mz++) {
    for (let mx = minX; mx <= maxX; mx++) {
      let key = mx + ',' + mz;
      if (isOpenMapCell(mx, mz) && !used[key]) {
        options.push({ mx: mx, mz: mz });
      }
    }
  }

  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}

function setupCrystals() {
  // Pick one open cell from each area of the map. This keeps crystals from
  // spawning inside walls and makes their locations different each refresh.
  let zones = [
    { minX: 2,  maxX: 10, minZ: 1,  maxZ: 8  },
    { minX: 21, maxX: 30, minZ: 1,  maxZ: 8  },
    { minX: 12, maxX: 20, minZ: 12, maxZ: 20 },
    { minX: 2,  maxX: 12, minZ: 23, maxZ: 30 },
    { minX: 20, maxX: 30, minZ: 23, maxZ: 30 }
  ];

  let used = {};
  g_crystals = [];

  for (let i = 0; i < zones.length; i++) {
    let zone = zones[i];
    let cell = pickRandomOpenCell(zone.minX, zone.maxX, zone.minZ, zone.maxZ, used);

    if (!cell) {
      cell = pickRandomOpenCell(1, MAP_SIZE - 2, 1, MAP_SIZE - 2, used);
    }

    if (cell) {
      used[cell.mx + ',' + cell.mz] = true;
      let world = mapCellToWorld(cell.mx, cell.mz);
      g_crystals.push({
        x: world.x,
        y: 1.25,
        z: world.z,
        mx: cell.mx,
        mz: cell.mz,
        collected: false
      });
    }
  }

  g_crystalsReady = true;
}

function setupGuardianTigers() {
  // Moving tiger guards. They patrol/chase the player, but only through open cells.
  let spawnZones = [
    { minX: 3,  maxX: 11, minZ: 18, maxZ: 30 },
    { minX: 20, maxX: 29, minZ: 10, maxZ: 22 },
    { minX: 8,  maxX: 22, minZ: 3,  maxZ: 14 }
  ];

  let used = {};
  g_guardTigers = [];

  for (let i = 0; i < spawnZones.length; i++) {
    let z = spawnZones[i];
    let cell = pickRandomOpenCell(z.minX, z.maxX, z.minZ, z.maxZ, used);
    if (!cell) cell = pickRandomOpenCell(1, MAP_SIZE - 2, 1, MAP_SIZE - 2, used);
    if (!cell) continue;

    used[cell.mx + ',' + cell.mz] = true;
    let world = mapCellToWorld(cell.mx, cell.mz);
    g_guardTigers.push({
      x: world.x,
      z: world.z,
      angle: 0,
      speed: 1.15 + i * 0.15,
      chaseRadius: 7.5 + i,
      wanderTimer: 0,
      targetX: world.x,
      targetZ: world.z,
      scale: i === 0 ? 0.80 : 0.68,
      collisionRadius: i === 0 ? 0.46 : 0.40,
      path: [],
      pathIndex: 0,
      pathTimer: 0,
      targetMX: cell.mx,
      targetMZ: cell.mz
    });
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  resetGameWorld(true);
  addActionsForHtmlUI();
  initTextures();
  gl.clearColor(0.55, 0.80, 1.0, 1.0);
  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get WebGL context.');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');

  let identity = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
  gl.uniform1i(u_whichTexture, -1);
  gl.uniform1f(u_texColorWeight, 0.0);
}

function addActionsForHtmlUI() {
  document.onkeydown = keydown;
  document.onkeyup = keyup;

  document.getElementById('addBlockButton').onclick = addBlockInFront;
  document.getElementById('deleteBlockButton').onclick = deleteBlockInFront;
  document.getElementById('resetButton').onclick = function() {
    camera = new Camera();
    g_keys = {};
    g_statusMessage = 'Camera reset. Avoid the guardian tigers and collect the crystals.';
  };

  document.getElementById('newMapButton').onclick = function() {
    resetGameWorld(true);
  };

  document.getElementById('overlayContinueButton').onclick = function() {
    hideGameOverlay();
    g_gameState = 'playing';
    g_keys = {};
  };

  document.getElementById('overlayNewMapButton').onclick = function() {
    resetGameWorld(true);
  };

  canvas.onmousedown = function(ev) {
    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
  };

  canvas.onmouseup = function() { g_mouseDown = false; };
  canvas.onmouseleave = function() { g_mouseDown = false; };

  canvas.onmousemove = function(ev) {
    if (!g_mouseDown) return;
    let dx = ev.clientX - g_lastMouseX;
    camera.panByMouse(dx);
    g_lastMouseX = ev.clientX;
  };
}

function keydown(ev) {
  let key = ev.key.toLowerCase();

  if (g_gameState !== 'playing') {
    g_keys = {};
    return;
  }

  // Support both WASD/QE and arrow-key camera controls.
  const controlledKeys = [
    'w', 'a', 's', 'd', 'q', 'e', 'f', 'r',
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright'
  ];

  if (controlledKeys.includes(key)) {
    ev.preventDefault();
  }

  // Movement keys are handled every animation frame so motion feels smooth.
  if ([
    'w', 'a', 's', 'd', 'q', 'e',
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright'
  ].includes(key)) {
    g_keys[key] = true;
  }

  // Keep add/delete as a single action per key press.
  if (ev.repeat) return;
  if (key === 'f') deleteBlockInFront();
  else if (key === 'r') addBlockInFront();
}

function keyup(ev) {
  let key = ev.key.toLowerCase();
  g_keys[key] = false;
}

function updateCameraMovement(deltaTime) {
  if (!camera || g_gameState !== 'playing') return;

  let oldEye = new Vector3(camera.eye.elements);
  let oldAt = new Vector3(camera.at.elements);

  let moveAmount = camera.speed * deltaTime;
  let turnAmount = camera.turnSpeed * deltaTime;

  // WASD movement, plus Up/Down arrows for forward/back.
  if (g_keys['w'] || g_keys['arrowup']) camera.moveForward(moveAmount);
  if (g_keys['s'] || g_keys['arrowdown']) camera.moveBackwards(moveAmount);
  if (g_keys['a']) camera.moveLeft(moveAmount);
  if (g_keys['d']) camera.moveRight(moveAmount);

  // Q/E turning, plus Left/Right arrows for camera turning.
  if (g_keys['q'] || g_keys['arrowleft']) camera.panLeft(turnAmount);
  if (g_keys['e'] || g_keys['arrowright']) camera.panRight(turnAmount);

  if (isBlockedAt(camera.eye.elements[0], camera.eye.elements[2])) {
    camera.eye.set(oldEye);
    camera.at.set(oldAt);
    camera.updateView();
  }
}

function tick() {
  let now = performance.now();
  let deltaTime = (now - g_lastTickTime) / 1000.0;
  g_lastTickTime = now;
  deltaTime = Math.min(deltaTime, 0.05); // avoid a huge jump after tab switching

  g_seconds = now / 1000.0 - g_startTime;

  if (g_gameState === 'playing') {
    updateCameraMovement(deltaTime);
    updateGuardianTigers(deltaTime);
    checkTigerCatch(deltaTime);
    checkCrystalPickup();
  }

  renderScene();
  requestAnimationFrame(tick);
}

function renderScene() {
  let startTime = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  drawSkybox();
  drawGround();
  drawWorld();

  // Draw solid objects first, then transparent glowing objects.
  // This keeps guardian tigers visible behind crystal glows and block previews.
  drawStoryAnimals();
  drawInteractionPreview();
  drawCrystals();

  let duration = performance.now() - startTime;
  let now = performance.now();
  let fps = 1000.0 / (now - g_lastFrameTime);
  g_lastFrameTime = now;

  let objective = g_win ? 'You collected all crystals and escaped the guardian tigers!' : g_statusMessage;
  document.getElementById('performance').innerHTML =
    'ms: ' + duration.toFixed(2) + ' fps: ' + Math.floor(fps) +
    ' | crystals: ' + g_score + '/5 | ' + objective;
}

function drawSkybox() {
  let m = new Matrix4();
  m.translate(0, 0, 0);
  m.scale(500, 500, 500);
  drawCubeWithMatrix(m, COLORS.sky, -1, 0.0);
}

function drawGround() {
  let m = new Matrix4();
  m.translate(0, -0.05, 0);
  m.scale(32, 0.1, 32);
  drawCubeWithMatrix(m, [0.45, 0.85, 0.35, 1.0], TEXTURE_GRASS, 0.85);
}

function drawWorld() {
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      let height = g_map[z][x];
      if (height <= 0) continue;

      for (let y = 0; y < height; y++) {
        let m = new Matrix4();
        m.translate(x - WORLD_OFFSET + 0.5, y + 0.5, z - WORLD_OFFSET + 0.5);
        m.scale(1, 1, 1);
        let texture = (height >= 3) ? TEXTURE_WALL : TEXTURE_DIRT;
        drawCubeWithMatrix(m, [0.65, 0.52, 0.38, 1.0], texture, 0.85);
      }
    }
  }
}

function drawInteractionPreview() {
  if (g_gameState !== 'playing' || !camera) return;

  let cell = getTargetCell();
  if (!cell) return;

  let height = g_map[cell.mz][cell.mx];
  let worldX = cell.mx - WORLD_OFFSET + 0.5;
  let worldZ = cell.mz - WORLD_OFFSET + 0.5;

  // If there is already a block, highlight the top block that F would delete.
  // If the cell is empty, show a ghost block where R would add a new block.
  let previewY = height > 0 ? height - 0.5 : 0.5;
  let color = height > 0 ? [1.0, 0.95, 0.15, 0.42] : [0.10, 1.0, 1.0, 0.30];

  let m = new Matrix4();
  m.translate(worldX, previewY, worldZ);
  m.scale(1.06, 1.06, 1.06);
  drawCubeWithMatrix(m, color, -1, 0.0);

  // Add a thin glowing pad on the ground so the target cell is visible even
  // when looking at an empty floor square.
  let pad = new Matrix4();
  pad.translate(worldX, 0.025, worldZ);
  pad.scale(0.92, 0.035, 0.92);
  drawCubeWithMatrix(pad, [0.0, 0.9, 1.0, 0.22], -1, 0.0);
}

function drawCrystals() {
  for (let i = 0; i < g_crystals.length; i++) {
    let c = g_crystals[i];
    if (c.collected) continue;

    let floatY = c.y + Math.sin(g_seconds * 2.2 + i * 0.9) * 0.12;
    let spin = g_seconds * 85 + i * 37;
    let pulse = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(g_seconds * 4.2 + i * 1.3));
    let ringRise = floatY + 0.22 + 0.04 * Math.sin(g_seconds * 2.8 + i);

    // Tall beacon beam so the player can spot crystals from far away.
    let beam = new Matrix4();
    beam.translate(c.x, 2.7, c.z);
    beam.scale(0.16, 3.8, 0.16);
    drawCubeWithMatrix(beam, [0.12, 0.92, 1.0, 0.22], -1, 0.0);

    // Wide base glow around the collectible.
    let aura = new Matrix4();
    aura.translate(c.x, floatY, c.z);
    aura.rotate(spin * 0.30, 0, 1, 0);
    aura.rotate(20, 1, 0, 1);
    aura.scale(1.10 * pulse, 1.10 * pulse, 1.10 * pulse);
    drawCubeWithMatrix(aura, [0.05, 0.65, 1.0, 0.12], -1, 0.0);

    // Outer and inner glow shells.
    let outerGlow = new Matrix4();
    outerGlow.translate(c.x, floatY, c.z);
    outerGlow.rotate(spin * 0.45, 0, 1, 0);
    outerGlow.rotate(25, 1, 0, 1);
    outerGlow.scale(0.98 * pulse, 0.98 * pulse, 0.98 * pulse);
    drawCubeWithMatrix(outerGlow, [0.10, 0.85, 1.0, 0.18], -1, 0.0);

    let innerGlow = new Matrix4();
    innerGlow.translate(c.x, floatY, c.z);
    innerGlow.rotate(-spin * 0.75, 0, 1, 0);
    innerGlow.rotate(45, 0, 0, 1);
    innerGlow.scale(0.68 * pulse, 0.68 * pulse, 0.68 * pulse);
    drawCubeWithMatrix(innerGlow, [0.75, 1.0, 1.0, 0.16], -1, 0.0);

    // Main faceted core.
    drawCrystalShard(c.x, floatY, c.z, 0.18, 0.82, 0.18, spin, 45, [0.20, 0.95, 1.0, 0.82]);
    drawCrystalShard(c.x, floatY, c.z, 0.14, 0.62, 0.14, -spin * 1.15, -45, [0.88, 1.0, 1.0, 0.76]);

    // Side shards make the crystal feel more faceted.
    drawOffsetCrystalShard(c.x, floatY + 0.05, c.z, 0.22, 0.10, spin + 40,  0.22, 0.34, 0.10, [0.10, 0.88, 1.0, 0.72]);
    drawOffsetCrystalShard(c.x, floatY + 0.08, c.z, 0.25, 0.11, spin - 70, -0.20, 0.30, -0.08, [0.12, 0.92, 1.0, 0.72]);
    drawOffsetCrystalShard(c.x, floatY - 0.02, c.z, 0.20, 0.09, spin + 130, 0.00, -0.36, 0.16, [0.25, 0.98, 1.0, 0.70]);
    drawOffsetCrystalShard(c.x, floatY + 0.00, c.z, 0.18, 0.08, spin - 160, -0.10, -0.18, -0.20, [0.60, 1.0, 1.0, 0.70]);

    // Floating halo ring around the gem.
    drawCrystalHalo(c.x, ringRise, c.z, spin * 1.7, 0.62, [0.05, 0.95, 1.0, 0.82]);
    drawCrystalHalo(c.x, ringRise + 0.12, c.z, -spin * 1.2, 0.45, [0.85, 1.0, 1.0, 0.72]);

    // Small crown pieces around the top to make the collectible feel rarer.
    for (let k = 0; k < 4; k++) {
      let ang = spin + k * 90;
      let rad = 0.28;
      let ox = Math.cos(ang * Math.PI / 180.0) * rad;
      let oz = Math.sin(ang * Math.PI / 180.0) * rad;
      drawOffsetCrystalShard(c.x, floatY + 0.12, c.z, 0.10, 0.14, ang + 35, ox, 0.30, oz, [0.65, 1.0, 1.0, 0.72]);
    }

    // Tiny orbiting sparkles.
    for (let s = 0; s < 4; s++) {
      let ang = g_seconds * 100 + i * 30 + s * 90;
      let rad = 0.42 + 0.03 * s;
      let px = c.x + Math.cos(ang * Math.PI / 180.0) * rad;
      let pz = c.z + Math.sin(ang * Math.PI / 180.0) * rad;
      let py = floatY + 0.10 * Math.sin((ang * 2) * Math.PI / 180.0) + 0.02 * s;
      let sparkle = new Matrix4();
      sparkle.translate(px, py, pz);
      sparkle.rotate(ang * 1.8, 1, 1, 0);
      sparkle.scale(0.07, 0.07, 0.07);
      drawCubeWithMatrix(sparkle, [0.92, 1.0, 1.0, 0.95], -1, 0.0);
    }

    // Ground rune / marker beneath the crystal.
    let marker1 = new Matrix4();
    marker1.translate(c.x, 0.03, c.z);
    marker1.rotate(45 + spin * 0.2, 0, 1, 0);
    marker1.scale(0.78, 0.03, 0.78);
    drawCubeWithMatrix(marker1, [0.0, 0.85, 1.0, 0.32], -1, 0.0);

    let marker2 = new Matrix4();
    marker2.translate(c.x, 0.035, c.z);
    marker2.rotate(-spin * 0.25, 0, 1, 0);
    marker2.scale(0.52, 0.03, 0.52);
    drawCubeWithMatrix(marker2, [0.85, 1.0, 1.0, 0.30], -1, 0.0);

    // Little crystal pedestal shards on the ground for extra style.
    for (let p = 0; p < 4; p++) {
      let a = 45 + p * 90;
      let ox = Math.cos(a * Math.PI / 180.0) * 0.40;
      let oz = Math.sin(a * Math.PI / 180.0) * 0.40;
      drawOffsetCrystalShard(c.x, c.y - 0.02, c.z, 0.08, 0.11, a + spin * 0.4, ox, 0.08, oz, [0.25, 0.95, 1.0, 0.85]);
    }
  }
}

function drawCrystalShard(x, y, z, sx, sy, sz, spinY, tiltZ, color) {
  let top = new Matrix4();
  top.translate(x, y + sy * 0.34, z);
  top.rotate(spinY, 0, 1, 0);
  top.rotate(tiltZ, 0, 0, 1);
  top.scale(sx, sy, sz);
  drawCubeWithMatrix(top, color, -1, 0.0);

  let bottom = new Matrix4();
  bottom.translate(x, y - sy * 0.34, z);
  bottom.rotate(spinY, 0, 1, 0);
  bottom.rotate(tiltZ, 0, 0, 1);
  bottom.rotate(180, 0, 0, 1);
  bottom.scale(sx, sy, sz);
  drawCubeWithMatrix(bottom, color, -1, 0.0);
}

function drawOffsetCrystalShard(x, y, z, sx, sy, spinY, ox, oy, oz, color) {
  let top = new Matrix4();
  top.translate(x + ox, y + oy + sy * 0.28, z + oz);
  top.rotate(spinY, 0, 1, 0);
  top.rotate(35, 1, 0, 1);
  top.scale(sx, sy, sx);
  drawCubeWithMatrix(top, color, -1, 0.0);

  let bottom = new Matrix4();
  bottom.translate(x + ox, y + oy - sy * 0.28, z + oz);
  bottom.rotate(spinY, 0, 1, 0);
  bottom.rotate(35, 1, 0, 1);
  bottom.rotate(180, 0, 0, 1);
  bottom.scale(sx, sy, sx);
  drawCubeWithMatrix(bottom, color, -1, 0.0);
}

function drawCrystalHalo(x, y, z, spinY, radius, color) {
  for (let r = 0; r < 4; r++) {
    let m = new Matrix4();
    m.translate(x, y, z);
    m.rotate(spinY + r * 90, 0, 1, 0);
    m.translate(radius, 0, 0);
    m.rotate(45, 0, 0, 1);
    m.scale(0.20, 0.06, 0.06);
    drawCubeWithMatrix(m, color, -1, 0.0);
  }
}

function drawStoryAnimals() {
  // Moving guardian tigers: these are the only tigers now.
  // They patrol/chase the player and try to stop the player from collecting crystals.
  for (let i = 0; i < g_guardTigers.length; i++) {
    let tiger = g_guardTigers[i];
    drawTigerAt(tiger.x, 0.05, tiger.z, tiger.scale, tiger.angle, tiger.isMoving);

    // Red warning marker above each moving tiger so players know it is dangerous.
    let warn = new Matrix4();
    warn.translate(tiger.x, 1.95 + 0.12 * Math.sin(g_seconds * 4 + i), tiger.z);
    warn.rotate(g_seconds * 120, 0, 1, 0);
    warn.scale(0.18, 0.18, 0.18);
    drawCubeWithMatrix(warn, [1.0, 0.08, 0.05, 0.92], -1, 0.0);
  }
}

function drawTigerAt(x, y, z, s, angle, isMoving = false) {
  // This uses the detailed tiger design from Assignment 2, adapted so it can
  // be placed anywhere in the virtual world.
  let base = new Matrix4();
  base.translate(x, y + 0.82 * s, z);
  base.rotate(angle, 0, 1, 0);
  base.scale(s, s, s);

  // Only animate the walking cycle when the guardian is actually moving.
  // When stopped, keep the legs/head/tail in a neutral pose so it does not look like it is walking in place.
  let walk = isMoving ? Math.sin(g_seconds * 5.5 + angle * 0.05) : 0;
  let headAngle = isMoving ? 6 * Math.sin(g_seconds * 2.2 + angle * 0.03) : 0;
  let tailAngle = isMoving ? 22 * walk : 4 * Math.sin(g_seconds * 1.2 + angle * 0.02);

  let frontLeftUpper = 18 * walk;
  let frontLeftLower = -12 * walk;
  let frontLeftPaw = 8 * walk;

  let backLeftUpper = 18 * walk;
  let backLeftLower = -12 * walk;
  let backLeftPaw = 8 * walk;

  let frontRightUpper = -18 * walk;
  let frontRightLower = 12 * walk;
  let frontRightPaw = -8 * walk;

  let backRightUpper = -18 * walk;
  let backRightLower = 12 * walk;
  let backRightPaw = -8 * walk;

  // Body
  drawTigerPart(new Matrix4(base).scale(1.25, 0.55, 0.45), COLORS.tigerOrange);

  // White belly / underside
  drawTigerPart(
    new Matrix4(base).translate(0.05, -0.24, 0.0).scale(0.80, 0.08, 0.26),
    COLORS.white
  );

  // Head base matrix
  let headBase = new Matrix4(base);
  headBase.translate(0.82, 0.16, 0.0);
  headBase.rotate(headAngle, 0, 1, 0);

  // Head
  drawTigerPart(new Matrix4(headBase).scale(0.42, 0.40, 0.40), COLORS.tigerOrange);

  // Snout and nose
  drawTigerPart(new Matrix4(headBase).translate(0.27, -0.06, 0.0).scale(0.22, 0.18, 0.22), COLORS.white);
  drawTigerPart(new Matrix4(headBase).translate(0.40, -0.02, 0.0).scale(0.07, 0.07, 0.11), COLORS.pink);

  // Eyes
  drawTigerPart(new Matrix4(headBase).translate(0.22, 0.10, -0.16).scale(0.05, 0.05, 0.04), COLORS.black);
  drawTigerPart(new Matrix4(headBase).translate(0.22, 0.10,  0.16).scale(0.05, 0.05, 0.04), COLORS.black);

  // Ears
  drawTigerPart(new Matrix4(headBase).translate(-0.08, 0.30, -0.17).rotate(25, 1, 0, 0).scale(0.14, 0.20, 0.08), COLORS.darkOrange);
  drawTigerPart(new Matrix4(headBase).translate(-0.08, 0.30,  0.17).rotate(-25, 1, 0, 0).scale(0.14, 0.20, 0.08), COLORS.darkOrange);

  // Body stripes - left side
  drawTigerBodyStripe(base, -0.54, 0.10, -1, 34, 0.040, 0.22);
  drawTigerBodyStripe(base, -0.42, 0.08, -1, 28, 0.044, 0.20);
  drawTigerBodyStripe(base, -0.28, 0.07, -1, 22, 0.048, 0.19);
  drawTigerBodyStripe(base, -0.12, 0.06, -1, 14, 0.050, 0.20);
  drawTigerBodyStripe(base,  0.05, 0.06, -1,  6, 0.048, 0.20);
  drawTigerBodyStripe(base,  0.23, 0.05, -1, -4, 0.046, 0.18);
  drawTigerBodyStripe(base,  0.40, 0.05, -1, -14, 0.043, 0.16);
  drawTigerBodyStripe(base,  0.54, 0.06, -1, -22, 0.038, 0.13);

  // Body stripes - right side
  drawTigerBodyStripe(base, -0.54, 0.10, 1, -34, 0.040, 0.22);
  drawTigerBodyStripe(base, -0.42, 0.08, 1, -28, 0.044, 0.20);
  drawTigerBodyStripe(base, -0.28, 0.07, 1, -22, 0.048, 0.19);
  drawTigerBodyStripe(base, -0.12, 0.06, 1, -14, 0.050, 0.20);
  drawTigerBodyStripe(base,  0.05, 0.06, 1,  -6, 0.048, 0.20);
  drawTigerBodyStripe(base,  0.23, 0.05, 1,   4, 0.046, 0.18);
  drawTigerBodyStripe(base,  0.40, 0.05, 1,  14, 0.043, 0.16);
  drawTigerBodyStripe(base,  0.54, 0.06, 1,  22, 0.038, 0.13);

  // Top / back stripes
  drawTigerTopStripe(base, -0.50,  0.00,  18, 0.036, 0.14);
  drawTigerTopStripe(base, -0.30,  0.02,  10, 0.034, 0.17);
  drawTigerTopStripe(base, -0.08,  0.01,   4, 0.032, 0.20);
  drawTigerTopStripe(base,  0.15, -0.01,  -4, 0.032, 0.20);
  drawTigerTopStripe(base,  0.36, -0.02, -12, 0.034, 0.17);
  drawTigerTopStripe(base,  0.54,  0.00, -18, 0.036, 0.13);

  // Head stripes
  drawTigerPart(new Matrix4(headBase).translate(0.02, 0.24, 0.0).scale(0.06, 0.04, 0.42), COLORS.black);
  drawTigerPart(new Matrix4(headBase).translate(0.15, 0.23, -0.19).scale(0.05, 0.04, 0.10), COLORS.black);
  drawTigerPart(new Matrix4(headBase).translate(0.15, 0.23,  0.19).scale(0.05, 0.04, 0.10), COLORS.black);

  // Legs with 3-level chain like Assignment 2
  drawTigerLeg(base,  0.42, -0.27, -0.18, frontLeftUpper,  frontLeftLower,  frontLeftPaw);
  drawTigerLeg(base, -0.38, -0.27, -0.18, backLeftUpper,   backLeftLower,   backLeftPaw);
  drawTigerLeg(base,  0.42, -0.27,  0.18, frontRightUpper, frontRightLower, frontRightPaw);
  drawTigerLeg(base, -0.38, -0.27,  0.18, backRightUpper,  backRightLower,  backRightPaw);

  drawTigerTail(base, tailAngle);
}

function drawTigerBodyStripe(base, x, y, side, angle, width, height) {
  let z = side * 0.229;
  drawTigerPart(
    new Matrix4(base).translate(x, y, z).rotate(angle, 0, 0, 1).scale(width, height, 0.014),
    COLORS.black
  );
}

function drawTigerTopStripe(base, x, z, angle, width, length) {
  drawTigerPart(
    new Matrix4(base).translate(x, 0.272, z).rotate(angle, 0, 1, 0).scale(width, 0.014, length),
    COLORS.black
  );
}

function drawTigerLeg(base, x, y, z, upperAngle, lowerAngle, pawAngle) {
  let upper = new Matrix4(base);
  upper.translate(x, y, z);
  upper.rotate(upperAngle, 0, 0, 1);

  drawTigerPart(new Matrix4(upper).translate(0, -0.16, 0).scale(0.18, 0.32, 0.16), COLORS.tigerOrange);

  let lower = new Matrix4(upper);
  lower.translate(0, -0.33, 0);
  lower.rotate(lowerAngle, 0, 0, 1);

  drawTigerPart(new Matrix4(lower).translate(0, -0.13, 0).scale(0.15, 0.28, 0.14), COLORS.darkOrange);

  let paw = new Matrix4(lower);
  paw.translate(0.04, -0.28, 0);
  paw.rotate(pawAngle, 0, 0, 1);

  drawTigerPart(new Matrix4(paw).translate(0.07, -0.03, 0).scale(0.25, 0.10, 0.18), COLORS.white);
}

function drawTigerTail(base, tailAngle) {
  let tail = new Matrix4(base);
  tail.translate(-0.68, 0.02, 0.0);
  tail.rotate(tailAngle, 0, 1, 0);
  tail.rotate(25, 0, 0, 1);
  tail.rotate(-90, 0, 1, 0);

  drawCylinderPart(new Matrix4(tail).scale(0.08, 0.08, 0.40), COLORS.tigerOrange);

  let tail2 = new Matrix4(tail);
  tail2.translate(0, 0, 0.35);
  tail2.rotate(tailAngle * 0.35, 0, 1, 0);
  drawCylinderPart(new Matrix4(tail2).scale(0.075, 0.075, 0.34), COLORS.tigerOrange);

  let tail3 = new Matrix4(tail2);
  tail3.translate(0, 0, 0.30);
  tail3.rotate(tailAngle * 0.25, 0, 1, 0);
  drawCylinderPart(new Matrix4(tail3).scale(0.07, 0.07, 0.28), COLORS.darkOrange);

  let tailTip = new Matrix4(tail3);
  tailTip.translate(0, 0, 0.25);
  drawCylinderPart(new Matrix4(tailTip).scale(0.075, 0.075, 0.12), COLORS.black);
}

function drawTigerPart(matrix, color) {
  drawCubeWithMatrix(matrix, color, -1, 0.0);
}

let g_cylinderBuffers = {};

function drawCylinderPart(matrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_whichTexture, -1);
  gl.uniform1f(u_texColorWeight, 0.0);
  drawCylinder(20);
}

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
      vertices.push(x1, y1, -0.5, x2, y2, -0.5, x2, y2, 0.5);
      vertices.push(x1, y1, -0.5, x2, y2, 0.5, x1, y1, 0.5);

      // Front and back caps
      vertices.push(0, 0, 0.5, x1, y1, 0.5, x2, y2, 0.5);
      vertices.push(0, 0, -0.5, x2, y2, -0.5, x1, y1, -0.5);
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

  // The cylinder is color-only, so the fragment shader does not use v_UV.
  // Still set a safe constant UV value to avoid stale attribute data.
  gl.disableVertexAttribArray(a_UV);
  gl.vertexAttrib2f(a_UV, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, cylinder.count);
}

function updateGuardianTigers(deltaTime) {
  if (g_win) return;

  for (let i = 0; i < g_guardTigers.length; i++) {
    let tiger = g_guardTigers[i];
    let playerX = camera.eye.elements[0];
    let playerZ = camera.eye.elements[2];
    let playerCell = worldToMap(playerX, playerZ);

    let toPlayerX = playerX - tiger.x;
    let toPlayerZ = playerZ - tiger.z;
    let playerDist = Math.sqrt(toPlayerX * toPlayerX + toPlayerZ * toPlayerZ);
    let chasing = playerDist < tiger.chaseRadius && isOpenMapCell(playerCell.mx, playerCell.mz);

    tiger.pathTimer -= deltaTime;
    tiger.wanderTimer -= deltaTime;
    tiger.stuckTimer = tiger.stuckTimer || 0;

    let oldX = tiger.x;
    let oldZ = tiger.z;
    let moved = false;

    if (chasing) {
      // First try the old, more natural behavior: move directly toward the player.
      // This makes the tiger feel like it is actually chasing you instead of just
      // walking along grid-center lines. If a wall blocks that direct chase, then
      // fall back to path waypoints to route around the wall.
      moved = tryMoveTigerToward(tiger, playerX, playerZ, deltaTime);

      if (!moved) {
        let startCell = worldToMap(tiger.x, tiger.z);
        let targetChanged = tiger.targetMX !== playerCell.mx || tiger.targetMZ !== playerCell.mz;

        if (!tiger.path || tiger.pathIndex >= tiger.path.length || targetChanged || tiger.pathTimer <= 0) {
          let path = findPathCells(startCell.mx, startCell.mz, playerCell.mx, playerCell.mz);
          if (path && path.length > 1) {
            tiger.path = path;
            tiger.pathIndex = 1;
            tiger.targetMX = playerCell.mx;
            tiger.targetMZ = playerCell.mz;
            tiger.pathTimer = 0.35;
          }
        }

        moved = moveTigerAlongPath(tiger, deltaTime);
      } else {
        // Direct chase is working, so don't force the tiger to finish an old path.
        tiger.path = [];
        tiger.pathIndex = 0;
      }
    } else {
      // Patrol more naturally by aiming at random open world positions. If the
      // patrol target is behind walls, use the pathfinder only as a backup.
      let tdx = tiger.targetX - tiger.x;
      let tdz = tiger.targetZ - tiger.z;
      let targetDist = Math.sqrt(tdx * tdx + tdz * tdz);

      if (tiger.wanderTimer <= 0 || targetDist < 0.35) {
        let cell = pickRandomOpenCell(1, MAP_SIZE - 2, 1, MAP_SIZE - 2, {});
        if (cell) {
          let world = mapCellToWorld(cell.mx, cell.mz);
          tiger.targetX = world.x;
          tiger.targetZ = world.z;
          tiger.targetMX = cell.mx;
          tiger.targetMZ = cell.mz;
          tiger.path = [];
          tiger.pathIndex = 0;
        }
        tiger.wanderTimer = 2.5 + Math.random() * 2.5;
      }

      moved = tryMoveTigerToward(tiger, tiger.targetX, tiger.targetZ, deltaTime);

      if (!moved) {
        let startCell = worldToMap(tiger.x, tiger.z);
        let goalCell = worldToMap(tiger.targetX, tiger.targetZ);

        if (!tiger.path || tiger.pathIndex >= tiger.path.length || tiger.pathTimer <= 0) {
          let path = findPathCells(startCell.mx, startCell.mz, goalCell.mx, goalCell.mz);
          if (path && path.length > 1) {
            tiger.path = path;
            tiger.pathIndex = 1;
            tiger.pathTimer = 0.8;
          }
        }

        moved = moveTigerAlongPath(tiger, deltaTime);
      }
    }

    let moveX = tiger.x - oldX;
    let moveZ = tiger.z - oldZ;
    let actualMoveDist = Math.sqrt(moveX * moveX + moveZ * moveZ);
    tiger.isMoving = moved && actualMoveDist > 0.003;

    if (tiger.isMoving) {
      tiger.stuckTimer = 0;
      tiger.angle = Math.atan2(-moveZ, moveX) * 180.0 / Math.PI;
    } else {
      tiger.stuckTimer += deltaTime;

      // If a tiger still gets trapped by a newly placed block or a bad corner,
      // clear its route so it picks a fresh patrol/chase path next frame.
      if (tiger.stuckTimer > 0.45) {
        tiger.path = [];
        tiger.pathIndex = 0;
        tiger.pathTimer = 0;
        tiger.wanderTimer = 0;
        tiger.stuckTimer = 0;
      }
    }
  }
}

function tryMoveTigerToward(tiger, targetX, targetZ, deltaTime) {
  let dx = targetX - tiger.x;
  let dz = targetZ - tiger.z;
  let dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.01) return false;

  let step = Math.min(tiger.speed * deltaTime, dist);
  let nx = tiger.x + (dx / dist) * step;
  let nz = tiger.z + (dz / dist) * step;
  let radius = tiger.collisionRadius || 0.38;

  // Try full movement first. If blocked, slide along one axis. This preserves
  // the smoother chase feeling while still stopping the tiger from entering walls.
  if (!isBlockedAtWithRadius(nx, nz, radius)) {
    tiger.x = nx;
    tiger.z = nz;
    return true;
  }

  let moved = false;
  if (!isBlockedAtWithRadius(nx, tiger.z, radius)) {
    tiger.x = nx;
    moved = true;
  }
  if (!isBlockedAtWithRadius(tiger.x, nz, radius)) {
    tiger.z = nz;
    moved = true;
  }

  return moved;
}

function getTigerPathStartCell(tiger) {
  // If the tiger is already moving toward a waypoint, keep using that route
  // instead of suddenly starting from the cell behind it. This prevents jitter.
  if (tiger.path && tiger.pathIndex < tiger.path.length) {
    return tiger.path[Math.max(0, tiger.pathIndex - 1)];
  }
  return worldToMap(tiger.x, tiger.z);
}

function moveTigerAlongPath(tiger, deltaTime) {
  if (!tiger.path || tiger.pathIndex >= tiger.path.length) return false;

  let remaining = tiger.speed * deltaTime;
  let moved = false;

  // Consume the frame's movement across one or more waypoints if needed. This
  // removes the tiny stop/start twitch at each cell center.
  while (remaining > 0.0001 && tiger.path && tiger.pathIndex < tiger.path.length) {
    let nextCell = tiger.path[tiger.pathIndex];

    // If the player added a wall into the planned route, cancel the route and
    // choose a new one next frame. Otherwise, trust the path and stay centered
    // in open corridors instead of doing radius checks that catch corners.
    if (!isOpenMapCell(nextCell.mx, nextCell.mz)) {
      tiger.path = [];
      tiger.pathIndex = 0;
      tiger.pathTimer = 0;
      tiger.wanderTimer = 0;
      return moved;
    }

    let nextWorld = mapCellToWorld(nextCell.mx, nextCell.mz);
    let dx = nextWorld.x - tiger.x;
    let dz = nextWorld.z - tiger.z;
    let dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.01) {
      tiger.x = nextWorld.x;
      tiger.z = nextWorld.z;
      tiger.pathIndex++;
      continue;
    }

    let step = Math.min(remaining, dist);
    tiger.x += (dx / dist) * step;
    tiger.z += (dz / dist) * step;
    remaining -= step;
    moved = true;

    if (step >= dist - 0.0001) {
      tiger.x = nextWorld.x;
      tiger.z = nextWorld.z;
      tiger.pathIndex++;
    }
  }

  return moved;
}

function findPathCells(startMX, startMZ, goalMX, goalMZ) {
  if (!isOpenMapCell(startMX, startMZ) || !isOpenMapCell(goalMX, goalMZ)) return null;
  if (startMX === goalMX && startMZ === goalMZ) {
    return [{ mx: startMX, mz: startMZ }];
  }

  let queue = [{ mx: startMX, mz: startMZ }];
  let visited = {};
  let parent = {};
  let startKey = startMX + ',' + startMZ;
  let goalKey = goalMX + ',' + goalMZ;
  visited[startKey] = true;

  let dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let q = 0; q < queue.length; q++) {
    let cur = queue[q];
    let curKey = cur.mx + ',' + cur.mz;

    if (curKey === goalKey) break;

    for (let i = 0; i < dirs.length; i++) {
      let nx = cur.mx + dirs[i][0];
      let nz = cur.mz + dirs[i][1];
      let key = nx + ',' + nz;

      if (visited[key] || !isOpenMapCell(nx, nz)) continue;
      visited[key] = true;
      parent[key] = curKey;
      queue.push({ mx: nx, mz: nz });
    }
  }

  if (!visited[goalKey]) return null;

  let path = [];
  let key = goalKey;
  while (key !== startKey) {
    let parts = key.split(',');
    path.push({ mx: Number(parts[0]), mz: Number(parts[1]) });
    key = parent[key];
  }
  path.push({ mx: startMX, mz: startMZ });
  path.reverse();
  return path;
}

function resetPlayerAfterTigerCatch() {
  // Move the player back near the start, while keeping the viewing direction simple.
  camera.eye = new Vector3([0, 1.7, 8]);
  camera.at = new Vector3([0, 1.7, 7]);
  camera.updateView();
}

function showGameOverlay(type, title, message) {
  let overlay = document.getElementById('gameOverlay');
  if (!overlay) return;

  document.getElementById('overlayTitle').innerText = title;
  document.getElementById('overlayMessage').innerText = message;
  overlay.className = type;
  overlay.style.display = 'flex';

  let continueButton = document.getElementById('overlayContinueButton');
  if (type === 'win') {
    continueButton.style.display = 'none';
  } else {
    continueButton.style.display = 'inline-block';
  }
}

function hideGameOverlay() {
  let overlay = document.getElementById('gameOverlay');
  if (overlay) overlay.style.display = 'none';
}

function checkTigerCatch(deltaTime) {
  if (g_win) return;
  g_playerHitCooldown = Math.max(0, g_playerHitCooldown - deltaTime);

  for (let tiger of g_guardTigers) {
    let dx = camera.eye.elements[0] - tiger.x;
    let dz = camera.eye.elements[2] - tiger.z;
    let dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.05 && g_playerHitCooldown <= 0) {
      g_playerHitCooldown = 2.0;
      g_gameState = 'caught';
      g_keys = {};
      g_statusMessage = 'A guardian tiger caught you! You were sent back to the start.';
      resetPlayerAfterTigerCatch();
      showGameOverlay(
        'caught',
        'Caught by a Tiger!',
        'A guardian tiger caught you before you collected all the crystals. You were sent back to the start. Press Continue to try again, or generate a new map.'
      );
      return;
    }
  }
}

function checkCrystalPickup() {
  for (let c of g_crystals) {
    if (c.collected) continue;
    let dx = camera.eye.elements[0] - c.x;
    let dz = camera.eye.elements[2] - c.z;
    if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
      c.collected = true;
      g_score++;
      if (g_score === g_crystals.length) {
        g_win = true;
        g_gameState = 'win';
        g_keys = {};
        g_statusMessage = 'You collected all crystals and escaped the guardian tigers!';
        showGameOverlay(
          'win',
          'You Win!',
          'You collected all 5 glowing crystals and escaped the guardian tigers. Great job! Generate a new random map to play again.'
        );
      } else {
        g_statusMessage = 'Crystal collected! Watch out for the guardian tigers.';
      }
    }
  }
}

function worldToMap(x, z) {
  return {
    mx: Math.floor(x + WORLD_OFFSET),
    mz: Math.floor(z + WORLD_OFFSET)
  };
}

function isBlockedAt(x, z) {
  let cell = worldToMap(x, z);
  if (cell.mx < 0 || cell.mx >= MAP_SIZE || cell.mz < 0 || cell.mz >= MAP_SIZE) return true;
  return g_map[cell.mz][cell.mx] > 0;
}

function isBlockedAtWithRadius(x, z, radius) {
  // Check the center plus points around the tiger's body. A center-only check
  // lets large animals visually pass through walls, especially around corners.
  let diagonal = radius * 0.707;
  let checks = [
    [0, 0],
    [ radius, 0], [-radius, 0], [0,  radius], [0, -radius],
    [ diagonal,  diagonal], [ diagonal, -diagonal],
    [-diagonal,  diagonal], [-diagonal, -diagonal]
  ];

  for (let i = 0; i < checks.length; i++) {
    if (isBlockedAt(x + checks[i][0], z + checks[i][1])) {
      return true;
    }
  }
  return false;
}

function getTargetCell() {
  let f = camera.getForwardVector();
  f.elements[1] = 0;
  f.normalize();
  let targetX = camera.eye.elements[0] + f.elements[0] * 1.8;
  let targetZ = camera.eye.elements[2] + f.elements[2] * 1.8;
  let cell = worldToMap(targetX, targetZ);
  if (cell.mx < 1 || cell.mx >= MAP_SIZE - 1 || cell.mz < 1 || cell.mz >= MAP_SIZE - 1) return null;
  return cell;
}

function addBlockInFront() {
  if (g_gameState !== 'playing') return;
  let cell = getTargetCell();
  if (!cell) return;

  // Do not let the player accidentally bury an uncollected crystal.
  for (let c of g_crystals) {
    if (!c.collected && c.mx === cell.mx && c.mz === cell.mz) return;
  }

  // Do not place a block directly on a guardian tiger. That can trap it and
  // make its movement look broken.
  for (let t of g_guardTigers) {
    let tigerCell = worldToMap(t.x, t.z);
    if (tigerCell.mx === cell.mx && tigerCell.mz === cell.mz) return;
  }

  if (g_map[cell.mz][cell.mx] < 4) g_map[cell.mz][cell.mx]++;
}

function deleteBlockInFront() {
  if (g_gameState !== 'playing') return;
  let cell = getTargetCell();
  if (!cell) return;
  if (g_map[cell.mz][cell.mx] > 0) g_map[cell.mz][cell.mx]--;
}

function drawCubeWithMatrix(matrix, color, textureNum, textureWeight) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_whichTexture, textureNum);
  gl.uniform1f(u_texColorWeight, textureWeight);

  // Transparent objects should not write to the depth buffer.
  // Otherwise a crystal glow or blue preview cube can make tigers behind it disappear.
  let isTransparent = color[3] < 0.98;
  if (isTransparent) gl.depthMask(false);
  drawCube();
  if (isTransparent) gl.depthMask(true);
}

function initCubeBuffer() {
  if (g_cubeBuffer !== null) return;

  // Each vertex: x, y, z, u, v. Cube is centered at the origin.
  let v = new Float32Array([
    // front
    -0.5,-0.5, 0.5, 0,0,   0.5,-0.5, 0.5, 1,0,   0.5, 0.5, 0.5, 1,1,
    -0.5,-0.5, 0.5, 0,0,   0.5, 0.5, 0.5, 1,1,  -0.5, 0.5, 0.5, 0,1,
    // back
     0.5,-0.5,-0.5, 0,0,  -0.5,-0.5,-0.5, 1,0,  -0.5, 0.5,-0.5, 1,1,
     0.5,-0.5,-0.5, 0,0,  -0.5, 0.5,-0.5, 1,1,   0.5, 0.5,-0.5, 0,1,
    // top
    -0.5, 0.5, 0.5, 0,0,   0.5, 0.5, 0.5, 1,0,   0.5, 0.5,-0.5, 1,1,
    -0.5, 0.5, 0.5, 0,0,   0.5, 0.5,-0.5, 1,1,  -0.5, 0.5,-0.5, 0,1,
    // bottom
    -0.5,-0.5,-0.5, 0,0,   0.5,-0.5,-0.5, 1,0,   0.5,-0.5, 0.5, 1,1,
    -0.5,-0.5,-0.5, 0,0,   0.5,-0.5, 0.5, 1,1,  -0.5,-0.5, 0.5, 0,1,
    // right
     0.5,-0.5, 0.5, 0,0,   0.5,-0.5,-0.5, 1,0,   0.5, 0.5,-0.5, 1,1,
     0.5,-0.5, 0.5, 0,0,   0.5, 0.5,-0.5, 1,1,   0.5, 0.5, 0.5, 0,1,
    // left
    -0.5,-0.5,-0.5, 0,0,  -0.5,-0.5, 0.5, 1,0,  -0.5, 0.5, 0.5, 1,1,
    -0.5,-0.5,-0.5, 0,0,  -0.5, 0.5, 0.5, 1,1,  -0.5, 0.5,-0.5, 0,1
  ]);

  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
}

function drawCube() {
  initCubeBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  let FSIZE = Float32Array.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
  gl.enableVertexAttribArray(a_UV);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function initTextures() {
  // These calls create a procedural texture immediately, then try to replace it
  // with the PNG file after it loads. This prevents black cubes if the image is
  // delayed or if the browser blocks image loading.
  loadTexture(TEXTURE_GRASS, 'textures/grass.png', u_Sampler0, makeCheckerTexture([90, 190, 70, 255], [45, 125, 45, 255]));
  loadTexture(TEXTURE_WALL,  'textures/brick.png', u_Sampler1, makeBrickTexture());
  loadTexture(TEXTURE_DIRT,  'textures/dirt.png',  u_Sampler2, makeNoiseTexture([120, 80, 45, 255], [80, 55, 35, 255]));
  loadTexture(TEXTURE_WOOD,  'textures/wood.png',  u_Sampler3, makeWoodTexture());
  loadTexture(TEXTURE_LEAF,  'textures/leaves.png', u_Sampler4, makeCheckerTexture([45, 155, 60, 255], [25, 105, 35, 255]));
}

function setupTextureParameters() {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

function loadTexture(unit, imagePath, samplerUniform, fallbackPixels) {
  let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  setupTextureParameters();

  // Immediate visible fallback so texture sampling never returns black.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, fallbackPixels);
  gl.uniform1i(samplerUniform, unit);

  // Also try to load the PNG file for the assignment texture requirement.
  let image = new Image();
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    setupTextureParameters();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  };
  image.onerror = function() {
    console.log('Could not load ' + imagePath + '. Using procedural fallback texture instead.');
  };
  image.src = imagePath;
}

function makeCheckerTexture(c1, c2) {
  let data = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      let useFirst = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2) === 0;
      let c = useFirst ? c1 : c2;
      let i = (y * 64 + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = c[3];
    }
  }
  return data;
}

function makeBrickTexture() {
  let data = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      let row = Math.floor(y / 12);
      let shiftedX = (row % 2 === 0) ? x : (x + 16);
      let mortar = (y % 12 < 2) || (shiftedX % 32 < 2);
      let i = (y * 64 + x) * 4;
      if (mortar) {
        data[i] = 45; data[i + 1] = 45; data[i + 2] = 45; data[i + 3] = 255;
      } else {
        data[i] = 145 + ((x * 3 + y) % 35); data[i + 1] = 75; data[i + 2] = 45; data[i + 3] = 255;
      }
    }
  }
  return data;
}

function makeNoiseTexture(c1, c2) {
  let data = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      let n = ((x * 17 + y * 31 + x * y) % 100) / 100;
      let i = (y * 64 + x) * 4;
      data[i] = Math.floor(c1[0] * n + c2[0] * (1 - n));
      data[i + 1] = Math.floor(c1[1] * n + c2[1] * (1 - n));
      data[i + 2] = Math.floor(c1[2] * n + c2[2] * (1 - n));
      data[i + 3] = 255;
    }
  }
  return data;
}

function makeWoodTexture() {
  let data = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      let stripe = Math.floor((x + 6 * Math.sin(y / 6)) / 8) % 2;
      let i = (y * 64 + x) * 4;
      data[i] = stripe ? 140 : 100;
      data[i + 1] = stripe ? 85 : 55;
      data[i + 2] = stripe ? 35 : 20;
      data[i + 3] = 255;
    }
  }
  return data;
}
