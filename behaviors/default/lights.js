class LightPawn {
    setup() {
        console.log("LightPawn");
        let trm = this.service("ThreeRenderManager");
        let scene =  trm.scene;
        let camera = trm.camera;
        let group = this.shape;
        window.scene = scene;

        this.removeLights();

        this.setupCSM(scene, camera, Worldcore.THREE);


        const ambient = new Worldcore.THREE.AmbientLight( 0xffffff, .75 );
        group.add(ambient);
        this.lights.push(ambient);

        const sun = new Worldcore.THREE.DirectionalLight( 0xffe0b5, 1 );
        sun.position.set(400, 500, 400);
        group.add(sun);
        this.lights.push(sun);

        const moon = new Worldcore.THREE.DirectionalLight( 0x6cbbff, 0.5 );
        moon.position.set(200, 100, -100);
        group.add(moon);
        this.lights.push(moon);

        const hemiLight = new Worldcore.THREE.HemisphereLight(0xffeeb1, 0xc7ccff, 0.25);
        group.add(hemiLight);
        this.lights.push(hemiLight);
        group.name = "Light Card";

        this.constructBackground(this.actor._cardData);
        this.addUpdateRequest(["LightPawn", "update"]);

        this.scriptListen("updateShape", this.updateShape);
    }

    removeLights() {
        if (this.lights) {
            this.lights.forEach((light) => {
                this.shape.remove(light);
            });
        }
        this.lights = [];
    }

    destroy() {
        console.log("destroy lights");
        if(this.background)this.background.dispose();
        this.removeLights();
    }

    updateShape(options) {
        this.constructBackground(options);
    }

    constructBackground(options) {
        let assetManager = this.service("AssetManager").assetManager;
        let dataType = options.dataType;
        if (!options.dataLocation) {return;}
        return this.getBuffer(options.dataLocation).then((buffer) => {
            return assetManager.load(buffer, dataType, Worldcore.THREE, options).then((texture) => {
                let TRM = this.service("ThreeRenderManager");
                let renderer = TRM.renderer;
                let scene = TRM.scene;
                let pmremGenerator = new Worldcore.THREE.PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();

                let exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
                let exrBackground = exrCubeRenderTarget.texture;
                    
                let bg = scene.background;
                let e = scene.environment;
                scene.background = exrBackground;
                scene.environment = exrBackground;
                if(e !== bg) if(bg) bg.dispose();
                if(e) e.dispose();
                texture.dispose();
            });
        });
    }

    setupCSM(scene, camera, THREE) {
        if (this.csm) {
            this.csm.remove();
            this.csm = null;
        }

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

    update(_time) {
        if(this.csm) this.csm.update();
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

/* globals Worldcore */
