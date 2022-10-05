class LightPawn {
    setup() {
        console.log("LightPawn");
        let trm = this.service("ThreeRenderManager");
        let scene =  trm.scene;
        let group = this.shape;

        let THREE = Microverse.THREE;

        this.removeLights();
        this.lights = [];

        let keys = ["ft", "bk", "up", "dn", "rt", "lf"];

        this.background = scene.background = new THREE.CubeTextureLoader().load(
            keys.map((key) => `./assets/sky/sh_${key}.png`)
        );

        const ambient = new THREE.AmbientLight( 0xffffff, .75 );
        this.lights.push(ambient);
        group.add(ambient);

        this.listen("updateShape", "updateShape");
    }

    removeLights() {
        if (this.lights) {
            [...this.lights].forEach((light) => {
                light.dispose();
                this.shape.remove(light);
            });
        }
        delete this.lights;
        this.background?.dispose();
    }

    teardown() {
        console.log("teardown lights");
        this.removeLights();
    }
}

export default {
    modules: [
        {
            name: "Light",
            pawnBehaviors: [LightPawn]
        }
    ]
}

/* globals Microverse */
