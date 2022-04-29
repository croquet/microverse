class SpinActor {
    setup() {
        this.listen("startSpinning", "startSpinning");
        this.listen("stopSpinning", "stopSpinning");
        this.listen("newAngle", "newAngle");
    }

    startSpinning(spin) {
        this.isSpinning = true;
        this.qSpin = Worldcore.q_euler(0, spin, 0);
        this.doSpin();
    }

    doSpin() {
        if(this.isSpinning) {
            this.setRotation(Worldcore.q_multiply(this._rotation, this.qSpin));
            this.future(50).doSpin();
        }
    }

    stopSpinning() {
        this.isSpinning = false;
    }

    newAngle(newAngle) {
        this.publish("scope", "newAngle", newAngle);
    }

    destroy() {
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
    }

    theta(xyz) {
        // As the thing itself rotates, we need to get the "theta" in global.
        let origin = this.translation;
        return (Math.atan2(origin[2] - xyz[2], xyz[0] - origin[0]) + Math.PI * 2) % (Math.PI * 2);
    }

    onPointerDown(p3d) {
        this.moveBuffer = [];
        this.say("stopSpinning");
        this._startDrag = p3d.xy;
        this._baseRotation = this._rotation;
    }

    onPointerMove(p3d) {
        this.moveBuffer.push(p3d.xyz);
        this.deltaAngle = (p3d.xy[0] - this._startDrag[0]) / 2 / 180 * Math.PI;
        let newRot = Worldcore.q_multiply(this._baseRotation, Worldcore.q_euler(0, this.deltaAngle, 0));
        this.rotateTo(newRot);
        // this.say("newAngle", newAngle);
    }

    onPointerUp(_p3d) {
        if (this.moveBuffer.length < 3) {return;}
        if(Math.abs(this.deltaAngle) > 0.001) {
            let a = this.deltaAngle;
            a = Math.min(Math.max(-0.1, a), 0.1);
            this.say("startSpinning", a);
        }
    }

    destroy() {
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

/* globals Worldcore */
