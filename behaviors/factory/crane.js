class CraneActor {
    setup() {
        this.pointA = [-1.4447057496318962, -5.504611090090481, 29.225081241195];
        this.pointB = [-1.4447057496318962, -5.504611090090481, -6.8406291023593755];
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

class CraneButtonActor {
    setup() {
        this.occupier = undefined;
        this.listen("publishMove", "publishMove");
        this.listen("pressButton", "pressButton");
        this.listen("publishFocus", "publishFocus");
        this.subscribe(this._cardData.myScope, "focus", "focus");
    }

    // Publish Translation
    publishMove() {
        if (this.occupier !== undefined) { this.future(100).publishMove(); }
        this.publish("crane", "updatePositionBy", this._cardData.craneSpeed);
    }

    // Update Translation
    pressButton(data) {
        let {translation, color} = data;
        this.translateTo(translation);
        this.say("updateColor", color);
    }

    // Publish New Focus
    publishFocus(viewId) {
        this.publish(this._cardData.myScope, "focus", viewId);
    }  

    // Focus Controlling Player
    focus(viewId) {
        this.occupier = viewId;
    }
}

class CraneButtonPawn {
    setup() {
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        if (this.shape.children.length === 0) {
            let s = 0.2;
            let geometry = new Worldcore.THREE.BoxGeometry(s, s, s);
            let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xD86508});
            this.obj = new Worldcore.THREE.Mesh(geometry, material);
            this.obj.castShadow = this.actor._cardData.shadow;
            this.obj.receiveShadow = this.actor._cardData.shadow;
            this.shape.add(this.obj);
        }

        this.addEventListener("pointerDown", "start");
        this.addEventListener("pointerUp", "stop");
        this.listen("updateColor", "updateColor");
    }

    start() {
        if (this.actor.occupier === undefined) {
            this.say("pressButton", {translation: [this.actor._translation[0], this.actor._translation[1], this.actor._translation[2] - 0.1], color: 0x313333});
            this.say("publishFocus", this.viewId);
            this.say("publishMove");
        }
    }

    stop() {
        if (this.actor.occupier === this.viewId) {
            this.say("pressButton", {translation: [this.actor._translation[0], this.actor._translation[1], this.actor._translation[2] + 0.1], color: 0xD86508});
            this.say("publishFocus", undefined);
        }
    }

    updateColor(color) {
        this.obj.material.color.set(color);
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
        },
        {
            name: "CraneButton",
            actorBehaviors: [CraneButtonActor],
            pawnBehaviors: [CraneButtonPawn],
        }
    ]
}

/* globals Worldcore */
