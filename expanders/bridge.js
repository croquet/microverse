class BridgeActor {
    setup() {
        this.dimension = 9;
        this.ms = [...Array(this.dimension).keys()].map(j => {
            return [...Array(this.dimension).keys()].map(i => ({x: i, y: j, m: 1, a: [0, 0, 0], v: [0, 0, 0], p: [i * 1, 0, j * 1]}));
        });

        this.springs = [];
        for (let j = 0; j < this.dimension; j++) {
            for (let i = 0; i < this.dimension; i++) {
                if (i !== this.dimension - 1) {
                    this.springs.push({
                        length: 1,
                        naturalLength: 1,
                        s0: this.ms[j][i],
                        s1: this.ms[j][i + 1]
                    });
                }
                if (j !== this.dimension - 1) {
                    this.springs.push({
                        length: 1,
                        naturalLength: 1,
                        s0: this.ms[j][i],
                        s1: this.ms[j + 1][i]
                    });
                }
            }
        }

        this.addEventListener("click", "sag");
        if (!this.stepping) {
            console.log("new step");
            this.stepping = true;
            this.step();
        }
    }

    step() {
        if (!this.stepping) {return;}
        let d = this.dimension;
        for (let j = 0; j < this.dimension; j++) {
            for (let i = 0; i < this.dimension; i++) {
                this.ms[j][i].a = [0, -0.0001, 0];
            }
        }

        let isCorner = (i, j) => {
            return (i === 0 && j === 0) || (i === 0 && j === d - 1) ||
                (i === d - 1 && j === 0) || (i === d - 1 && j === d - 1);
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

            let len = WorldCore.v3_magnitude(n);

            let a = len - spring.naturalLength;
            let c = 0.8;

            let add0 = WorldCore.v3_scale(n, a * c);
            let add1 = WorldCore.v3_scale(n, -a * c);

            if (v3_nan(add0) || v3_nan(add1) || hasNaN(s0) || hasNaN(s1)) {debugger;}
            s0.a = WorldCore.v3_add(s0.a, add0);
            s1.a = WorldCore.v3_add(s1.a, add1);
        }

        for (let j = 0; j < this.dimension; j++) {
            for (let i = 0; i < this.dimension; i++) {
                let m = this.ms[j][i];
                if (!isCorner(i, j)) {
                    m.v = WorldCore.v3_add(m.v, m.a);
                } else {
                    m.v = [0, 0, 0];
                }

                m.v = WorldCore.v3_scale(m.v, 0.99)
                m.p = WorldCore.v3_add(m.p, m.v);
            }
        }
        this.say("updateDisplay");
        this.future(20).step();
    }

    sag() {
        let d = this.dimension;
        console.log(d);
        d = Math.floor(d / 2);
        let m = this.ms[d][d];
        m.v = WorldCore.v3_add(m.v, [0, 0.02, 0]);
        window.middle = m;
        console.log("sag", m);
    }
}

class BridgePawn {
    setup() {
        let d = this.actor.dimension || 9; // hack until we resolve the setup ordering issue.
        if (!this.group) {
            this.group = new WorldCore.THREE.Group();
            this.group.name = "Bridge";
        }

        if (this.spheres) {
            for (let j = 0; j < this.spheres.length; j++) {
                let row = this.spheres[j];
                for (let i = 0; i < d; i++) {
                    this.group.remove(row[i]);
                }
            }
        }

        this.spheres = [...Array(d).keys()].map(j => {
            return [...Array(d).keys()].map(i => {
                let geometry = new WorldCore.THREE.SphereGeometry(0.1, 16, 16);
                let material = new WorldCore.THREE.MeshStandardMaterial({color: (i / d * 200) * 0x10000 + (j / d * 201)});
                let sphere = new WorldCore.THREE.Mesh(geometry, material);
                this.group.add(sphere);
                return sphere;
            });
        });
        this.renderObject.add(this.group);
        this.scriptListen("updateDisplay", "updateDisplay");

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }

    updateDisplay() {
        let ms = this.actor.ms;
        if (ms) {
            for (let j = 0; j < ms.length; j++) {
                let sRow = this.spheres[j];
                let mRow = ms[j];
                for (let i = 0; i < mRow.length; i++) {
                    let m = mRow[i];
                    let s = sRow[i];
                    if (!s) {console.log("masses and spheres mismatch");}
                    s.position.set(...m.p);
                }
            }
        }
    }
}

export let bridge = {
    expanders: [BridgeActor, BridgePawn]
}

/* globals WorldCore */
