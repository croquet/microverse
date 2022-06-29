// Spin
// Copyright 2022 Croquet Corporation
// Croquet Microverse
// Adds a simple spin around y to a Tron

class SpinActor {
    setup() {
        this.listen("startSpinning", "startSpinning");
        this.listen("stopSpinning", "stopSpinning");
        this.listen("newAngle", "newAngle");
    }

    startSpinning(spin) {
        this.isSpinning = true;
        this.qSpin = Microverse.q_euler(0, spin, 0);
        this.doSpin();
    }

    doSpin() {
        if(this.isSpinning) {
            this.rotateTo(Microverse.q_multiply(this._rotation, this.qSpin));
            this.future(50).doSpin();
        }
    }

    stopSpinning() {
        this.isSpinning = false;
    }

    newAngle(newAngle) {
        this.publish("scope", "newAngle", newAngle);
    }

    teardown() {
        delete this.isSpinning;
        this.unsubscribe(this.id, "startSpinning");
        this.unsubscribe(this.id, "stopSpinning");
        this.unsubscribe(this.id, "newAngle");
    }
}

class SpinPawn {
    setup() {
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("pointerMove", "onPointerMove");
        this.listen("focusChanged", "focusChanged");
    }

    isSingleUser() {
        return this.actor.occupier !== undefined;
    }

    hasFocus() {
        return this.actor.occupier == this.viewId;
    }

    theta(xyz) {
        // As the thing itself rotates, we need to get the "theta" in global.
        let origin = this.translation;
        return (Math.atan2(origin[2] - xyz[2], xyz[0] - origin[0]) + Math.PI * 2) % (Math.PI * 2);
    }

    onPointerDown(p3d) {
        if (!this.isSingleUser()) {
            this.downP3d = p3d;
            this.focusChanged();
            return;
        }
        this.say("focus", this.viewId);
        this.downP3d = p3d;
    }

    focusChanged() {
        // console.log("focusChanged", this.actor.occupier);
        if (this.isSingleUser() && !this.hasFocus()) {
            if (this.downP3d) {this.onPointerUp(this.downP3d);}
            return;
        }
        let p3d = this.downP3d;
        if (!p3d) {return;}
        this.moveBuffer = [];
        this.say("stopSpinning");
        this._startDrag = p3d.xy;
        this._baseRotation = this._rotation;
        let avatar = Microverse.GetPawn(p3d.avatarId);
        avatar.addFirstResponder("pointerMove", {}, this);
    }

    onPointerMove(p3d) {
        // console.log("pointerMove", this.actor.occupier);
        if (this.isSingleUser() && !this.hasFocus()) {return;}
        if (!this.downP3d) {return;}
        this.moveBuffer.push(p3d.xy);
        this.deltaAngle = (p3d.xy[0] - this._startDrag[0]) / 2 / 180 * Math.PI;
        let newRot = Microverse.q_multiply(this._baseRotation, Microverse.q_euler(0, this.deltaAngle, 0));
        this.rotateTo(newRot);
        this.say("newAngle", this.deltaAngle);
        this.say("focus", this.viewId);
        if (this.moveBuffer.length >= 3) {
            setTimeout(() => this.shiftMoveBuffer(), 100);
        }
    }

    shiftMoveBuffer() {
        this.moveBuffer.shift();
    }

    onPointerUp(p3d) {
        this.say("unfocus", this.viewId);
        this.downP3d = null;
        let avatar = Microverse.GetPawn(p3d.avatarId);
        avatar.removeFirstResponder("pointerMove", {}, this);
        if (this.isSingleUser() && !this.hasFocus()) {return;}
        this.moveBuffer.push(p3d.xy);

        this._startDrag = null;
        this._baseRotation = null;

        if (this.moveBuffer.length < 3) {return;}

        this.moveBuffer = this.moveBuffer.slice(this.moveBuffer.length - 3);

        let signs = new Set();
        for (let i = 0; i < this.moveBuffer.length - 1; i++) {
            signs.add(Math.sign(this.moveBuffer[i + 1][0] - this.moveBuffer[i][0]));
        }
        if (signs.has(-1) && signs.has(1)) {return;}

        this.deltaAngle = (this.moveBuffer[this.moveBuffer.length - 1][0] - this.moveBuffer[0][0]) / 2 / 180 * Math.PI;

        if (Math.abs(this.deltaAngle) > 0.01) {
            let a = this.deltaAngle;
            a = Math.min(Math.max(-0.1, a), 0.1);
            this.say("startSpinning", a);
        }
    }

    teardown() {
        this.removeEventListener("pointerDown", "onPointerDown");
        this.removeEventListener("pointerUp", "onPointerUp");
        this.removeEventListener("pointerMove", "onPointerMove");
    }
}

export default {
    modules: [
        {
            name: "Spin",
            actorBehaviors: [SpinActor],
            pawnBehaviors: [SpinPawn]
        }
    ]
}

/* globals Microverse */
