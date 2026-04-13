// asg1.js

const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform float u_Size;
void main() {
  gl_Position = a_Position;
  gl_PointSize = u_Size;
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
let u_Size;

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedType = POINT;
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 12.0;
let g_selectedSegments = 12;
let g_shapesList = [];

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  canvas.onmousedown = function(ev) {
    click(ev);
    canvas.onmousemove = function(ev2) {
      if (ev2.buttons === 1) {
        click(ev2);
      }
    };
  };

  canvas.onmouseup = function() {
    canvas.onmousemove = null;
  };

  canvas.onmouseleave = function() {
    canvas.onmousemove = null;
  };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get WebGL context');
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get u_FragColor');
    return;
  }

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get u_Size');
    return;
  }
}

function addActionsForHtmlUI() {
  document.getElementById('pointButton').onclick = function() {
    g_selectedType = POINT;
  };

  document.getElementById('triangleButton').onclick = function() {
    g_selectedType = TRIANGLE;
  };

  document.getElementById('circleButton').onclick = function() {
    g_selectedType = CIRCLE;
  };

  document.getElementById('clearButton').onclick = function() {
    g_shapesList = [];
    renderAllShapes();
  };

  document.getElementById('drawPictureButton').onclick = function() {
    addMyPicture();
    renderAllShapes();
  };

  document.getElementById('redSlide').addEventListener('input', function() {
    g_selectedColor[0] = this.value / 100;
  });

  document.getElementById('greenSlide').addEventListener('input', function() {
    g_selectedColor[1] = this.value / 100;
  });

  document.getElementById('blueSlide').addEventListener('input', function() {
    g_selectedColor[2] = this.value / 100;
  });

  document.getElementById('sizeSlide').addEventListener('input', function() {
    g_selectedSize = Number(this.value);
  });

  document.getElementById('segmentSlide').addEventListener('input', function() {
    g_selectedSegments = Number(this.value);
  });
}

function click(ev) {
  let [x, y] = convertCoordinatesEventToGL(ev);
  addShapeAt(x, y);
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  let x = ev.clientX;
  let y = ev.clientY;
  let rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function addShapeAt(x, y) {
  let shape;

  if (g_selectedType === POINT) {
    shape = new Point();
  } else if (g_selectedType === TRIANGLE) {
    shape = new Triangle();
  } else {
    shape = new Circle();
    shape.segments = g_selectedSegments;
  }

  shape.position = [x, y];
  shape.color = [g_selectedColor[0], g_selectedColor[1], g_selectedColor[2], 1.0];
  shape.size = g_selectedSize;

  g_shapesList.push(shape);
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }
}

