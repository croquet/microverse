class LightPawn {
    setup() {
        console.log("LightPawn");

        this.removeLights();

        const ambient = new Microverse.THREE.AmbientLight( 0xffffff, .5 );
        this.shape.add(ambient);
        this.lights.push(ambient);

        const pointLight = new THREE.PointLight( 0xffffff, 0.2 );
        pointLight.position.set( 0, 30, 0 );
        this.shape.add(pointLight);
        this.lights.push(pointLight);
    }

    removeLights() {
        if (this.lights) {
            this.lights.forEach((light) => {
                this.shape.remove(light);
            });
        }
        this.lights = [];
    }

    teardown() {
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
