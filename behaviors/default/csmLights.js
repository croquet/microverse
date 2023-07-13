class LightPawn {
    setup() {
        let trm = this.service("ThreeRenderManager");
        let scene =  trm.scene;
        let camera = trm.camera;
        let group = this.shape;

        if (this.actor._cardData.toneMappingExposure !== undefined) {
            trm.renderer.toneMappingExposure = this.actor._cardData.toneMappingExposure;
        }

        this.removeLights();
        this.lights = [];

        this.setupCSM(scene, camera, Microverse.THREE);

        const ambient = new Microverse.THREE.AmbientLight( 0xffffff, .5 );
        group.add(ambient);
        this.lights.push(ambient);

        this.constructBackground(this.actor._cardData);

        let moduleName = this._behavior.module.externalName;
        this.addUpdateRequest([`${moduleName}$LightPawn`, "update"]);

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

        if (this.csm) {
            this.csm.remove();
            this.csm.dispose();
            delete this.csm;
        }
    }

    teardown() {
        console.log("teardown lights");
        this.removeLights();
        let scene = this.service("ThreeRenderManager").scene;
        scene.background?.dispose();
        scene.environment?.dispose();
        scene.background = null;
        scene.environment = null;

    }

    updateShape(options) {
        this.constructBackground(options);
    }

    constructBackground(options) {
        let assetManager = this.service("AssetManager").assetManager;
        let dataType = options.dataType;
        if (!options.dataLocation) {return;}
        return this.getBuffer(options.dataLocation).then((buffer) => {
            return assetManager.load(buffer, dataType, Microverse.THREE, options).then((texture) => {
                let TRM = this.service("ThreeRenderManager");
                let renderer = TRM.renderer;
                let scene = TRM.scene;

                // we treat the color space of the loaded exr texture.
                texture.colorSpace = Microverse.THREE.SRGBColorSpace;

                let pmremGenerator = new Microverse.THREE.PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();

                let exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
                let exrBackground = exrCubeRenderTarget.texture;

                // we don't set the color space for exrBackground as PMREM generator
                // spits out purposefully
                // srgb-linear color space and we don't necessarily override it.
                // exrBackground.colorSpace = THREE.SRGBColorSpace;

                let bg = scene.background;
                let e = scene.environment;
                scene.background = exrBackground;
                scene.environment = exrBackground;
                if(e !== bg) if(bg) bg.dispose();
                if(e) e.dispose();
                texture.dispose();
                if (this.actor._cardData.loadSynchronously) {
                    this.publish(this.sessionId, "synchronousCardLoaded", {id: this.actor.id});
                }
            });
        });
    }

    setupCSM(scene, camera, THREE) {
        if (this.csm) {
            this.csm.remove();
            this.csm.dispose();
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

/* globals Microverse */
