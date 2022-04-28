class RapierActor {
    destroy() {
        this.removeRigidBody();
    }

    getRigidBody() {
        if (!this.$rigidBody) {
            if (this.rigidBodyHandle === undefined) return undefined;
            const physicsManager =  this.service('RapierPhysicsManager');
            this.$rigidBody = physicsManager.world.getRigidBody(this.rigidBodyHandle);
        }
        return this.$rigidBody;
    }

    createRigidBody(rbd) {
        this.removeRigidBody();
        rbd.translation = new Worldcore.RAPIER.Vector3(...this.translation);
        rbd.rotation = new Worldcore.RAPIER.Quaternion(...this.rotation);
        const physicsManager =  this.service('RapierPhysicsManager');
        this.$rigidBody = physicsManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = this.$rigidBody.handle;
        physicsManager.rigidBodies[this.rigidBodyHandle] = this._target;

        if (this.getRigidBody().bodyType() === Worldcore.RAPIER.RigidBodyType.KinematicPositionBased) {
            this.listen("setTranslation", "Rapier$RapierActor.setKinematicTranslation");
            this.listen("setRotation", "Rapier$RapierActor.setKinematicRotation");
            this.listen("moveTo", "Rapier$RapierActor.setKinematicTranslation");
            this.listen("rotateTo", "Rapier$RapierActor.setKinematicRotation");
        }
    }

    setKinematicTranslation(v) {
        this.getRigidBody().setNextKinematicTranslation(new Worldcore.RAPIER.Vector3(...v));
    }
    setKinematicRotation(q) {
        this.getRigidBody().setNextKinematicRotation(new Worldcore.RAPIER.Quaternion(...q));
    }

    removeRigidBody() {
        if (!this.getRigidBody()) return;
        const physicsManager = this.service('RapierPhysicsManager');
        physicsManager.rigidBodies[this.rigidBodyHandle] = undefined;
        physicsManager.world.removeRigidBody(this.getRigidBody());
        this.rigidBodyHandle = undefined;
        this.$rigidBody = undefined;
    }

    createCollider(cd) {
        const physicsManager = this.service('RapierPhysicsManager');
        const c = physicsManager.world.createCollider(cd, this.rigidBodyHandle);
        return c.handle;
    }
}

export default {
    modules: [
        {
            name: "Rapier",
            pawnBehaviors: [RapierActor]
        }
    ]
}

/* globals Worldcore */

