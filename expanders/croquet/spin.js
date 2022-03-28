class SpinActor {
    setup() {
        this.scriptListen("startSpinning", this.startSpinning);
        this.scriptListen("stopSpinning", this.stopSpinning);
    }
    
    startSpinning(spin) {
        this.isSpinning = true;
        this.qSpin = WorldCore.q_euler(0, spin, 0);
        this.doSpin();
    }

    doSpin() {
        if(this.isSpinning) {
            this.setRotation(WorldCore.q_multiply(this._rotation, this.qSpin));
            this.future(50).doSpin();
        }
    }

    stopSpinning() {
        this.isSpinning = false;
    }
}

class SpinPawn {
    setup() {
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("pointerMove", "onPointerMove");
    }

    theta(xyz) {
        let local = this.world2local(xyz);
        return Math.atan2(local[0], local[2]);
    }

    onPointerDown(p3d) {
        this.base = this.theta(p3d.xyz);
        this.deltaAngle = 0;
        this.say("stopSpinning");
    }

    onPointerMove(p3d) {
        let next = this.theta(p3d.xyz);
        console.log(this.base, next);

        this.deltaAngle = (next - this.base) / 2;
        let qAngle = WorldCore.q_euler(0, this.deltaAngle, 0);
        this.setRotation(WorldCore.q_multiply(this._rotation, qAngle));
    }

    onPointerUp(p3d) {
        if(p3d.xyz){ // clean up and see if we can spin
            this.onPointerMove(p3d);
            if(Math.abs(this.deltaAngle) > 0.001) {
                let a = this.deltaAngle;
                a = Math.min(Math.max(-0.1, a), 0.1);
                this.say("startSpinning", a);
            }
        }
    }

}

export const spin = {
    actorExpanders: [SpinActor],
    pawnExpanders: [SpinPawn]
}

/* globals WorldCore */
