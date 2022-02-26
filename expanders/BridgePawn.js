class BridgePawn {
    setup() {
        let d = this.actor.dimension;
        if (!this.group) {
            this.group = new WorldCore.THREE.Group();
            this.group.name = "Bridge";
        }

        if (this.spheres) {
            for (let j = 0; j < d; j++) {
                for (let i = 0; i < d; i++) {
                    this.group.remove(this.spheres[j][i])
                }
            }
        }

        this.spheres = [...Array(d).keys()].map(j => {
            return [...Array(d).keys()].map(i => {
                let geometry = new WorldCore.THREE.SphereGeometry(0.1, 16, 16);
                let material = new WorldCore.THREE.MeshStandardMaterial({color: (i/d * 200) * 0x10000 + (j/d * 200)});
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
        let d = this.actor.dimension;
        let ms = this.actor.ms;
        for (let j = 0; j < d; j++) {
            for (let i = 0; i < d; i++) {
                let m = ms[j][i];
                this.spheres[j][i].position.set(...m.p);
            }
        }
    }
}

/* global WorldCore */
