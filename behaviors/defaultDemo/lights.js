class LightPawn {
    setup() {
        let trm = this.service("ThreeRenderManager");
        let scene =  trm.scene;
        let camera = trm.camera;
        this.setupCSM(scene, camera, Worldcore.THREE);
        let group = this.shape;

        const ambient = new Worldcore.THREE.AmbientLight( 0xffffff, .75 );
        group.add(ambient);

        const sun = this.sun = new Worldcore.THREE.DirectionalLight( 0xffe0b5, 1 );
        sun.position.set(400, 500, 400);
        group.add(sun);

        this.moon = new Worldcore.THREE.DirectionalLight( 0x6cbbff, 0.5 );
        this.moon.position.set(200, 100, -100);
        group.add(this.moon);

        this.hemiLight = this.hemiLight = new Worldcore.THREE.HemisphereLight(0xffeeb1, 0xc7ccff, 0.25);
        group.add(this.hemiLight);
        group.name = "Light Card";
    }

    destroy() {
        console.log("destroy lights")
        if(this.background)this.background.dispose();
        this.sun.dispose();
        this.hemiLight.dispose();
        this.moon.dispose();
        super.destroy();
    }

    setupCSM(scene, camera, THREE){
        let dir = new THREE.Vector3(-2,-2,-0.5);
        this.csm = new THREE.CSM({
            fade: true,
            far: camera.far,
            maxFar: 1000,
            cascades: 3,
            shadowMapSize: 2048,
            shadowbias: 0.00025,
            lightDirection: dir,
            camera: camera,
            parent: scene,
            lightIntensity: 0.6,
            lightFar: 1000,
            mode: "practical"
          });
        this.csm.update();
    }

    update(time){
        if(this.csm)this.csm.update();
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