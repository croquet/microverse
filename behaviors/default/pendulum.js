class PendulumActor {
    setup() {
        let d = 10;

        if (!this.physicsWorld) {
            let physicsManager = this.service("PhysicsManager");
            console.log("new physics world for pendulum");
            this.setPhysicsWorld(physicsManager.createWorld({timeStep: 30, gravity: [0, -4, 0]}, this.id));
        }
        this.removeObjects();
        this.links = [...Array(d).keys()].map((i) => {
            let kinematic;
            if (i === 0) {
                kinematic = Microverse.Physics.RigidBodyDesc.newKinematicPositionBased();
            } else {
                kinematic = Microverse.Physics.RigidBodyDesc.newDynamic();
            }

            let card;
            let translation = [0, 0 - i * 2.03, 0];
            let name = `link${i}`;
            if (i === d - 1) {
                card = this.createCard({
                    type: "3d",
                    dataLocation: "3_EGjDfsBvE93taoFG1Uq6hS6MtH_JMHT33IaSwpij0gR1tbX1wVAABJRkNKXAFaXAFMXUBeWkpbAUZAAFoAaEt5TVZDZlxuRH5MbXdLHGhXTllWWHpkeHZ2HQBGQAFMXUBeWkpbAUJGTF1AWUpdXEoATHBmAldHRFZ5Wn9NYnpJSktgZVpESmRBRHt2YW1fYnV4W3gZXh1iRGQeegBLTltOAF1ment6SR0dQGhFHhhZfE1KYxdeGm12d1dCVUldf3pYaEoWRFoaSVlZF2I",
                    dataScale: [3.0603576962481323, 3.0603576962481323, 3.0603576962481323],
                    modelType: "glb",
                    translation,
                    name,
                    parent: this,
                    pendulumProto: true,
                    behaviorModules: ["Physics", "PendulumLink"],
                    noSave: true,
                });
            } else {
                card = this.createCard({
                    type: "object",
                    translation,
                    name,
                    color: this._cardData.color,
                    parent: this,
                    behaviorModules: ["Physics", "PendulumLink"],
                    noSave: true,
                });
            }
            card.call("Physics$PhysicsActor", "createRigidBody", kinematic);

            let s = [0.1, 1];
            s = [s[1] / 2, s[0]];
            let cd = Microverse.Physics.ColliderDesc.cylinder(...s);

            cd.setRestitution(0.5);
            cd.setFriction(1);

            if (i === d - 1) {
                cd.setDensity(1);
            } else {
                cd.setDensity(0.03);
            }

            card.call("Physics$PhysicsActor", "createCollider", cd);
            return card;
        });

        this.joints = [...Array(d - 1).keys()].map((i) => {
            let card = this.createCard({
                type: "object",
                name: `joint${i}`,
                parent: this,
                behaviorModules: ["Physics"],
                noSave: true,
            });
            card.call(
                "Physics$PhysicsActor", "createImpulseJoint", "ball", this.links[i], this.links[i + 1],
                {x: 0, y: -1, z: 0}, {x: 0, y: 1, z: 0}
            );
            // card.future(3000).destroy();
            return card;
        });

        this.jointProto = this.createCard({
            type: "object",
            name,
            pendulumProto: true,
            parent: this,
            behaviorModules: ["PendulumLink"],
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

class PendulumPawn {
    setup() {
        if (this.obj) {
            this.shape.children.forEach((o) => this.shape.remove(o));
            this.shape.children = [];
            this.obj.dispose();
            this.obj = null;
        }

        let geometry = new Microverse.THREE.BoxGeometry(0.5, 0.5, 0.5);
        let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xee8888});
        this.obj = new Microverse.THREE.Mesh(geometry, material);
        this.obj.castShadow = this.actor._cardData.shadow;
        this.obj.receiveShadow = this.actor._cardData.shadow;

        this.shape.add(this.obj);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

class PendulumLinkActor {
    setup() {
        this.addEventListener("pointerTap", "jolt");
    }

    jolt(p3d) {
        // Apply an upward force and random spin.
        if (!p3d.normal) {return;}
        let r = this.rigidBody;
        if (!r) {return;}

        let jolt = Microverse.v3_scale(p3d.normal, -0.03);
        r.applyImpulse({x: jolt[0], y: jolt[1], z: jolt[2]}, true);
    }
}

class PendulumLinkPawn {
    setup() {
        /*
          For a demo purpose, it does not override an existing shape
          (by checking this.shape.children.length) so that the earth
          shape created by FlightTracker behavior is preserved.

          Uncomment the cyclinder case to add the cylinder shape.

        */
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");

        if (this.actor._cardData.pendulumProto) {return;}
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        let s = [0.1, 2.3];
        let geometry = new Microverse.THREE.CylinderGeometry(s[0], s[0], s[1], 20);
        let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xcccccc, metalness: 0.6});
        this.obj = new Microverse.THREE.Mesh(geometry, material);
        this.obj.castShadow = this.actor._cardData.shadow;
        this.obj.receiveShadow = this.actor._cardData.shadow;

        this.shape.add(this.obj);
    }
}

export default {
    modules: [
        {
            name: "Pendulum",
            actorBehaviors: [PendulumActor],
            pawnBehaviors: [PendulumPawn]
        },
        {
            name: "PendulumLink",
            actorBehaviors: [PendulumLinkActor],
            pawnBehaviors: [PendulumLinkPawn]
        }
    ]
}

/* globals Microverse */
