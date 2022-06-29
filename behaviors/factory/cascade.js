/*
  This Behavior for Actor creates a rigid body and a collider based on
  rapierShape, rapierForce, and raperType properties, and add it to
  the rapier-based simulation.

  For information on Rapier, refer to this page:
  https://rapier.rs/docs/user_guides/javascript/getting_started_js

  Rapier provides bit-identical physical simulation so we use it on the Model/Actor side of Croquet.
*/

class CascadeActor {
    setup() {
        /*
          variable kinematic is initialized based on rapierType and
          calls another behavior (Rapier)'s createRigidBoy method,
          which in turn calls Rapier's method of the same name.

          Variable RAPIER contains all exports from the rapier
          packages. It is prefixed with Microverse, which is the only
          global variable visible to behavior code.
        */
        let kinematic;
        let rapierType = this._cardData.rapierType;
        let rapierShape = this._cardData.rapierShape;
        let rapierSensor = this._cardData.rapierSensor;
        let rapierForce = this._cardData.rapierForce;
        if (rapierType === "positionBased") {
            kinematic = Microverse.RAPIER.RigidBodyDesc.newKinematicPositionBased();
        } else if (rapierType === "static") {
            kinematic = Microverse.RAPIER.RigidBodyDesc.newStatic();
        } else {
            kinematic = Microverse.RAPIER.RigidBodyDesc.newDynamic();
        }
        this.call("Rapier$RapierActor", "createRigidBody", kinematic);

        /*
          variable cd (collider description) is initialized based on rapierShape and rapierSize,
          and it is used for a call to createCollider.

          The ColliderDesc of Rapier tends to take the half-size;
          ex. [0.5, 0.5, 0.5] makes a [1, 1, 1] cube.
        */

        let cd;
        if (rapierShape === "ball") {
            let s = this._cardData.rapierSize || 1;
            s = s / 2;
            cd = Microverse.RAPIER.ColliderDesc.ball(s);
        } else if (rapierShape === "cuboid") {
            let s = this._cardData.rapierSize || [1, 1, 1];
            s = [s[0] / 2, s[1] / 2, s[2] / 2];
            cd = Microverse.RAPIER.ColliderDesc.cuboid(...s);
        }
        /*else if (rapierShape === "cylinder") {
            let s = this._cardData.rapierSize || [1, 1];
            s = [s[1] / 2, s[0]];
            cd = Microverse.RAPIER.ColliderDesc.cylinder(...s);
        }*/

        /*
          Uncomment above shape === "cylinder" section to add cylinder type.
        */

        cd.setRestitution(this._cardData.rapierRestitution || 0.4);
        cd.setFriction(this._cardData.rapierFriction || 0.8);
        cd.setDensity(this._cardData.rapierDensity || 1.5);

        /*
          rapierSensor here adds intersectionEventHandler. Note that
          this code (cascade.js) is in the user land; if you need to
          have contactEventHandler for your application, you can
          simply add it here.
        */

        if (rapierSensor) {
            this.registerIntersectionEventHandler("intersection");
            cd.setSensor(true);
            cd.setActiveEvents(Microverse.RAPIER.ActiveEvents.CONTACT_EVENTS |
                               Microverse.RAPIER.ActiveEvents.INTERSECTION_EVENTS);
        }
        this.collider = this.call("Rapier$RapierActor", "createCollider", cd);

        /*
          If this is a regular moving object, add an event handler for pointerTap to invoke
           the jolt method.
        */

        if (!rapierType) {
            this.addEventListener("pointerTap", "jolt");
        }

        /*
          If the card spec has an initial rapierForce, put some force upon creation.
        */

        if (rapierForce) {
            this.rigidBody.applyForce(rapierForce);
        }

        /*
          All movement of an object triggers "translating" event, and
          it invokes the translated() method to implement the 'kill
          plane'.
        */
        this.listen("translating", "translated");
    }

    jolt() {
        // Apply an upward force and random spin.
        let r = this.rigidBody;
        if (r) {
            r.applyForce({x: 0, y: 2, z: 0}, true);
            r.applyTorque({x: Math.random() * 0.01, y: Math.random() * 0.2, z: Math.random() * 0.01}, true);
        }
    }

    translated() {
        /*
          if this object fell below, it kills itself.
          destroy() is a method of the base CardActor. It invokes all destroy() methods of attached
          behaviors. The Rapier behavior removes the rigidBody from the Rapier world.
        */
        if (this._translation[1] < -10) {
            this.destroy();
        }
    }

    registerIntersectionEventHandler(methodName) {
        /*
          The CardActor has a method that invokes a behavior's method based on
          `intersectionEventHandlerBehavior` and `intersectionEventHandlerMethod` values.
          In this example, this is called from the above 'rapierSensor' case.
        */
        let behavior = this._behavior;
        let physicsManager = this.service("RapierPhysicsManager");
        this.intersectionEventHandlerBehavior = `${behavior.module.name}$${behavior.$behaviorName}`;
        this.intersectionEventHandlerMethod = methodName;
        physicsManager.registerIntersectionEventHandler(this._target);
    }

    registerContactEventHandler(methodName) {
        /*
          The CardActor has a method that invokes a behavior's method based on
          `contactEventHandlerBehavior` and `contactEventHandlerMethod` values.
          this method is not used in this example but defined here for illustration purposes.
        */
        let behavior = this._behavior;
        let physicsManager = this.service("RapierPhysicsManager");
        this.contactEventHandlerBehavior = `${behavior.module.name}$${behavior.$behaviorName}`;
        this.contactEventHandlerMethod = methodName;
        physicsManager.registerContactEventHandler(this._target);
    }

