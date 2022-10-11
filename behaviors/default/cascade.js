/*
  This Behavior for Actor creates a rigid body and a collider based on
  physicsShape, physicsForce, and physicsType properties, and add it to
  the Rapier engine based physics simulation.

  For information on Rapier, refer to this page:
  https://rapier.rs/docs/user_guides/javascript/getting_started_js

  Rapier provides bit-identical physical simulation so we use it on the Model/Actor side of Croquet.
*/

class CascadeBoxActor {
    setup() {
        if (!this.physicsWorld) {
            let physicsManager = this.service("PhysicsManager");
            console.log("new physics world for cascade");
            this.setPhysicsWorld(physicsManager.createWorld({timeStep: 20}, this.id));
        }

        this.removeObjects();

        this.base1 = this.createCard({
            name:"base",
            type: "object",
            layers: ["pointer", "walk"],
            behaviorModules: ["Physics", "Cascade"],
            rotation: [0.5, 0, 0],
            physicsSize: [5, 0.3, 3.5],
            color: 0x997777,
            physicsShape: "cuboid",
            physicsType: "positionBased",
            shadow: true,
            parent: this,
        });

        this.base2 = this.createCard({
            name:"base 2",
            type: "object",
            layers: ["pointer", "walk"],
            behaviorModules: ["Physics", "Cascade"],
            translation: [0, -1.65, 3.8],
            rotation: [0.28, 0, 0],
            physicsSize: [5, 0.3, 3.5],
            color: 0x997777,
            physicsShape: "cuboid",
            physicsType: "positionBased",
            shadow: true,
            parent: this,
        });

        this.spray = this.createCard({
            name:"spray",
            type: "object",
            layers: ["pointer"],
            translation: [0, 2, 0],
            behaviorModules: ["Spray"],
            color: 0xcccccc,
            shadow: true,
            parent: this,
        });
    }

    removeObjects() {
        if (this.children) {
            [...this.children].forEach((c) => c.destroy());
        }
    }

    removePhysics() {
        if (this.physicsWorld) {
            this.physicsWorld.destroy();
        }
    }

    teardown() {
        this.removeObjects();
        this.removePhysics();
    }
}

class CascadeActor {
    setup() {
        /*
          variable kinematic is initialized based on physicsType and
          calls another behavior's (Physics) createRigidBoy method,
          which in turn calls Physics behavior method of the same name.

          Variable Microverse.Physics contains all exports from the Rapier
          packages. It is prefixed with Microverse, which is the only
          global variable visible to behavior code.
        */
        let kinematic;
        let physicsType = this._cardData.physicsType;
        let physicsShape = this._cardData.physicsShape;
        let physicsSensor = this._cardData.physicsSensor;
        let physicsForce = this._cardData.physicsForce;
        if (physicsType === "positionBased") {
            kinematic = Microverse.Physics.RigidBodyDesc.newKinematicPositionBased();
        } else if (physicsType === "static") {
            kinematic = Microverse.Physics.RigidBodyDesc.newStatic();
        } else {
            kinematic = Microverse.Physics.RigidBodyDesc.newDynamic();
        }
        this.call("Physics$PhysicsActor", "createRigidBody", kinematic);

        /*
          variable cd (collider description) is initialized based on physicsShape and physicsSize,
          and it is used for a call to createCollider.

          The ColliderDesc of Rapier tends to take the half-size;
          ex. [0.5, 0.5, 0.5] makes a [1, 1, 1] cube.
        */

        let cd;
        if (physicsShape === "ball") {
            let s = this._cardData.physicsSize || 1;
            s = s / 2;
            cd = Microverse.Physics.ColliderDesc.ball(s);
        } else if (physicsShape === "cuboid") {
            let s = this._cardData.physicsSize || [1, 1, 1];
            s = [s[0] / 2, s[1] / 2, s[2] / 2];
            cd = Microverse.Physics.ColliderDesc.cuboid(...s);
        }
        /*else if (physicsShape === "cylinder") {
            let s = this._cardData.physicsSize || [1, 1];
            s = [s[1] / 2, s[0]];
            cd = Microverse.Physics.ColliderDesc.cylinder(...s);
        }*/

        /*
          Uncomment above shape === "cylinder" section to add cylinder type.
        */

        cd.setRestitution(this._cardData.physicsRestitution || 0.4);
        cd.setFriction(this._cardData.physicsFriction || 0.8);
        cd.setDensity(this._cardData.physicsDensity || 1.5);

        /*
          physicsSensor here adds intersectionEventHandler. Note that
          this code (cascade.js) is in the user land; if you need to
          have contactEventHandler for your application, you can
          simply add it here.
        */

        if (physicsSensor) {
            this.registerCollisionEventHandler("intersection");
            cd.setSensor(true);
            cd.setActiveEvents(Microverse.Physics.ActiveEvents.CONTACT_EVENTS |
                               Microverse.Physics.ActiveEvents.INTERSECTION_EVENTS);
        }

        this.call("Physics$PhysicsActor", "createCollider", cd);

        /*
          If this is a regular moving object, add an event handler for pointerTap to invoke
           the jolt method.
        */

        if (!physicsType) {
            this.addEventListener("pointerTap", "jolt");
        }

        /*
          If the card spec has an initial physicsForce, put some force upon creation.
        */

        if (physicsForce) {
            if (!this.initialImpulseApplied) {
                this.initialImpulseApplied = true;
                this.rigidBody.applyImpulse(physicsForce);
            }
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
            r.applyImpulse({x: 0, y: 0.1, z: 0}, true);
            r.applyTorqueImpulse({x: Math.random() * 0.01 - 0.005, y: 0, z: Math.random() * 0.01 - 0.005}, true);
        }
    }

