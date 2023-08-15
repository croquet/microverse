// the following import statement is solely for the type checking and
// autocompletion features in IDE.  A Behavior cannot inherit from
// another behavior or a base class but can use the methods and
// properties of the card to which it is installed.
// The prototype classes ActorBehavior and PawnBehavior provide
// the features defined at the card object.

import {PawnBehavior} from "../PrototypeBehavior";

class LightPawn extends PawnBehavior {
    setup() {
        let trm = this.service("ThreeRenderManager");
        let group = this.shape;
        let THREE = Microverse.THREE;
        // window.myRenderer = trm;

        if (this.actor._cardData.toneMappingExposure !== undefined) {
            trm.renderer.toneMappingExposure = this.actor._cardData.toneMappingExposure;
        }

        this.removeLights();
        this.lights = [];

        const ambient = new THREE.AmbientLight( 0xffffff, .5 );
        group.add(ambient);
        this.lights.push(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
        sun.position.set(9, 150, -10);
        sun.castShadow = true;
        sun.shadow.blurSamples = 5;
        sun.shadow.camera.left = 40;
        sun.shadow.camera.right = -30;
        sun.shadow.camera.top = 30;
        sun.shadow.camera.bottom = -30;
        sun.shadow.mapSize.width = 2048; // default
        sun.shadow.mapSize.height = 2048; // default
        sun.shadow.normalBias = 1e-2;
        sun.shadow.bias = - 1e-3;
        sun.shadow.radius = 4;
        group.add(sun);
        this.lights.push(sun);

        const blueLight = new THREE.DirectionalLight(0x444488, 0.5);
        blueLight.position.set(1, 100, 150);
        group.add(blueLight);
        this.lights.push(blueLight);

        const redLight = new THREE.DirectionalLight(0x774444, 0.5);
        redLight.position.set(1, 100, -150);
        group.add(redLight);
        this.lights.push(redLight);

        this.constructBackground(this.actor._cardData);

        let moduleName = this._behavior.module.externalName;
        this.addUpdateRequest([`${moduleName}$LightPawn`, "update"]);

        this.listen("updateShape", "updateShape");
    }

    removeLights() {
        if (this.lights) {
            [...this.lights].forEach((light) => {
                if (light.dispose) {
                    light.dispose();
                }
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
                let pmremGenerator = new Microverse.THREE.PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();

                // we treat the color space of the loaded exr texture.
                // texture.colorSpace = THREE.SRGBColorSpace;

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
            }).then(() => {
                if (this.actor._cardData.loadSynchronously) {
                    this.publish(
                        this.sessionId, "synchronousCardLoaded", {id: this.actor.id});
                }
            });
        });
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
