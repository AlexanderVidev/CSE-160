class Cube {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render() {
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    drawCubeWithColor(this.color);
  }
}