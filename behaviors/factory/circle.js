class CircleActor {
    setup() {
        if (!this.circling) {
            this.circling = true;
            this.step();
        }
        this.addEventListener("pointerDown", "toggle");
    }

    step() {
        if (!this.circling) {return;}
        this.future(20).step();
        this.rotateBy([0, 0.01, 0]);
        this.forwardBy(0.03);
    }

    toggle() {
        this.circling = !this.circling;
        if (this.circling) {
            this.step();
        }
    }

    rotateBy(angles) {
        let q = Microverse.q_euler(...angles);
        q = Microverse.q_multiply(this.rotation, q);
        this.rotateTo(q);
    }

    forwardBy(dist) {
        let v = Microverse.v3_rotate([0, 0, dist], this.rotation)
        this.translateTo([
            this.translation[0] + v[0],
            this.translation[1] + v[1],
            this.translation[2] + v[2]]);
    }

    teardown() {
        this.removeEventListener("pointerDown", "toggle");
        this.circling = false;
    }
}

export default {
    modules: [
        {
            name: "Circle",
            actorBehaviors: [CircleActor],
        },
    ]
}

/* globals Microverse */
