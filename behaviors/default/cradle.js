class CradleActor {
  setup() {

    let c = 5; // Amount of Balls
    this.cradle = [...Array(c).keys()].map((t) => {

      let d = 3; // Amount of Links (+1)
      // this.removeObjects(); // Reset

      this.links = [...Array(d).keys()].map((i) => {

        let bodyDesc;
        if (i === 0) { bodyDesc = Microverse.RAPIER.RigidBodyDesc.newKinematicPositionBased(); } // Top Link, Stays in Place
        else { bodyDesc = Microverse.RAPIER.RigidBodyDesc.newDynamic().restrictRotations(true, false, false).setGravityScale(4.5); } // Limit Rotation, Set Gravity

        let card;
        let translation = [0, 0 - i * 2, t * 4];
        let name = `cradlelink${i}`;
        let cd;

        if (i === d - 1) { // For the Final Link, do Something Different (Not Necessary)
          card = this.createCard({
            name,
            translation: [0, -14, t * 4],
            dataScale: [5.9, 5.9, 5.9],
            parent: this,
            type: "3d",
            modelType: "glb",
            dataLocation: "3h1oGaJp7SMV-AcRncT2BcLb8nyGHCZlwYrOZPLD5uwIABwcGBtSR0cOAQQNG0YdG0YLGgcZHQ0cRgEHRx1HKzAgIg4sJwUdIQ4BLTEHByYxHzg-EScKA1gOWkcLBwVGDRAJBRgEDUYcGg0eBxpGBREFAQsaBx4NGhsNRytFNwA-CiMFPQdcBgsbJAlFHFwOMT8dCQwsPh4QKgoaXjo5ITs-DRk4HjFHDAkcCUcCDx4cITgeH1AZBikxHh4hAFlcOwEZCQQZCRhZBgALIiI4IQcGWAM-Mi4P",
            fileName: "/newton.glb",
            behaviorModules: ["Rapier", "CradleLink"],
            cradleHandlesEvent: true, // To Add Movement Physics
            cradleProto: true, // Since GLB Exists
            noSave: true,
            shadow: true,
          });
          card.call("Rapier$RapierActor", "createRigidBody", bodyDesc);
          cd = Microverse.RAPIER.ColliderDesc.ball(1.95); // Radius
          cd.setMassProperties(10.0, {x: 0, y: 1, z: 0}, 0.0, 0.0);
        } 

        else { // Create Link
          card = this.createCard({
            name,
            translation,
            type: "object",
            parent: this,
            behaviorModules: ["Rapier", "CradleLink"],
            noSave: true,
            shadow: true,
          });
          card.call("Rapier$RapierActor", "createRigidBody", bodyDesc);
          if (i === 0) { cd = Microverse.RAPIER.ColliderDesc.cylinder(0.9, 0.1); } // Double Height (Gets Halved), Radius
          else { cd = Microverse.RAPIER.ColliderDesc.cylinder(5.9, 0.1);
            cd.setMassProperties(1.0, {x: 0, y: 4, z: 0}, 0.0, 0.0); }
        }

        cd.setTranslation(-30, 0, 0); // In Rapier World, Stop Pendulum and Cradle From Interracting
        cd.setRestitution(0.995);
        cd.setFriction(0.0);

        if (i === d - 1) { cd.setDensity(2.0); }
        else { cd.setDensity(8.0); }

        card.call("Rapier$RapierActor", "createCollider", cd);
        return card;

      });

      this.joints = [...Array(d - 1).keys()].map((i) => {

        let card = this.createCard({
          name: `cradlejoint${i}`,
          type: "object",
          parent: this,
          behaviorModules: ["Rapier"],
          noSave: true,
        });

        if (i === 0) { card.call("Rapier$RapierActor", "createImpulseJoint", "ball", this.links[i], this.links[i + 1], {x: 0, y: -1, z: 0}, {x: 0, y: 6, z: 0}); }
        else { card.call("Rapier$RapierActor", "createImpulseJoint", "ball", this.links[i], this.links[i + 1], {x: 0, y: -6, z: 0}, {x: 0, y: 2, z: 0}); }
        return card;

      });

      // let name = `cradlelink${d}`;
      // this.jointProto = this.createCard({
      //   name,
      //   type: "object",
      //   cradleProto: true,
      //   parent: this,
      //   behaviorModules: ["CradleLink"],
      // });

    });

  }

  removeObjects() {
    if (this.links) {
      this.links.forEach(l => l.destroy());
      this.links = null; 
    }  
    if (this.joints) {
      this.joints.forEach(j => j.destroy());
      this.joints = null; 
    }
  }

}

class CradlePawn {
  setup() {
      if (this.obj) {
          this.shape.children.forEach((o) => this.shape.remove(o));
          this.shape.children = [];
          this.obj.dispose();
          this.obj = null;
      }

      this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
      this.addEventListener("pointerDoubleDown", "nop");
  }
}

class CradleLinkActor {
  setup() { 
    if (this._cardData.cradleHandlesEvent) {
      this.addEventListener("pointerTap", "startMove");
    }
  }

  startMove(p3d) { // Starts Cradle Motion
    if (!p3d.normal) { return; }
    let r = this.rigidBody;
    if (!r) { return; }
    if (p3d.normal[2] <= 0) { r.applyForce({x: 0, y: 0, z: -15000}, true); }
    else { r.applyForce({x: 0, y: 0, z: 15000}, true); }
  }

  teardown() {
    this.removeEventListener("pointerTap", "startMove");
  }
}

class CradleLinkPawn {
  setup() {
      this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
      this.addEventListener("pointerDoubleDown", "nop");

      if (this.actor._cardData.cradleProto) { return; }
      this.shape.children.forEach((c) => this.shape.remove(c));
      this.shape.children = [];

      let s;
      if (this.actor._name === "cradlelink0") { s = [0.1, 2.3]; }
      else { s = [0.1, 12.3]; }

      let geometry = new Microverse.THREE.CylinderGeometry(s[0], s[0], s[1], 20);
      let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0x000000});
      this.obj = new Microverse.THREE.Mesh(geometry, material);
      this.obj.castShadow = this.actor._cardData.shadow;
      this.obj.receiveShadow = this.actor._cardData.shadow;

      this.shape.add(this.obj);
  }
}

/* Two behavior modules are exported from this file. */

export default {
  modules: [
    {
      name: "Cradle",
      actorBehaviors: [CradleActor],
      pawnBehaviors: [CradlePawn]
    },
    {
      name: "CradleLink",
      actorBehaviors: [CradleLinkActor],
      pawnBehaviors: [CradleLinkPawn]
    },
  ]
}

/* globals Microverse */
