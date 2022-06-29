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
    }

    theta(xyz) {
        // As the thing itself rotates, we need to get the "theta" in global.
        let origin = this.translation;
        return (Math.atan2(origin[2] - xyz[2], xyz[0] - origin[0]) + Math.PI * 2) % (Math.PI * 2);
    }

    onPointerDown(p3d) {
        this.base = this.theta(p3d.xyz);
        this.baseRotation = [...this._rotation];
        this.say("stopSpinning");
        this.moveBuffer = [];
    }

    onPointerMove(p3d) {
        this.moveBuffer.push(p3d.xyz);
        if (this.moveBuffer.length > 3) {
            this.moveBuffer.shift();
        }
        let next = this.theta(p3d.xyz);
        let newAngle = ((next - this.base) + Math.PI * 2) % (Math.PI * 2);
        let qAngle = Microverse.q_euler(0, newAngle, 0);

        this.rotateTo(Microverse.q_multiply(this.baseRotation, qAngle));
        // this.setRotation(Microverse.q_multiply(this.baseRotation, qAngle));
        newAngle = newAngle < Math.PI ? newAngle : newAngle - Math.PI * 2;
        this.say("newAngle", newAngle);
    }

    onPointerUp(p3d) {
        if(p3d.xyz){ // clean up and see if we can spin
            if (this.moveBuffer.length < 3) {return;}
            let prev = this.theta(this.moveBuffer[0]);
            let next = this.theta(p3d.xyz);
            this.onPointerMove(p3d);
            this.deltaAngle = (next + (Math.PI * 2)) % (Math.PI * 2) - (prev + (Math.PI * 2)) % (Math.PI * 2)
            if(Math.abs(this.deltaAngle) > 0.001) {
                let a = this.deltaAngle;
                a = Math.min(Math.max(-0.1, a), 0.1);
                this.say("startSpinning", a);
            }
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
