// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

/*

  This is a wrapper to call Rapier Physics Engine features. It is expected to be used
  a user-defined behavior module that creates a rigid body and a
  collider description. (see behaviors/default/cascade.js for an
  example.)
*/

class PhysicsActor {
    teardown() {
        this.removeImpulseJoint();
        this.removeCollider();
        this.removeRigidBody();
        delete this._myPhysicsWorld;
        // _myPhysicsWorld is there so that a destroyed card, which lost its parent
        // property when this teardown is executed, still removes itself from the physics world.
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

          The implementation of PhysicsManager is in src/physics2.js.

        */

        if (!this.$rigidBody) {
            if (this.rigidBodyHandle === undefined) return undefined;
            const physicsWorld = this.physicsWorld;
            this.$rigidBody = physicsWorld.world.getRigidBody(this.rigidBodyHandle);
        }
        return this.$rigidBody;
    }

    createRigidBody(rbd) {
        this.removeRigidBody();
        rbd.translation = new Microverse.Physics.Vector3(...this.translation);
        rbd.rotation = new Microverse.Physics.Quaternion(...this.rotation);
        this._myPhysicsWorld =  this.physicsWorld;
        this.$rigidBody = this._myPhysicsWorld.world.createRigidBody(rbd);
        this.rigidBodyHandle = this.$rigidBody.handle;
        this._myPhysicsWorld.rigidBodies.set(this.rigidBodyHandle, this._target);

        /*
          Those events are handled so that when a position-based object
          was moved from the user program, the object's position and
          rotatino in the simulation are updated.
        */
        if (this.getRigidBody().bodyType() === Microverse.Physics.RigidBodyType.KinematicPositionBased) {
            this.listen("translationSet", "Physics$PhysicsActor.setKinematicTranslation");
            this.listen("rotationSet", "Physics$PhysicsActor.setKinematicRotation");
        }
    }

    setKinematicTranslation(data) {
        this.getRigidBody().setNextKinematicTranslation(new Microverse.Physics.Vector3(...data.v));
    }
    setKinematicRotation(data) {
        this.getRigidBody().setNextKinematicRotation(new Microverse.Physics.Quaternion(...data.v));
    }

    removeRigidBody() {
        let r = this.getRigidBody();
        if (!r) return;
        const physicsWorld = this._myPhysicsWorld;
        if (!physicsWorld) {return;}
        physicsWorld.world.removeRigidBody(r);
        physicsWorld.rigidBodies.delete(this.rigidBodyHandle)
        delete this.rigidBodyHandle;
        delete this.$rigidBody;
    }

    createCollider(cd) {
        this.removeCollider();
        const physicsWorld = this.physicsWorld;
        this._myPhysicsWorld =  physicsWorld;
        let collider = physicsWorld.world.createCollider(cd, this.getRigidBody());
        this.colliderHandle = collider.handle;
        return this.colliderHandle;
    }

    removeCollider() {
        if (this.colliderHandle === undefined) return;
        const physicsWorld = this._myPhysicsWorld;
        if (!physicsWorld) {return;}
        let world = physicsWorld.world;
        let collider = world.getCollider(this.colliderHandle);
        if (collider) {
            world.removeCollider(collider);
        }
        delete this.colliderHandle;
    }

    createImpulseJoint(type, body1, body2, ...params) {
        this.removeImpulseJoint();
        const physicsWorld = this.physicsWorld;
        if (!physicsWorld) {return;}
        this._myPhysicsWorld = physicsWorld;
        // compatibility with Rapier 0.7.3 based spec
        if (type === "ball") {type = "spherical";}

        let func = Microverse.Physics.JointData[type];
        if (!func) {throw new Error("unkown joint types");}
        let jointParams = func.call(Microverse.Physics.JointData, ...params);
        let joint = physicsWorld.world.createImpulseJoint(jointParams, body1.rigidBody, body2.rigidBody);
        this.jointHandle = joint.handle;
        return this.jointHandle;
    }

    removeImpulseJoint() {
        if (this.jointHandle === undefined) return;
        const physicsWorld = this._myPhysicsWorld;
        if (!physicsWorld) {return;}
        let world = physicsWorld.world;
        let joint = world.getImpulseJoint(this.jointHandle);
        if (joint) {
            world.removeJoint(joint);
        }
        delete this.jointHandle;
    }
}

export default {
    modules: [
        {
            name: "Physics",
            actorBehaviors: [PhysicsActor]
        }
    ]
}

/* globals Microverse */
