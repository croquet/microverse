class LightPawn {
    setup() {
        console.log("LightPawn");
        let trm = this.service("ThreeRenderManager");
        let scene =  trm.scene;
        let camera = trm.camera;
        let group = this.shape;

        this.removeLights();
        this.lights = [];

        //let ambient = new Microverse.THREE.AmbientLight( 0xffffff, .0 );
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
            {v: [18, 30, 10], s: true},
            {v: [1.8, 30, 14], s: false},
            {v: [25.25, 10, -32.02], s: false},
        ];
        points.forEach((pair) => {
            let v = pair.v
            let point = new Microverse.THREE.PointLight(0xffffff, 0.5);
            point.position.set(...v);
            if (pair.s) {
                point.castShadow = true;
            }
            this.lights.push(point);
            group.add(point);
        });

        let directional = new Microverse.THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(2, 20, 30);
        // directional.castShadow = true;
        this.lights.push(directional);
        group.add(directional);
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
            return assetManager.load(buffer, dataType, Microverse.THREE, options).then((texture) => {
                let TRM = this.service("ThreeRenderManager");
                let renderer = TRM.renderer;
                let scene = TRM.scene;
                let pmremGenerator = new Microverse.THREE.PMREMGenerator(renderer);
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

/* globals Microverse */
