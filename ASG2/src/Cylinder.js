class Cylinder {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.segments = 20;
  }

  render() {
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    drawCylinder(this.segments);
  }
}