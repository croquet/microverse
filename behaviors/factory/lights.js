class LightPawn {
    setup() {
        console.log("LightPawn");
        let trm = this.service("ThreeRenderManager");
        let scene =  trm.scene;
        let camera = trm.camera;
        let group = this.shape;

        this.removeLights();

        //let ambient = new Worldcore.THREE.AmbientLight( 0xffffff, .0 );
        // group.add(ambient);
        //this.lights.push(ambient);

        this.constructBackground(this.actor._cardData);

        this.constructDirectionalLights();

        // let moduleName = this._behavior.module.externalName;
        this.listen("updateShape", "updateShape");
    }

    constructDirectionalLights() {
        let group = this.shape;

        let points = [
            [28.74, 9.7, 12.3],
            [1.8, 9.7, 14],
            [25.25, 9.7, -32.02],
        ];
        points.forEach((p) => {
            let point = new Worldcore.THREE.PointLight(0xffffff, 0.8);
            point.position.set(...p);
            this.lights.push(point);
            group.add(point);
        });
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
        console.log("teardown lights");
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
