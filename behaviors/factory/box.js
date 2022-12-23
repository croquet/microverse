class ConveyorBoxActor {
  setup() {
    this.startPoint = [22.96199715067616, 0, 30.90992622375488];
    if (this.running === undefined) {
      this.running = true;
      this.count = this._cardData.startCount;
      this.step();
    }
  }

  step() {
    if (this.count < 0) { // Fix Translation Error
      this.translateTo(this.startPoint);
    } else if (this.count < 33) { // Offset
      this.forwardBy(0.1);
    } else if (this.count < 34) { // Offset
      this.forwardBy(0.04);
    } else if (this.count < 49) { // First Turn
      this.forwardBy(0.1);
      this.rotateBy(-0.1);
    } else if (this.count < 50) { // Align After Turn
      this.forwardBy(0.1);
      this.rotateTo([0, 0, 0, 1]);
    } else if (this.count < 270) { // Forward
      this.forwardBy(0.1);
    } else if (this.count < 285) { // Second Turn
      this.forwardBy(0.1);
      this.rotateBy(0.1);
    } else if (this.count < 286) { // Align After Turn
      this.forwardBy(0.1);
      this.rotateTo([0, 0.70710678118, 0, 0.70710678118]);
    } else if (this.count < 500) { // Forward
      this.forwardBy(0.1);
    } else if (this.count < 580) { // Turn After Exit
      this.forwardBy(0.1);
      this.rotateBy(-0.04);
    } else if (this.count < 581) { // Align After Turn
      this.forwardBy(0.1);
      this.rotateTo([0, 0.70710678118, 0, 0.70710678118]);
    } else if (this.count < 900) {// Move Back To Beginning
      this.forwardBy(-0.1);
    } else { // Reset Structure
      this.translateTo(this.startPoint);
      this.count = 0;
    } if (this.running) { // Continue Run
      this.future(50).step(); // Number Controls Speed
      this.count++;
    }
  }
  forwardBy(moveAmnt) { // Forward Movement
    let forward = Microverse.v3_rotate([moveAmnt, 0, 0], this.rotation);
    this.translateTo([
      this.translation[0] + forward[0],
      this.translation[1] + forward[1],
      this.translation[2] + forward[2]]);
  }
}

export default {
  modules: [
    {
      name: "ConveyorBox",
      actorBehaviors: [ConveyorBoxActor],
    },
  ]
}

/* globals Microverse */
