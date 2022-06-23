/*

    Important Note: Each Box moves with the same controls. It is up to
    the handler to change those controls in any way necessary. Other
    methods can be added to the movement actor but must be called from
    the handler in order to allow the box to be changed such that it can
    still be recreated at will. All boxes can use the same movement actor.

*/

class BoxMovementActor {

  forwardBy(moveAmnt) { // Forward Movement
    let forward = Worldcore.v3_rotate([moveAmnt, 0, 0], this.rotation);
    this.translateTo([
      this.translation[0] + forward[0],
      this.translation[1] + forward[1],
      this.translation[2] + forward[2]]);
  }

  rotateBy(angles) { // Rotational Movement
    let q = Worldcore.q_euler(...angles);
    q = Worldcore.q_multiply(this.rotation, q);
    this.rotateTo(q);
  }

}

class C1BoxHandlerActor { // Handles Box Creation, Deletion, Movement (Conveyor 1 - Lower)

  setup() {
    if (this.running === undefined) {
      this.running = true;
      this.count = this._cardData.startCount;
      this.step();
    }
  }

  step() { // Handles Box Actions (Movement)

    if (this.count < 0) { } // Do Nothing

    else if (this.count === 0) { // Create Basic Box Model
      this.box = this.createCard({ 
        name: "converyorBox",
        dataTranslation: [0, 0.7508889919233228, 0],
        translation: [22.96199715067616, 0, 30.90992622375488],
        startPoint: [22.96199715067616, 0, 30.90992622375488],
        rotation: [0, Math.PI / 2, 0],
        dataScale: [1.2, 1.2, 1.2],
        behaviorModules: ["BoxMovement"],
        layers: ["pointer"],
        dataLocation: "3gnL5YhR7iiXlN_3akKO1X_IZO-h3cMyjiA79HWPAlBQDxMTFxRdSEgBDgsCFEkSFEkEFQgWEgITSQ4ISBJIJD8vLQEjKAoSLgEOIj4ICCk-EDcxHigFDFcBVUgECApJAh8GChcLAkkTFQIRCBVJCh4KDgQVCBECFRQCSAURXysuMzACDVAsXjEJUh0CBTAdNgEjFD4SPwpRNxY0CyskLxMhUwBWKT5IAwYTBkhQHSkWBBUmETEBHgI4MzcRLjMDMR0kLjJTJDgJNTQXHz0CLSYpDgssBgoM",
        modelType: "glb",
        shadow: true,
        singleSided: true,
        type: "3d",
      }); 
      
      // Set Translation To Beginning (Avoid Translation Error)
      this.box.translateTo(this.box._cardData.startPoint);

    }
    
    else if (this.count < 34) { this.box.call("BoxMovement$BoxMovementActor", "forwardBy", 0.1); } // Forward 
    
    else if (this.count < 49) { // First Turn
      this.box.call("BoxMovement$BoxMovementActor", "forwardBy", 0.1);
      this.box.call("BoxMovement$BoxMovementActor", "rotateBy", [0, -0.1, 0]); } 
    
    else if (this.count < 50) { // Align After Turn
      this.box.call("BoxMovement$BoxMovementActor", "forwardBy", 0.1);
      this.box.rotateTo([0, 0, 0, 1]); } 
    
    else if (this.count < 270) { this.box.call("BoxMovement$BoxMovementActor", "forwardBy", 0.1); } // Forward
    
    else if (this.count < 285) { // Second Turn
      this.box.call("BoxMovement$BoxMovementActor", "forwardBy", 0.1);
      this.box.call("BoxMovement$BoxMovementActor", "rotateBy", [0, 0.1, 0]); }
     
    else if (this.count < 286) { // Align After Turn
      this.box.call("BoxMovement$BoxMovementActor", "forwardBy", 0.1);
      this.box.rotateTo([0, 0.70710678118, 0, 0.70710678118]); } 
    
    else if (this.count < 500) { this.box.call("BoxMovement$BoxMovementActor", "forwardBy", 0.1); } // Forward 
    
    else if (this.count < 580) { this.box.destroy(); } // Destroy Box After Exit
    
    else if (this.count === 600) { this.count = -1; } // Restart Count (-1 So === 0 Calls)
    
    if (this.running) { // Run Step - Continue Running (Controls Speed, Increment Count)
      this.future(50).step(); 
      this.count++; }

  }

}

export default {
  modules: [
    {
      name: "BoxMovement",
      actorBehaviors: [BoxMovementActor],
    },
    {
      name: "C1BoxHandler",
      actorBehaviors: [C1BoxHandlerActor],
    },
  ]
}

/* globals Worldcore */
