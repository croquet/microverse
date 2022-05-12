class PendulumActor {
    setup() {
        let d = 10;
        this.removeObjects();
        this.links = [...Array(d).keys()].map((i) => {
            let kinematic;
            if (i === d - 1) {
                kinematic = Worldcore.RAPIER.RigidBodyDesc.newKinematicPositionBased();
            } else {
                kinematic = Worldcore.RAPIER.RigidBodyDesc.newDynamic();
            }
            let card = this.createCard({
                type: "object",
                translation: [0, i * 2.5, -10],
                name: `link${i}`,
                behaviorModules: ["Rapier", "PendulumLink"],
            });
            card.call("Rapier$RapierActor", "createRigidBody", kinematic);

            let s = [1, 2, 1];
            s = [s[0] / 2, s[1] / 2, s[2] / 2];
            let cd = Worldcore.RAPIER.ColliderDesc.cuboid(...s);

            cd.setRestitution(0.5);
            cd.setFriction(1);
            cd.setDensity(1.5);

            card.call("Rapier$RapierActor", "createCollider", cd);
            return card;
        });

        this.joints = [...Array(d - 1).keys()].map((i) => {
            let card = this.createCard({
                type: "object",
                name: `joint${i}`,
                behaviorModules: ["Rapier", "PendulumJoint"],
            });
            card.call(
                "Rapier$RapierActor", "createImpulseJoint", "ball", this.links[i], this.links[i + 1],
                {x: 0, y: 1, z: 0}, {x: 0, y: -1, z: 0}
            );
            // card.future(3000).destroy();
            return card;
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

class PendulumLinkActor {
    setup() {
        this.addEventListener("pointerTap", "jolt");
    }

    jolt() {
        // Apply an upward force and random spin.
        let r = this.rigidBody;
        if (r) {
            r.applyForce({x: 400, y: 0, z: 0}, true);
            // r.applyTorque({x: Math.random() * 50, y: Math.random() * 20, z: Math.random() * 50}, true);
        }
    }
}

class PendulumLinkPawn {
    setup() {
        /*
          Creates a Three.JS mesh based on the specified rapierShape and rapierSize.

          For a demo purpose, it does not override an existing shape
          (by checking this.shape.children.length) so that the earth
          shape created by FlightTracker behavior is preserved.

          Uncomment the cyclinder case to add the cylinder shape.

        */
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        let s = [1, 2, 1];
        let geometry = new Worldcore.THREE.BoxGeometry(...s);
        let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
        this.obj = new Worldcore.THREE.Mesh(geometry, material);
        this.obj.castShadow = this.actor._cardData.shadow;
        this.obj.receiveShadow = this.actor._cardData.shadow;

        this.shape.add(this.obj);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

class PendulumJointPawn {
    setup() {
        /*
          Creates a Three.JS mesh based on the specified rapierShape and rapierSize.

          For a demo purpose, it does not override an existing shape
          (by checking this.shape.children.length) so that the earth
          shape created by FlightTracker behavior is preserved.

          Uncomment the cyclinder case to add the cylinder shape.

        */

        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        let s = [1, 1, 1];
        let geometry = new Worldcore.THREE.BoxGeometry(...s);
        let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
        this.obj = new Worldcore.THREE.Mesh(geometry, material);
        this.obj.castShadow = this.actor._cardData.shadow;
        this.obj.receiveShadow = this.actor._cardData.shadow;

        this.shape.add(this.obj);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

export default {
    modules: [
        {
            name: "Pendulum",
            actorBehaviors: [PendulumActor]
        },
        {
            name: "PendulumLink",
            actorBehaviors: [PendulumLinkActor],
            pawnBehaviors: [PendulumLinkPawn]
        },
        {
            name: "PendulumJoint",
            pawnBehaviors: [PendulumJointPawn]
        }
    ]
}

/* globals Worldcore */
