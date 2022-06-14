class GarageActor {
    setup() {
        this.pointA = [0, 0, 0];
        this.pointB = [0, 4.5, 0];

        this.subscribe(this.id, "updatePositionBy", "updatePositionBy");

        if (this._cardData.ratio === undefined) this._cardData.ratio = 0;
        this.updatePositionBy(0);
    }

    updatePositionBy(ratio) {
        this._cardData.ratio += ratio;
        this._cardData.ratio = Math.min(1, Math.max(0, this._cardData.ratio));
        this.say("updateDisplay");
    }
}

class GaragePawn {
    setup() {
        this.listen("updateDisplay", "updateDisplay");

        let THREE = Worldcore.THREE;
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        if (this.obj) {
            this.obj.onBeforeRender = null;
        }

        let w = 7.0;
        let h = 4.5;

        let geometry = new THREE.BoxGeometry(w, h, 0.1);
        let material = new THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
        this.obj = new Worldcore.THREE.Mesh(geometry, material);
        this.obj.castShadow = this.actor._cardData.shadow;
        this.obj.receiveShadow = this.actor._cardData.shadow;
        this.shape.add(this.obj);

        this.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(0, 1, 0),  0),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)
        ];

        let left = w / 2;
        let right = w / 2;
        let bottom = h / 2;
        let top = h / 2;
        let planes = this.computeClippingPlanes([top, bottom, right, left]);
        material.clippingPlanes = planes;
        this.addEventListener("pointerDown", "updatePosition");
    }

    updateDisplay() {
        if (this.obj) {
            this.obj.position.set(...Worldcore.v3_lerp(this.actor.pointA, this.actor.pointB, this.actor._cardData.ratio));
        }
    }

    updatePosition() {
        this.publish(this.actor.id, "updatePositionBy", 0.1);
    }

    computeClippingPlanes(ary) {
        //let [top, bottom, right, left] = ary; this is the order
        let planes = [];
        if (Number.isNaN(this.shape.matrixWorld.elements[0])) return [];
        for (let i = 0; i < 4; i++) {
            planes[i] = new Worldcore.THREE.Plane();
            planes[i].copy(this.clippingPlanes[i]);
            planes[i].constant = ary[i];
            planes[i].applyMatrix4(this.shape.matrixWorld);
        }
        return planes;
    }
}

export default {
    modules: [
        {
            name: "Garage",
            actorBehaviors: [GarageActor],
            pawnBehaviors: [GaragePawn]
        },
    ]
}

/* globals Worldcore */
