class ColliderActor {
    setup() {
        let kinematic;
        let rapierType = this._cardData.rapierType;
        let rapierShape = this._cardData.rapierShape;
        if (rapierType === "positionBased") {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newKinematicPositionBased();
        } else if (rapierType === "static") {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newStatic();
        } else {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newDynamic();
        }
        this.call("Rapier$RapierActor", "createRigidBody", kinematic);

        let cd;
        if (rapierShape === "ball") {
            let s = this._cardData.rapierSize || 1;
            s = s / 2;
            cd = Worldcore.RAPIER.ColliderDesc.ball(s);
        } else if (rapierShape === "cuboid") {
            let s = this._cardData.rapierSize || [1, 1, 1];
            s = [s[0] / 2, s[1] / 2, s[2] / 2];
            cd = Worldcore.RAPIER.ColliderDesc.cuboid(...s);
        }
        cd.setRestitution(this._cardData.rapierRestitution || 0.5);
        cd.setFriction(this._cardData.rapierFriction || 1);
        cd.setDensity(this._cardData.rapierDensity || 1.5);
        this.call("Rapier$RapierActor", "createCollider", cd);

        this.addEventListener("pointerTap", "jolt");
        this.listen("translating", "translated");
    }

    jolt() {
        let r = this.rigidBody;
        if (r) {
            r.applyForce({x: 0, y: 400, z: 2}, true);
            r.applyTorque({x: Math.random() * 50.0, y: Math.random() * 500, z: Math.random() * 50}, true);
        }
    }

    translated() {
        // may not be a very efficient way to detect it
        if (this._translation[1] < -1000) {
            this.destroy();
        }
    }
}

class ColliderPawn {
    setup() {
        if (this.shape.children.length === 0) {
            let rapierShape = this.actor._cardData.rapierShape;
            if (rapierShape === "ball") {
                let s = this.actor._cardData.rapierSize || 1;
                let geometry = new Worldcore.THREE.SphereGeometry(s / 2, 32, 16);
                let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Worldcore.THREE.Mesh(geometry, material);
            } else if (rapierShape === "cuboid") {
                let s = this.actor._cardData.rapierSize || [1, 1, 1];
                let geometry = new Worldcore.THREE.BoxGeometry(...s);
                let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Worldcore.THREE.Mesh(geometry, material);
            }
            this.shape.add(this.obj);
        }
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

export default {
    modules: [
        {
            name: "Collider",
            actorBehaviors: [ColliderActor],
            pawnBehaviors: [ColliderPawn]
        }
    ]
}

/* globals Worldcore */

