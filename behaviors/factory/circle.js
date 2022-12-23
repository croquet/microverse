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
        this.rotateBy(0.01);
        this.forwardBy(0.03);
    }

    toggle() {
        this.circling = !this.circling;
        if (this.circling) {
            this.step();
        }
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