    translated() {
        /*
          if this object fell below, it kills itself.
          destroy() is a method of the base CardActor. It invokes all teardown() methods of attached
          behaviors. The Physics behavior removes the rigidBody from the Rapier world.
        */
        if (this._translation[1] < -10) {
            this.destroy();
        }
    }

    registerCollisionEventHandler(methodName) {
        /*
          The CardActor has a method that invokes a behavior's method based on
          `intersectionEventHandlerBehavior` and `intersectionEventHandlerMethod` values.
          In this example, this is called from the above 'physicsSensor' case.
        */
        let behavior = this._behavior;
        let physicsWorld = this.physicsWorld();
        this.collisionEventHandlerBehavior = `${behavior.module.name}$${behavior.$behaviorName}`;
        this.collisionEventHandlerMethod = methodName;
        physicsWorld.registerCollisionEventHandler(this._target);
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
          Creates a Three.JS mesh based on the specified physicsShape and physicsSize.

          For a demo purpose, it does not override an existing shape
          (by checking this.shape.children.length) so that the earth
          shape created by Earth behavior is preserved.

          Uncomment the cyclinder case to add the cylinder shape.

        */

        // [...this.shape.children].forEach((c) => this.shape.remove(c));

        if (this.shape.children.length === 0) {
            let physicsShape = this.actor._cardData.physicsShape;
            if (physicsShape === "ball") {
                let s = this.actor._cardData.physicsSize || 1;
                let geometry = new Microverse.THREE.SphereGeometry(s / 2, 32, 16);
                let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Microverse.THREE.Mesh(geometry, material);
                this.obj.castShadow = this.actor._cardData.shadow;
                this.obj.receiveShadow = this.actor._cardData.shadow;
            } else if (physicsShape === "cuboid") {
                let s = this.actor._cardData.physicsSize || [1, 1, 1];
                let geometry = new Microverse.THREE.BoxGeometry(...s);
                let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Microverse.THREE.Mesh(geometry, material);
                this.obj.castShadow = this.actor._cardData.shadow;
                this.obj.receiveShadow = this.actor._cardData.shadow;
            }
            /*else if (physicsShape === "cylinder") {
                let s = this.actor._cardData.physicsSize || [1, 1];
                let geometry = new Microverse.THREE.CylinderGeometry(s[0], s[0], s[1], 20);
                let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Microverse.THREE.Mesh(geometry, material);
                this.obj.castShadow = this.actor._cardData.shadow;
                this.obj.receiveShadow = this.actor._cardData.shadow;
            }*/
            this.shape.add(this.obj);
        }

        if (this.actor.layers.includes("walk")) {
            this.constructCollider(this.obj);
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
        let x = Math.cos(r) * 0.02;
        let z = Math.sin(r) * 0.02;
        let shape;
        let size;
        let density;

        let dice = Math.random();

        if (dice < 0.01) {
            x *= 20;
            z *= 20;
            this.createCard({
                name:"earth",
                type: "object",
                translation: bt,
                layers: ["pointer"],
                scale: [0.1, 0.1, 0.1],
                behaviorModules: ["Physics", "Earth", "Cascade"],
                physicsSize: 0.8,
                physicsShape: "ball",
                physicsForce: {x, y: 0, z},
                density: 2,
                parent: this.parent,
                shadow: true,
            });
            return;
        }

        let color = this.randomColor();

        if (dice < 0.4) {
            shape = "cuboid";
            size = [0.2, 0.2, 0.2];
            density: 1.5;
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
            density = 4;
            x *= 10;
            z *= 10;
        }

        this.createCard({
            type: "object",
            layers: ["pointer"],
            translation: bt,
            behaviorModules: ["Physics", "Cascade"],
            physicsSize: size,
            physicsForce: {x, y: 0, z},
            physicsShape: shape,
            physicsDensity: density,
            color: color,
            parent: this.parent,
            shadow: true,
        });
    }

    toggle() {
        this.running = !this.running;
        if (this.running) {
            this.spray();
        }
    }

    teardown() {
        this.running = false;
    }
}

class SprayPawn {
    setup() {
        [...this.shape.children].forEach((c) => this.shape.remove(c));

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
            name: "CascadeBox",
            actorBehaviors: [CascadeBoxActor],
        },
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
