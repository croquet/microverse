// SimpleSpin
// Copyright 2022 Croquet Corporation
// Croquet Microverse
// Simple start/stop spinner


class SpinningActor {
    setup() {
        if (this.spinning) {
            this.spinning = false; // start without spinning
        }
        this.angle = 0;
        this.spinSpeed = 0.01;
        this.addEventListener("pointerDown", "toggle");
    }

    step() {
        if (!this.spinning) {return;}
        this.future(20).step();
        this.angle+=this.spinSpeed;
        this.set({rotation: Worldcore.q_euler(0, this.angle, 0)});
    }

    toggle() {
        this.spinning = !this.spinning;
        if (this.spinning) {
            this.step();
        }
    }

    destroy() {
        this.removeEventListener("pointerDown", "toggle");
        this.spinning = false;
    }
}

export default {
    modules: [
        {
            name: "SimpleSpin",
            actorBehaviors: [SpinningActor],
        }
    ]
}
