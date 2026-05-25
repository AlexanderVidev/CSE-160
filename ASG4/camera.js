class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([0, 2.4, 9.5]);
    this.at = new Vector3([0, 1.2, 0]);
    this.up = new Vector3([0, 1, 0]);
    this.speed = 4.5;
    this.turnSpeed = 95;
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.updateView();
    this.updateProjection();
  }

  updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }

  updateProjection() {
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  getForwardVector() {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    f.normalize();
    return f;
  }

  moveForward(distance = this.speed) {
    let f = this.getForwardVector();
    f.elements[1] = 0;
    f.normalize();
    f.mul(distance);
    this.eye.add(f);
    this.at.add(f);
    this.updateView();
  }

  moveBackwards(distance = this.speed) {
    this.moveForward(-distance);
  }

  moveLeft(distance = this.speed) {
    let f = this.getForwardVector();
    f.elements[1] = 0;
    f.normalize();
    let s = Vector3.cross(this.up, f);
    s.normalize();
    s.mul(distance);
    this.eye.add(s);
    this.at.add(s);
    this.updateView();
  }

  moveRight(distance = this.speed) {
    this.moveLeft(-distance);
  }

  panLeft(alpha = this.turnSpeed) {
    let f = this.getForwardVector();
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateView();
  }

  panRight(alpha = this.turnSpeed) {
    this.panLeft(-alpha);
  }

  panByMouse(dx) {
    this.panRight(dx * 0.25);
  }
}
