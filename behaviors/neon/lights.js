class LightPawn {
    setup() {
        console.log("LightPawn");

        this.removeLights();
        this.lights = [];

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
            [...this.lights].forEach((light) => {
                light.dispose();
                this.shape.remove(light);
            });
        }
        delete this.lights;

        if (this.csm) {
	    for ( let i = 0; i < this.csm.lights.length; i ++ ) {
	        this.csm.parent.remove( this.csm.lights[ i ].target );
	    }
            this.csm.remove();
            this.csm.dispose();
            delete this.csm;
        }
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
