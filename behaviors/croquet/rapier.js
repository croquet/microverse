/*

  This is a wrapper to call Rapier features. It is expected to be used
  a user-defined behavior module that creates a rigid body and a
  collider description. (see behaviors/default/cascade.js for an
  example.)
*/

class RapierActor {
    destroy() {
        this.removeRigidBody();
    }

    getRigidBody() {
        /*
          A "dollar-property" is a special model-side property naming
          convention which excludes the data to be stored in the
          snapshot.  In this case, rigidBody contains handles into the
          WASM based physics engine session and it cannot be
          transported to another computer.

          When a user joins an existing session, the snapshot will not
          contain this.$rigidBody. So it is lazily initialized when it
          is accessed.

          The implementation of RapierPhysicsManager is in Worldcore:

          https://github.com/croquet/worldcore/blob/main/packages/rapier/src
        */

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

        /*
          Those events are handled so that when a position-based object
          was moved from the user program, the object's position and
          rotatino in the simulation are updated.
        */
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

