class CraneActor {
    setup() {
        this.pointA = [-1.4447057496318962, 8.899611090090481, 30.282952880859376];
        this.pointB = [-1.4447057496318962, 8.899611090090481, -7.6106291023593755];

        this.subscribe("crane", "updatePositionBy", "updatePositionBy");

        if (this.ratio === undefined) this.ratio = 0.2;
        this.updatePositionBy(0);
    }

    updatePositionBy(ratio) {
        this.ratio += ratio;
        this.ratio = Math.min(1, Math.max(0, this.ratio));
        this.set({translation: Worldcore.v3_lerp(this.pointA, this.pointB, this.ratio)});
    }
}

class CranePawn {
    setup() {
        // this.shape.children.forEach((c) => this.shape.remove(c));
        // this.shape.children = [];

        let s = 1;
        let geometry = new Worldcore.THREE.SphereGeometry(s / 2, 32, 16);
        let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
        this.obj = new Worldcore.THREE.Mesh(geometry, material);
        this.obj.castShadow = this.actor._cardData.shadow;
        this.obj.receiveShadow = this.actor._cardData.shadow;
        this.shape.add(this.obj);
    }
}

class CraneButtonActor {
    setup() {
        this.addEventListener("pointerDown", "start");
        this.addEventListener("pointerUp", "stop");
        // we will use SingleUser module
        this.timer = null;
    }

    start() {
        if (!this.timer) {
            this.timer = true;
            this.publishMove();
        }
    }

    publishMove() {
        if (this.timer) {
            this.future(100).publishMove();
        }
        this.publish("crane", "updatePositionBy", this._cardData.craneSpeed);
    }

    stop() {
        this.timer = null;
    }
}

class CraneButtonPawn {
    setup() {
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        if (this.shape.children.length === 0) {
            let s = 0.2;
            let geometry = new Worldcore.THREE.BoxGeometry(s, s, s);
            let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
            this.obj = new Worldcore.THREE.Mesh(geometry, material);
            this.obj.castShadow = this.actor._cardData.shadow;
            this.obj.receiveShadow = this.actor._cardData.shadow;
            this.shape.add(this.obj);
        }
    }
}

/*
  Two behavior modules are exported from this file.  See worlds/default.js for their use.
*/
export default {
    modules: [
        {
            name: "Crane",
            actorBehaviors: [CraneActor],
            pawnBehaviors: [CranePawn]
        },
        {
            name: "CraneButton",
            actorBehaviors: [CraneButtonActor],
            pawnBehaviors: [CraneButtonPawn],
        }
    ]
}

/* globals Worldcore */

