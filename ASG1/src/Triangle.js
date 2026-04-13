class Triangle {
  constructor() {
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
    this.vertices = [];
    this.useCustomVertices = false;
  }

  render() {
    let rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, this.size);

    if (this.useCustomVertices) {
      drawTriangle(this.vertices);
      return;
    }

    let xy = this.position;
    let d = this.size / 200.0;

    drawTriangle([
      xy[0], xy[1] + d,
      xy[0] - d, xy[1] - d,
      xy[0] + d, xy[1] - d
    ]);
  }
}