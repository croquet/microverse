class FlipCardActor {
    setup() {
        this._cardData.state = "h"; // "h" head, "t" tail, h2t, t2h
        this.rotateTo(Microverse.q_identity());
        this.createCards();

        this.subscribe(this.id, "flip", "flip");
        this.listen("cardDataSet", "updateCard");
    }

    flip() {
        let state = this._cardData.state;
        if (state === "h" || state === "t") {
            if (state === "h") {
                this._cardData.state = "h2t";
            } else if (state === "t") {
                this._cardData.state = "t2h";
            }
            this.startRotation = this.rotation;
            this.endRotation = Microverse.q_multiply(Microverse.q_euler(0, Math.PI, 0), this.startRotation);
            if (!this.oldStartRotation) {
                this.oldStartRotation = this.startRotation;
            }
            this.startTime = this.now();
            this.animation();
        }
    }

    updateCard() {
        this.createCards();
    }

    animation() {
        if (!this.startTime) {return;}
        let now = this.now();
        let offset = now - this.startTime;
        let state = this._cardData.state;

        let ratio = Math.min(1, Math.max(0, offset / 1000)); // milliseconds
        let angle = Microverse.q_slerp(this.startRotation, this.endRotation, ratio);

        this.rotateTo(angle);

        if (state === "h2t" && ratio === 1) {
            this._cardData.state = "t";
            this.set({rotatation: this.endRotation});
        } else if (state === "t2h" && ratio === 1) {
            this._cardData.state = "h";
            // to avoid accumulating errors, we record that the startRotation and
            // if the endRotation is almost coming back to it, we snap to it.
            // otherwise, we make sure that oldStartRotation is cleared and next new start rotation is recorded.
            // It does not matter whether you start from head or tail.
            if (Microverse.q_equals(this.oldStartRotation, this.endRotation, 0.00001)) {
                this.set({rotation: this.oldStartRotation});
            } else {
                delete this.oldStartRotation;
                this.set({rotatation: this.endRotation});
            }
        } else if (state !== "h" && state !== "t") {
            this.future(50).animation();
        }
    }

    createCards() {
        this.removeCards();
        this.headCard = this.createCard({
            name: 'head',
            parent: this,
            type: "2d",
            textureType: "image",
            textureLocation: this._cardData.headTextureLocation,
            noSave: true,
            depth: 0.02,
            cornerRadius: 0.05,
            behaviorModules: ["FlipCardFace"],
            translation: [0, 0, 0.01],
            fullBright: true,
            width: this._cardData.width,
            height: this._cardData.height,
        });

        this.tailCard = this.createCard({
            name: 'tail',
            parent: this,
            type: "2d",
            textureType: "image",
            textureLocation: this._cardData.tailTextureLocation,
            noSave: true,
            depth: 0.02,
            cornerRadius: 0.05,
            behaviorModules: ["FlipCardFace"],
            translation: [0, 0, -0.01],
            rotation: [0, Math.PI, 0],
            width: this._cardData.width,
            height: this._cardData.height,
        });
        this.proto = this.createCard({
            type: "object",
            proto: true,
            parent: this,
            behaviorModules: ["FlipCardFace"],
        });
    }

    removeCards() {
        if (this.headCard) {
            this.headCard.destroy();
        }
        if (this.tailCard) {
            this.tailCard.destroy();
        }
        if (this.proto) {
            this.proto.destroy();
        }
    }
}

class FlipCardPawn {
    setup() {
        this.addKnob();
        this.listen("updateShape", "addKnob");
    }

    addKnob() {
        if (this.knob) {
            this.knob.removeFromParent();
        }
        let geometry = new Microverse.THREE.SphereGeometry(0.08, 16, 16);
        let material = new Microverse.THREE.MeshStandardMaterial({color: 0x00ffdd, metalness: 0.8});
        this.knob = new Microverse.THREE.Mesh(geometry, material);
        this.knob.position.set(0, this.actor._cardData.height / 2, 0);
        this.shape.add(this.knob);
    }
}

class FlipCardFaceActor {
    setup() {
        if (!this._cardData.proto) {
            this.addEventListener("pointerTap", "flip");
        }
    }

    flip() {
        if (this.parent) {
            this.publish(this.parent.id, "flip");
        }
    }
}

export default {
    modules: [
        {
            name: "FlipCard",
            actorBehaviors: [FlipCardActor],
            pawnBehaviors: [FlipCardPawn],
        },
        {
            name: "FlipCardFace",
            actorBehaviors: [FlipCardFaceActor],
        }
    ]
};

/* globals Microverse */
