class PendulumActor {
    setup() {
        this.chains = 9;
        // the nth mass has the pendulum look
        // the 0th mass is stationary
        let headY = this.chains;
        this.ms = [...Array(this.chains).keys()].map(i => ({
            m: (i === this.chains - 1 ? 5 : 1), a: [0, 0, 0], v: [0, 0, 0], p: [i * 0.4, headY - i, 0]}));

        this.springs = [];
        for (let i = 0; i < this.chains - 1; i++) {
            this.springs.push({
                length: 1,
                naturalLength: 1,
                s0: this.ms[i],
                s1: this.ms[i + 1]
            });
        }

        if (!this.stepping) {
            console.log("new step");
            this.stepping = true;
            this.step();

        }
        console.log(this.ms, 24);
        this.addEventListener("pointerTap", "wiggle");
    }

    step() {
        if (!this.stepping) {return;}
        let d = this.chains;
        for (let i = 0; i < d; i++) {
            this.ms[i].a = [0, -0.0001, 0];
        }

        let isEnd = (i) => {
            return i === 0;
        };

        let v3_nan = (v) => {
            let n = Number.isNaN;
            return n(v[0]) || n(v[1]) || n(v[2]);
        };

        let hasNaN = (m) => {
            return v3_nan(m.a) || v3_nan(m.v) || v3_nan(m.p);
        };

        for (let s = 0; s < this.springs.length; s++) {
            let spring = this.springs[s];
            let s0 = spring.s0;
            let s1 = spring.s1;
            let p0 = s0.p;
            let p1 = s1.p;
            let n = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];

            let len = Worldcore.v3_magnitude(n);

            let a = len - spring.naturalLength;
            let c = 0.2;

            let add0 = Worldcore.v3_scale(n, a * c * s1.m);
            let add1 = Worldcore.v3_scale(n, -a * c * s0.m);

            if (v3_nan(add0) || v3_nan(add1) || hasNaN(s0) || hasNaN(s1)) {debugger;}
            s0.a = Worldcore.v3_add(s0.a, add0);
            s1.a = Worldcore.v3_add(s1.a, add1);
        }

        for (let i = 0; i < this.chains; i++) {
            let m = this.ms[i];
            if (isEnd(i)) {
                m.v = [0, 0, 0];
            } else {
                m.v = Worldcore.v3_add(m.v, m.a);
            }
            m.v = Worldcore.v3_scale(m.v, 0.999)
            m.p = Worldcore.v3_add(m.p, m.v);
        }
        this.say("updateDisplay");
        this.future(20).step();
    }

    wiggle() {
        // let d = this.chains;
        let m = this.ms[this.ms.length - 1];
        m.v = Worldcore.v3_add(m.v, [0.01, 0., 0]);
        console.log("sag", m);
    }
}

class PendulumPawn {
    setup() {
        let d = this.actor.chains || 9; // hack until we resolve the setup ordering issue.
        if (!this.group) {
            this.group = new Worldcore.THREE.Group();
            this.group.name = "Chain";
        }

        this.group.children.forEach((c) => {
            this.group.remove(c);
        });
        this.group.children = [];

        this.spheres = [...Array(d - 1).keys()].map(i => {
            let geometry = new Worldcore.THREE.SphereGeometry(0.1, 16, 16);
            let material = new Worldcore.THREE.MeshStandardMaterial({color: (i / d * 200) * 0x10000});
            let sphere = new Worldcore.THREE.Mesh(geometry, material);
            this.group.add(sphere);
            sphere.castShadow = true;
            return sphere;
        });

        this.shape.add(this.group);
        this.listen("updateDisplay", "updateDisplay");

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }

    updateDisplay() {
        let ms = this.actor.ms;
        if (!this.original) {
            this.original = this.shape.children.find((o) => o.name !== "Chain");
        }
        if (ms) {
            for (let i = 0; i < ms.length; i++) {
                let m = ms[i];
                let s = (i < ms.length - 1) ? this.group.children[i] : this.original;
                if (!s) {
                    console.log("masses and spheres mismatch");
                } else {
                    s.position.set(...m.p);
                }
            }
        }
    }
}

export default {
    modules: [
        {
            name: "Pendulum",
            actorBehaviors: [PendulumActor],
            pawnBehaviors: [PendulumPawn]
        }
    ]
}

/* globals Worldcore */
