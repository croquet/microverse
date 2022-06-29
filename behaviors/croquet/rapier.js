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
    teardown() {
        this.removeImpulseJoint();
        this.removeCollider();
        this.removeRigidBody();
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

          The implementation of RapierPhysicsManager is in src/physics.js.

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
        rbd.translation = new Microverse.RAPIER.Vector3(...this.translation);
        rbd.rotation = new Microverse.RAPIER.Quaternion(...this.rotation);
        const physicsManager =  this.service('RapierPhysicsManager');
        this.$rigidBody = physicsManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = this.$rigidBody.handle;
        physicsManager.rigidBodies[this.rigidBodyHandle] = this._target;

        /*
          Those events are handled so that when a position-based object
          was moved from the user program, the object's position and
          rotatino in the simulation are updated.
        */
        if (this.getRigidBody().bodyType() === Microverse.RAPIER.RigidBodyType.KinematicPositionBased) {
            this.listen("translationSet", "Rapier$RapierActor.setKinematicTranslation");
            this.listen("rotationSet", "Rapier$RapierActor.setKinematicRotation");
        }
    }

    setKinematicTranslation(data) {
        this.getRigidBody().setNextKinematicTranslation(new Microverse.RAPIER.Vector3(...data.v));
    }
    setKinematicRotation(data) {
        this.getRigidBody().setNextKinematicRotation(new Microverse.RAPIER.Quaternion(...data.v));
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
        let collider = world.getCollider(this.colliderHandle);
        if (collider) {
            world.removeCollider(collider);
        }
        delete this.colliderHandle;
    }

    createImpulseJoint(type, body1, body2, ...params) {
        const physicsManager = this.service('RapierPhysicsManager');
        let func = Microverse.RAPIER.JointParams[type];

        if (!func) {throw new Error("unkown joint types");}
        let jointParams = func.call(Microverse.RAPIER.JointParams, ...params);
        let joint = physicsManager.world.createJoint(jointParams, body1.rigidBody, body2.rigidBody);
        this.jointHandle = joint.handle;
        return this.jointHandle;
    }

    removeImpulseJoint() {
        if (this.jointHandle === undefined) return;
        const physicsManager = this.service('RapierPhysicsManager');
        let world = physicsManager.world;
        let joint = world.getJoint(this.jointHandle);
        if (joint) {
            world.removeJoint(joint);
        }
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

/* globals Microverse */

