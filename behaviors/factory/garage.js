class GarageActor {
    setup() {
        this.pointA = [7.799494248347024, -0.3110201562611392, 10.508325734249267],
        this.pointB = [7.799494248347024, -0.3110201562611392 + 4.5, 10.508325734249267],

        this.subscribe(this.id, "updatePositionBy", "updatePositionBy");

        if (this._cardData.ratio === undefined) this._cardData.ratio = 0;
        if (this.nextDirection === undefined) this.nextDirection = "up";
        if (this.moving === undefined) this.moving = false;

        this.updatePositionBy(0);
        this.addEventListener("pointerDown", "trigger");
        this.addEventListener("pointerDoubleDown", "nop");
    }

    trigger() {
        if (this.moving) {this.moving = false; return;}
        this.moving = true;
        if (this._cardData.ratio === 0) {
            this.up();
        } else {
            this.down();
        }
    }

    up() {
        this.updatePositionBy(0.0625);
        if (this.moving) {
            this.future(100).up();
        }
    }

    down() {
        this.updatePositionBy(-0.0625);
        if (this.moving) {
            this.future(100).down();
        }
    }

    updatePositionBy(ratio) {
        this._cardData.ratio += ratio;
        this._cardData.ratio = Math.min(1, Math.max(0, this._cardData.ratio));
        if (this._cardData.ratio >= 0.75) {
            this._cardData.ratio = 0.75;
            this.moving = false;
            this.nextDirection = "down";
        } else if (this._cardData.ratio <= 0) {
            this._cardData.ratio = 0;
            this.moving = false;
            this.nextDirection = "up";
        }
        this.set({translation: Worldcore.v3_lerp(this.pointA, this.pointB, this._cardData.ratio)});
        this.say("updateDisplay");
    }
}

class GaragePawn {
    setup() {
        this.listen("updateDisplay", "updateDisplay");
    }

    initializeClipping() {
        if (this.initialized) {return;}
        if (this.obj) {
            this.obj.onBeforeRender = null;
        }

        this.obj = this.shape.children[0];

        let THREE = Worldcore.THREE;
        this.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(0, 1, 0),  0),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)
        ];
        this.initialized = !!this.obj;
    }

    updateDisplay() {
        this.initializeClipping();

        let w = 7.0;
        let h = 4.5;

        let left = w / 2;
        let right = w / 2;
        let bottom = h * (1 - this.actor._cardData.ratio) - 0.5;
        let top = h;
        let planes = this.computeClippingPlanes([top, bottom, right, left]);

        if (!this.obj) {return;}
        this.obj.traverse((n) => {
            if (n.material) {
                n.material.clippingPlanes = planes;
            }
        });
    }

    updatePosition() {
        this.initializeClipping();
        this.publish(this.actor.id, "updatePositionBy", 0.0625);
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
