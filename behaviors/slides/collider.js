class ColliderActor {
    setup() {
        let kinematic;
        let rapierType = this._cardData.rapierType;
        if (rapierType === "positionBased") {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newKinematicPositionBased();
        } else if (rapierType === "static") {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newStatic();
        } else {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newDynamic();
        }
        this.call("Rapier$RapierActor", "createRigidBody", kinematic);
        let s = this._cardData.rapierSize || [1, 1, 1];
        s = [s[0] / 2, s[1] / 2, s[2] / 2];
        let cd = Worldcore.RAPIER.ColliderDesc.cuboid(...s);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(1.5);
        this.call("Rapier$RapierActor", "createCollider", cd);
    }
}

class ColliderPawn {
    setup() {
        if (this.shape.children.length === 0) {
            let extent = this.actor._cardData.rapierSize || [1, 1, 1];
            let geometry = new Worldcore.THREE.BoxGeometry(...extent);
            let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
            this.cube = new Worldcore.THREE.Mesh(geometry, material);
            this.shape.add(this.cube);
        }
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

