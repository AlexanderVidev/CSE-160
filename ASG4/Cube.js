class Cube {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -1; // -1 means solid color only
    this.forceColor = false;
  }

  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    setNormalMatrix(this.matrix);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform1f(u_texColorWeight, this.textureNum < 0 ? 0.0 : 1.0);
    gl.uniform1i(u_ForceColor, this.forceColor ? 1 : 0);
    drawCube();
  }
}