function drawTriangle(vertices) {
  let vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create buffer');
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function addPictureTriangle(vertices, color) {
  let tri = new Triangle();
  tri.vertices = vertices;
  tri.color = color;
  tri.useCustomVertices = true;
  g_shapesList.push(tri);
}

function addMyPicture() {
  g_shapesList = [];

  // star
  addPictureTriangle([0.70, 0.78, 0.80, 0.90, 0.90, 0.78], [1.0, 0.9, 0.1, 1.0]);
  addPictureTriangle([0.70, 0.78, 0.80, 0.66, 0.90, 0.78], [1.0, 0.84, 0.0, 1.0]);
  addPictureTriangle([0.62, 0.70, 0.80, 0.78, 0.62, 0.86], [0.98, 0.84, 0.0, 1.0]);
  addPictureTriangle([0.98, 0.70, 0.80, 0.78, 0.98, 0.86], [0.98, 0.84, 0.0, 1.0]);

  // mountains
  addPictureTriangle([-1.00, -0.32, -0.68, 0.26, -0.36, -0.32], [0.22, 0.22, 0.36, 1.0]);
  addPictureTriangle([-0.40, -0.32, -0.18, -0.10, 0.04, -0.32], [0.28, 0.28, 0.46, 1.0]);
  addPictureTriangle([-0.06, -0.32, 0.32, 0.42, 0.68, -0.32], [0.24, 0.24, 0.40, 1.0]);
  addPictureTriangle([0.34, -0.32, 0.62, 0.12, 0.92, -0.32], [0.33, 0.33, 0.50, 1.0]);

  // mountain shading
  addPictureTriangle([-0.84, -0.32, -0.70, 0.04, -0.52, -0.32], [0.40, 0.40, 0.56, 1.0]);
  addPictureTriangle([0.00, -0.32, 0.16, 0.04, 0.38, -0.32], [0.40, 0.40, 0.56, 1.0]);

  // snow caps
  addPictureTriangle([-0.82, 0.05, -0.68, 0.26, -0.54, 0.05], [0.95, 0.95, 0.95, 1.0]);
  addPictureTriangle([0.18, 0.16, 0.32, 0.42, 0.46, 0.16], [0.95, 0.95, 0.95, 1.0]);
  addPictureTriangle([0.50, -0.02, 0.62, 0.12, 0.76, -0.02], [0.95, 0.95, 0.95, 1.0]);

  // left tree
  addPictureTriangle([-0.92, 0.02, -0.78, 0.18, -0.64, 0.02], [0.00, 0.75, 0.12, 1.0]);
  addPictureTriangle([-0.90, -0.08, -0.78, 0.08, -0.64, -0.08], [0.00, 0.65, 0.10, 1.0]);
  addPictureTriangle([-0.88, -0.18, -0.78, -0.02, -0.62, -0.18], [0.00, 0.55, 0.08, 1.0]);
  addPictureTriangle([-0.80, -0.18, -0.70, -0.18, -0.75, -0.48], [0.52, 0.30, 0.08, 1.0]);

  // right tree
  addPictureTriangle([0.72, 0.02, 0.88, 0.20, 1.02, 0.02], [0.00, 0.75, 0.12, 1.0]);
  addPictureTriangle([0.70, -0.08, 0.88, 0.08, 1.04, -0.08], [0.00, 0.65, 0.10, 1.0]);
  addPictureTriangle([0.68, -0.16, 0.88, 0.00, 1.06, -0.16], [0.00, 0.55, 0.08, 1.0]);
  addPictureTriangle([0.82, -0.14, 0.94, -0.14, 0.88, -0.44], [0.52, 0.30, 0.08, 1.0]);

  // ground
  addPictureTriangle([-1.0, -0.32, 1.0, -0.32, 1.0, -1.0], [0.08, 0.46, 0.10, 1.0]);
  addPictureTriangle([-1.0, -0.32, -1.0, -1.0, 1.0, -1.0], [0.06, 0.38, 0.08, 1.0]);

  // darker slope
  addPictureTriangle([-1.0, -0.32, 1.0, -1.0, -1.0, -1.0], [0.07, 0.42, 0.09, 1.0]);

  // waterfall
  addPictureTriangle([-0.02, -0.32, 0.10, -0.32, 0.02, -1.0], [0.16, 0.50, 0.88, 1.0]);
  addPictureTriangle([0.10, -0.32, 0.24, -0.32, 0.12, -1.0], [0.22, 0.58, 0.96, 1.0]);

     // A bush (outer upright triangle)
  addPictureTriangle([-0.46, -0.88, -0.34, -0.62, -0.22, -0.88], [0.10, 0.55, 0.14, 1.0]);

  // A bush (inner small triangle)
  addPictureTriangle([-0.39, -0.79, -0.34, -0.68, -0.29, -0.79], [0.20, 0.70, 0.22, 1.0]);

  // lower opening - downward cuts
  addPictureTriangle([-0.39, -0.79, -0.36, -0.88, -0.34, -0.79], [0.06, 0.38, 0.08, 1.0]);
  addPictureTriangle([-0.34, -0.79, -0.32, -0.88, -0.29, -0.79], [0.06, 0.38, 0.08, 1.0]);

  // upward-facing triangles touching with no gaps
  addPictureTriangle([-0.40, -0.88, -0.375, -0.81, -0.25, -0.88], [0.06, 0.38, 0.08, 1.0]);
  addPictureTriangle([-0.40, -0.88, -0.325, -0.81, -0.25, -0.88], [0.06, 0.38, 0.08, 1.0]);
  addPictureTriangle([-0.40, -0.88, -0.275, -0.81, -0.25, -0.88], [0.06, 0.38, 0.08, 1.0]);

     // V bush (outer inverted triangle)
  addPictureTriangle([0.34, -0.62, 0.46, -0.88, 0.58, -0.62], [0.10, 0.55, 0.14, 1.0]);

  // V bush (inner inverted triangle touching the top side)
  addPictureTriangle([0.39, -0.62, 0.46, -0.80, 0.53, -0.62], [0.20, 0.70, 0.22, 1.0]);
}