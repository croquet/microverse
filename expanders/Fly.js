class Fly {
    setup() {
        this.set({
            rotation: WorldCore.q_euler(0, 0, 0),
            translation: [0, 3, 0]});
        if (!this.flying) {
            this.flying = true;
            this.fly();
        }
        this.addEventListener("pointerDown", "toggle");
    }

    fly() {
        if (!this.flying) {return;}
        this.future(20).call("Fly", "fly");
        this.rotateBy([0, 0.01, 0]);
        this.forwardBy(0.03);
    }

    toggle() {
        this.flying = !this.flying;
        if (this.flying) {
            this.fly();
        }
    }

    rotateBy(angles) {
        let q = WorldCore.q_euler(...angles);
        q = WorldCore.q_multiply(this.rotation, q);
        this.rotateTo(q);
    }

    forwardBy(dist) {
        let v = WorldCore.v3_rotate([0, 0, dist], this.rotation)
        this.translateTo([
            this.translation[0] + v[0],
            this.translation[1] + v[1],
            this.translation[2] + v[2]]);
    }
}
/*global WorldCore */    
