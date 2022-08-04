// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

/*
    A behaviour that, when added to an object, causes it to turn to face the camera
    in each user's view.  It does this by overriding the rotation value that the
    pawn would otherwise be taking from its actor.

    By default, the object's local direction [0, 0, 1] is turned to face the camera.
    A pawn can provide a hitNormal property (or getter) to specify a different
    reference vector to use.
*/

class BillboardingPawn {
    setup() {
        let moduleName = this._behavior.module.externalName;
        this.addUpdateRequest([`${moduleName}$BillboardingPawn`, "update"]);

        this.lastUpdate = 0;
        this.lastTarget = null;
        this.lastRotation = null;
    }

    update() {
        // adapted from Widget3.update in Worldcore
        const {
            v3_isZero, v3_equals, v3_sub, v3_normalize, v3_rotate, m4_getTranslation, m4_getRotation, q_lookAt
        } = Microverse;
        const render = this.service("ThreeRenderManager");

        const cameraMatrix = render.camera.matrix;
        let v = new Microverse.THREE.Vector3().setFromMatrixPosition(cameraMatrix);
        const cameraXZ = [v.x, 0, v.z];
        const widgetXZ = m4_getTranslation(this.global);
        widgetXZ[1] = 0;
        const camRelative = v3_sub(cameraXZ, widgetXZ);
        if (v3_isZero(camRelative)) return; // never going to happen during movement.  could happen on setup.

        const target = v3_normalize(camRelative);
        if (!this.lastTarget || !v3_equals(target, this.lastTarget)) {
            this.lastTarget = target;
            let forward = this.hitNormal || [0, 0, 1];
            if (this.parent) forward = v3_rotate(forward, m4_getRotation(this.parent.global));
            const up = [0, 1, 0];
            this._rotation = q_lookAt(forward, up, target);
            this.lastRotation = [...this._rotation];
        } else this._rotation = [...this.lastRotation];
        this.onLocalChanged();
    }

    teardown() {
        console.log("Billboard teardown");
        let moduleName = this._behavior.module.externalName;
        this.removeUpdateRequest([`${moduleName}$BillboardingPawn`, "update"]);
    }
}

export default {
    modules: [
        {
            name: "Billboard",
            pawnBehaviors: [BillboardingPawn],
        }
    ]
}

/* globals Microverse */
