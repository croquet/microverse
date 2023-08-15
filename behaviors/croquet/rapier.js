// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

/*

  This is a wrapper to call Rapier features. It is expected to be used
  a user-defined behavior module that creates a rigid body and a
  collider description. (see behaviors/default/cascade.js for an
  example.)
*/

// the following import statement is solely for the type checking and
// autocompletion features in IDE.  A Behavior cannot inherit from
// another behavior or a base class but can use the methods and
// properties of the card to which it is installed.
// The prototype classes ActorBehavior and PawnBehavior provide
// the features defined at the card object.

import {ActorBehavior} from "../PrototypeBehavior";


class RapierActor extends ActorBehavior {
    setup() {
        this._oldRapier07 = true;
    }

    teardown() {
        this.removeImpulseJoint();
        this.removeCollider();
        this.removeRigidBody();
    }

    getRigidBody() {
        return null;
    }

    createRigidBody(rbd) {
    }

    setKinematicTranslation(data) {
    }

    setKinematicRotation(data) {
    }

    removeRigidBody() {
    }

    createCollider(cd) {
        return null;
    }

    removeCollider() {
    }

    createImpulseJoint(type, body1, body2, ...params) {
        return null;
    }

    removeImpulseJoint() {
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

