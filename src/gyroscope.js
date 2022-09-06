// this is a helper for threejs that allows children of an object to maintain
// rotation or scale independent of their parent
// adapted from https://github.com/mrdoob/three.js/blob/342946c8392639028da439b6dc0597e58209c696/examples/js/misc/Gyroscope.js

import * as THREE from 'three';

const _translationObject = new THREE.Vector3();
const _quaternionObject = new THREE.Quaternion();
const _scaleObject = new THREE.Vector3();
const _translationWorld = new THREE.Vector3();
const _quaternionWorld = new THREE.Quaternion();
const _scaleWorld = new THREE.Vector3();

export class Gyroscope extends THREE.Object3D {
    constructor(options) {
        super();
        this.rotationInvariant = options.rotationInvariant;
        this.scaleInvariant = options.scaleInvariant;
    }

    updateMatrixWorld(force) {
        this.matrixAutoUpdate && this.updateMatrix(); // update matrixWorld
        if (this.matrixWorldNeedsUpdate || force) {
            if (this.parent !== null) {
                this.matrixWorld.multiplyMatrices(
                    this.parent.matrixWorld,
                    this.matrix
                );
                this.matrixWorld.decompose(
                    _translationWorld,
                    _quaternionWorld,
                    _scaleWorld
                );
                this.matrix.decompose(
                    _translationObject,
                    _quaternionObject,
                    _scaleObject
                );
                this.matrixWorld.compose(
                    _translationWorld,
                    this.rotationInvariant ? _quaternionObject : _quaternionWorld,
                    this.scaleInvariant ? _scaleObject : _scaleObject
                );
            } else {
                this.matrixWorld.copy(this.matrix);
            }

            this.matrixWorldNeedsUpdate = false;
            force = true;
        } // update children

        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i].updateMatrixWorld(force);
        }
    }
}
