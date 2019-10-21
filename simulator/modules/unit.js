class Unit {
  constructor(mesh, speed) {
    this.mesh = mesh;
    this.speed = speed;
    this.position = {
      x: 0,
      y: 0,
      z: 0,
      * [Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
      },
    };
  }
}

class Slime extends Unit {
  constructor(mesh) {
    super(mesh, 5);
  }
}

export { Slime };
