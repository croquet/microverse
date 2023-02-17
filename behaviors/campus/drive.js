class DriveActor {
    setup() {
        if (this.speed === undefined) this.speed = 0.1;
        if (this.angle === undefined) this.angle = 0.02;
        if (this.running === undefined) {
            this.running = true;
            this.run();
        }
        this.addEventListener("keyDown", "control");
        this.addEventListener("pointerDown", "nop");
        // this.subscribe("demo", "newAngle", "newAngle");
    }
    run() {
        if (!this.running) {return;}
        this.future(20).run();
        this.rotateBy([0, -this.angle, 0]);
        this.forwardBy(this.speed);
        if (this.avatar) {
            let t = this._translation;
            this.avatar._translation = [t[0], t[1] + 1.6, t[2]];
            this.avatar._rotation = this._rotation;
            this.avatar.say("forceOnPosition");
        }
    }
    /*
    newAngle(angle) {
        // angle = angle / 20;
        // console.log(angle);
        this.angle = angle;
    }
    */
    control(key) {
        if (key.key === "ArrowRight") {
            this.angle = Math.min(0.05, this.angle + 0.004);
        } else if (key.key === "ArrowLeft") {
            this.angle = Math.max(-0.05, this.angle - 0.004);
        } else if (key.key === "ArrowUp") {
            this.speed = Math.min(1, this.speed + 0.025);
        } else if (key.key === "ArrowDown") {
            this.speed = Math.max(-0.2, this.speed - 0.025);
        }
    }
    teardown() {
        this.removeEventListener("pointerDown", "toggle");
        this.removeEventListener("keyDown", "turn");
        this.unsubscribe("demo", "newAngle", "newAngle");
        this.running = false;
    }
}

export default {
    modules: [
        {
            name: "Drive",
            actorBehaviors: [DriveActor],
        }
    ]
}
