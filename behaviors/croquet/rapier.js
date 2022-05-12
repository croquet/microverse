// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

/*

  This is a wrapper to call Rapier features. It is expected to be used
  a user-defined behavior module that creates a rigid body and a
  collider description. (see behaviors/default/cascade.js for an
  example.)
*/

class RapierActor {
    destroy() {
        this.removeCollider();
        this.removeRigidBody();
        this.removeImpulseJoint();
    }

    getRigidBody() {
        /*
          A "dollar-property" is a special model-side property naming
          convention which excludes the data to be stored in the
          snapshot. In this case, rigidBody is a cache to hold onto
          the rigidBody object.

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
        let r = this.getRigidBody();
        if (!r) return;
        const physicsManager = this.service('RapierPhysicsManager');
        physicsManager.world.removeRigidBody(r);
        delete physicsManager.rigidBodies[this.rigidBodyHandle];
        delete this.rigidBodyHandle;
        delete this.$rigidBody;
    }

    createCollider(cd) {
        this.removeCollider();
        const physicsManager = this.service('RapierPhysicsManager');
        let collider = physicsManager.world.createCollider(cd, this.rigidBodyHandle);
        this.colliderHandle = collider.handle;
        return this.colliderHandle;
    }

    removeCollider() {
        if (this.colliderHandle === undefined) return;
        const physicsManager = this.service('RapierPhysicsManager');
        let world = physicsManager.world;
        world.removeCollider(world.getCollider(this.colliderHandle));
        delete this.colliderHandle;
    }

    createImpulseJoint(type, body1, body2, ...params) {
        const physicsManager = this.service('RapierPhysicsManager');
        let func = Worldcore.RAPIER.JointParams[type];

        if (!func) {throw new Error("unkown joint types");}
        let jointParams = func.call(Worldcore.RAPIER.JointParams, ...params);
        let joint = physicsManager.world.createJoint(jointParams, body1.rigidBody, body2.rigidBody);
        this.jointHandle = joint.handle;
        return this.jointHandle;
    }

    removeImpulseJoint() {
        if (this.jointHandle === undefined) return;
        const physicsManager = this.service('RapierPhysicsManager');
        let world = physicsManager.world;
        world.removeJoint(world.getJoint(this.jointHandle));
        delete this.jointHandle;
    }
}

export default {
    modules: [
        {
            name: "Rapier",
            actorBehaviors: [RapierActor]
        }
    ]
}

/* globals Worldcore */

