class LightPawn {
    setup() {
        console.log("LightPawn");

        this.removeLights();

        const ambient = new Microverse.THREE.AmbientLight( 0xcc99ff, .5 );
        this.shape.add(ambient);
        this.lights.push(ambient);

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
