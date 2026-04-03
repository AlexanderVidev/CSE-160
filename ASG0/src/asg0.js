let canvas;
let ctx;

function main() {
  canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }

  ctx = canvas.getContext('2d');
  clearCanvas();
}

function clearCanvas() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
  const x = v.elements[0];
  const y = v.elements[1];

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const scale = 20;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + x * scale, centerY - y * scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function getVectorInputs() {
  const v1x = parseFloat(document.getElementById('v1x').value) || 0;
  const v1y = parseFloat(document.getElementById('v1y').value) || 0;
  const v2x = parseFloat(document.getElementById('v2x').value) || 0;
  const v2y = parseFloat(document.getElementById('v2y').value) || 0;

  const v1 = new Vector3([v1x, v1y, 0]);
  const v2 = new Vector3([v2x, v2y, 0]);

  return { v1, v2 };
}

function handleDrawEvent() {
  clearCanvas();

  const { v1, v2 } = getVectorInputs();

  drawVector(v1, 'red');
  drawVector(v2, 'blue');
}

function handleDrawOperationEvent() {
  clearCanvas();

  const { v1, v2 } = getVectorInputs();
  const operation = document.getElementById('operation').value;
  const scalarValue = parseFloat(document.getElementById('scalar').value);
  const scalar = Number.isNaN(scalarValue) ? 1 : scalarValue;

  drawVector(v1, 'red');
  drawVector(v2, 'blue');

  if (operation === 'add') {
    const v3 = new Vector3(v1.elements);
    v3.add(v2);
    drawVector(v3, 'green');
  }
  else if (operation === 'sub') {
    const v3 = new Vector3(v1.elements);
    v3.sub(v2);
    drawVector(v3, 'green');
  }
  else if (operation === 'mul') {
    const v3 = new Vector3(v1.elements);
    const v4 = new Vector3(v2.elements);
    v3.mul(scalar);
    v4.mul(scalar);
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  }
  else if (operation === 'div') {
    const v3 = new Vector3(v1.elements);
    const v4 = new Vector3(v2.elements);
    v3.div(scalar);
    v4.div(scalar);
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  }
  else if (operation === 'magnitude') {
    console.log('Magnitude v1:', v1.magnitude());
    console.log('Magnitude v2:', v2.magnitude());
  }
  else if (operation === 'normalize') {
    const v3 = new Vector3(v1.elements);
    const v4 = new Vector3(v2.elements);
    v3.normalize();
    v4.normalize();
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  }
  else if (operation === 'angle') {
    console.log('Angle:', angleBetween(v1, v2));
  }
  else if (operation === 'area') {
    console.log('Area of the triangle:', areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
  const dot = Vector3.dot(v1, v2);
  const mag1 = v1.magnitude();
  const mag2 = v2.magnitude();

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  let cosAlpha = dot / (mag1 * mag2);

  // Prevent small floating point errors from breaking acos
  cosAlpha = Math.max(-1, Math.min(1, cosAlpha));

  const angleRadians = Math.acos(cosAlpha);
  const angleDegrees = angleRadians * 180 / Math.PI;

  return angleDegrees;
}

function areaTriangle(v1, v2) {
  const cross = Vector3.cross(v1, v2);
  const areaParallelogram = cross.magnitude();
  return areaParallelogram / 2;
}