class Circle {
  constructor() {
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
    this.segments = 12;
  }

  render() {
    let xy = this.position;
    let rgba = this.color;
    let size = this.size;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, size);

    let d = this.size / 200.0;
    let angleStep = 360 / this.segments;

    for (let angle = 0; angle < 360; angle += angleStep) {
      let rad1 = angle * Math.PI / 180.0;
      let rad2 = (angle + angleStep) * Math.PI / 180.0;

      let x1 = xy[0] + Math.cos(rad1) * d;
      let y1 = xy[1] + Math.sin(rad1) * d;
      let x2 = xy[0] + Math.cos(rad2) * d;
      let y2 = xy[1] + Math.sin(rad2) * d;

      drawTriangle([
        xy[0], xy[1],
        x1, y1,
        x2, y2
      ]);
    }
  }
}