    intersection(card1, card2, intersecting) {
        /*
          With above set up This method will be called when two
          rigidbodies, with at least one collider description with
          active events intersects.
        */
        console.log(card1, card2, intersecting);
        if (!intersecting) {return;}
        if (card1.id !== this.id) {
            card1.destroy();
        }
        if (card2.id !== this.id) {
            card2.destroy();
        }
    }
}

class CascadePawn {
    setup() {
        /*
          Creates a Three.JS mesh based on the specified rapierShape and rapierSize.

          For a demo purpose, it does not override an existing shape
          (by checking this.shape.children.length) so that the earth
          shape created by FlightTracker behavior is preserved.

          Uncomment the cyclinder case to add the cylinder shape.

        */

        // this.shape.children.forEach((c) => this.shape.remove(c));
        // this.shape.children = [];

        if (this.shape.children.length === 0) {
            let rapierShape = this.actor._cardData.rapierShape;
            if (rapierShape === "ball") {
                let s = this.actor._cardData.rapierSize || 1;
                let geometry = new Microverse.THREE.SphereGeometry(s / 2, 32, 16);
                let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Microverse.THREE.Mesh(geometry, material);
                this.obj.castShadow = this.actor._cardData.shadow;
                this.obj.receiveShadow = this.actor._cardData.shadow;
            } else if (rapierShape === "cuboid") {
                let s = this.actor._cardData.rapierSize || [1, 1, 1];
                let geometry = new Microverse.THREE.BoxGeometry(...s);
                let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Microverse.THREE.Mesh(geometry, material);
                this.obj.castShadow = this.actor._cardData.shadow;
                this.obj.receiveShadow = this.actor._cardData.shadow;
            }
            /*else if (rapierShape === "cylinder") {
                let s = this.actor._cardData.rapierSize || [1, 1];
                let geometry = new Microverse.THREE.CylinderGeometry(s[0], s[0], s[1], 20);
                let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Microverse.THREE.Mesh(geometry, material);
                this.obj.castShadow = this.actor._cardData.shadow;
                this.obj.receiveShadow = this.actor._cardData.shadow;
            }*/
            this.shape.add(this.obj);
        }
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

/*
  This is used for the cube that sits above the inclined plane. It
  calls spray() in a future loop at a 500 millisecond interval, and
  create a new card by calling createCard().
*/
class SprayActor {
    setup() {
        /*

          Because of the life cycle of a behavior that means that the
          setup() may be called multiple times on the same card, we tend to guard a property initialization with a conditional like this.
        */
        if (this.running === undefined) {
            this.running = true;
            this.spray();
        }
        /*
          you can start and stop spray() loop by clicking the cube.
        */
        this.addEventListener("pointerDown", "toggle");
    }

    randomColor() {
        let h = Math.random();
        let s = 0.8;
        let v = 0.8;
        let r, g, b, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return ((Math.round(r * 255) << 16) +
                (Math.round(g * 255) << 8) +
                Math.round(b * 255))
    }

    spray() {
        if (!this.running) {return;}
        this.future(500).spray();

        /*
          For the demo purpose, we deine the demo in the global
        coordinates. For a more controll example would add cards to an
        owner card.
        */

        let t = this.translation;

        const bt = [t[0], t[1] - 0.2, t[2]]; // bt for base translation

        let r = Math.random() * Math.PI * 2;
        let x = Math.cos(r) * 0.2;
        let z = Math.sin(r) * 0.2;
        let shape;
        let size;
        let density;

        let dice = Math.random();

        if (dice < 0.01) {
            /*
              The FlightTracker behavior is used, but without the "Elected" behavior, it does not start fetching the live data. It is used solely to create the Earth appearance.
            */
            this.createCard({
                name:"earth",
                type: "object",
                translation: bt,
                layers: ["pointer"],
                scale: [0.1, 0.1, 0.1],
                behaviorModules: ["Rapier", "Earth", "Cascade"],
                rapierSize: 0.8,
                rapierShape: "ball",
                rapierForce: {x, y: 0, z},
                density: 2,
                shadow: true,
            });
            return;
        }

        let color = this.randomColor();

        if (dice < 0.4) {
            shape = "cuboid";
            size = [0.2, 0.2, 0.2];
            density: 0.5;
            /*
              uncomment to add cylinder to the simulation.
            */
            /* } else if (dice < 0.7) {
            shape = "cylinder";
            size = [0.2, 0.2];
            */
        } else {
            shape = "ball";
            size = 0.4;
            density = 1.5;
            x *= 5;
            z *= 5;
        }

        this.createCard({
            type: "object",
            layers: ["pointer"],
            translation: bt,
            behaviorModules: ["Rapier", "Cascade"],
            rapierSize: size,
            rapierForce: {x, y: 0, z},
            rapierShape: shape,
            rapierDensity: density,
            color: color,
            shadow: true,
        });
    }

    toggle() {
        this.running = !this.running;
        if (this.running) {
            this.spray();
        }
    }
}

class SprayPawn {
    setup() {
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        if (this.shape.children.length === 0) {
            let s = 0.2;
            let geometry = new Microverse.THREE.BoxGeometry(s, s, s);
            let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
            this.obj = new Microverse.THREE.Mesh(geometry, material);
            this.obj.castShadow = this.actor._cardData.shadow;
            this.obj.receiveShadow = this.actor._cardData.shadow;
            this.shape.add(this.obj);
        }
    }
}

/*
  Two behavior modules are exported from this file.  See worlds/default.js for their use.
*/
export default {
    modules: [
        {
            name: "Cascade",
            actorBehaviors: [CascadeActor],
            pawnBehaviors: [CascadePawn]
        },
        {
            name: "Spray",
            actorBehaviors: [SprayActor],
            pawnBehaviors: [SprayPawn],
        }
    ]
}

/* globals Microverse */

