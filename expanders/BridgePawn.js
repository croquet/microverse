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
        window.Bridge = this;
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

/* global WorldCore */
