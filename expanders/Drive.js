class Drive {
    setup() {
        this.set({
            rotation: WorldCore.q_euler(-Math.PI/2, 0, 0),
            translation: [0, -2.9, 10]});
        this.speed = 0;
        this.angle = 0;
        if (!this.running) {
            this.running = true;
            this.run();
        }
        this.addEventListener("pointerDown", "toggle");
        this.addEventListener("keyDown", "turn");
    }

    run() {
        if (!this.running) {return;}
        this.future(20).call("Drive", "run");
        this.rotateBy([0, -this.angle, 0]);
        this.forwardBy(-this.speed);
    }

    toggle() {
        this.running = !this.running;
        if (this.running) {
            this.run();
        }
    }

    rotateBy(angles) {
        let q = WorldCore.q_euler(...angles);
        q = WorldCore.q_multiply(this.rotation, q);
        this.rotateTo(q);
    }

    forwardBy(dist) {
        let v = WorldCore.v3_rotate([dist, 0, 0], this.rotation)
        this.translateTo([
            this.translation[0] + v[0],
            this.translation[1] + v[1],
            this.translation[2] + v[2]]);
    }

    turn(key) {
        if (key.key === "ArrowRight") {
            this.angle = Math.min(0.05, this.angle + 0.004);
        }
        if (key.key === "ArrowLeft") {
            this.angle = Math.max(-0.05, this.angle - 0.004);
        }
        if (key.key === "ArrowUp") {
            this.speed = Math.min(1, this.speed + 0.05);
        }
        if (key.key === "ArrowDown") {
            this.speed = Math.max(-0.2, this.speed - 0.05);
        }
    }
}
/*global WorldCore */    
