class HillsideActor {
    setup() {
        this.future(20).update();
    }

    update(){
        this.say("updateWorld", this.now());
        this.future(20).update();
    }
}


class HillsidePawn {
    setup() {
        console.log("Constructing hillside");
        this.numGrassBlades = 500000;
        this.grassPatchRadius = 175.0;
        this.heightFieldSize = 3072.0;
        this.heightFieldHeight = 180.0;
        this.scaleHill = 0.4;
        this.waterLevel = this.heightFieldHeight * 0.305556;
        this.fogColor = new THREE.Color(0.74, 0.77, 0.91);
        this.grassColor = new THREE.Color(0.45, 0.46, 0.19);
        this.waterColor = new THREE.Color(0.6, 0.7, 0.85);
        this.fogDist = this.scaleHill*this.grassPatchRadius * 20.0;
        this.grassFogDist = this.scaleHill*this.grassPatchRadius * 2.0;

        const scene = this.service("ThreeRenderManager").scene;
        scene.fog = new THREE.Fog(this.fogColor.getHex(), 0.1, this.fogDist);

        this.constructHillside();
        this.listen("updateWorld", this.update)
    }

    async constructHillside() {
        const THREE = Microverse.THREE;
        // images
        let heightmap_I = this.loadImageAsset("./assets/hillside/images/heightmap.jpg");
        let noise_I = this.loadImageAsset("./assets/hillside/images/noise.jpg");
        // textures
        let grass_T = this.loadTextureAsset("./assets/hillside/images/grass.jpg");
        let terrain1_T = this.loadTextureAsset("./assets/hillside/images/terrain1.jpg");
        let terrain2_T = this.loadTextureAsset("./assets/hillside/images/terrain2.jpg");
        let waterNormals = this.loadTextureAsset("./assets/hillside/images/waternormals.jpg");
       // let skydome_T = this.loadTextureAsset("./assets/hillside/images/skydome.jpg");
       // let skyenv_T = this.loadTextureAsset("./assets/hillside/images/skyenv.jpg");
        // shaders
        let grassVert = await fetch('./assets/hillside/shader/grass.vert.glsl').then((resp) => resp.text());
        let grassFrag = await fetch('./assets/hillside/shader/grass.frag.glsl').then((resp) => resp.text());
        let terrainVert = await fetch('./assets/hillside/shader/terrain.vert.glsl').then((resp) => resp.text());
        let terrainFrag = await fetch('./assets/hillside/shader/terrain.frag.glsl').then((resp) => resp.text());
 //       let waterVert = await fetch('./assets/hillside/shader/water.vert.glsl').then((resp) => resp.text());
 //       let waterFrag = await fetch('./assets/hillside/shader/water.frag.glsl').then((resp) => resp.text());

        return Promise.all([
            import("/assets/hillside/src/skydome.js"),
            import("/assets/hillside/src/heightfield.js"),
            import("/assets/hillside/src/grass.js"),
            import("/assets/hillside/src/terrain.js"),
            import("/assets/hillside/src/terramap.js"),
            // import("/assets/hillside/src/water.js"),
            import("/assets/hillside/src/WaterReflector.js"),
            import("/assets/hillside/src/simplex.js")
        ]).then(([skydome_S, heightfield_S, grass_S, terrain_S, terramap_S, water_S, simplex_S]) => {

            var BEACH_TRANSITION_LOW = 0.31;
            var BEACH_TRANSITION_HIGH = 0.36;
            var WIND_DEFAULT = 1.5;

            this.shape.children.forEach((c) => {
                c.material.dispose();
                this.shape.remove(c);
            });
            this.shape.children = []; // ??

            this.group = new THREE.Group();
            this.group.rotation.x=-Math.PI/2;
            this.shape.add(this.group);
            this.group.position.y=-0.430*this.heightFieldHeight/2;
            this.group.scale.set(this.scaleHill,this.scaleHill,this.scaleHill);
            // Setup heightfield
            var hfCellSize = this.heightFieldSize / heightmap_I.width;
            var heightMapScale = new THREE.Vector3(1.0 / this.heightFieldSize, 1.0 / this.heightFieldSize, this.heightFieldHeight);
            this.heightField = new heightfield_S.Heightfield({
                cellSize: hfCellSize,
                minHeight: 0.0,
                maxHeight: heightMapScale.z,
                image: heightmap_I
            });
console.log("heightField:", this.heightField)
            var LIGHT_DIR = new THREE.Vector3(0.0, 1.0, -1.0);
            LIGHT_DIR.normalize(LIGHT_DIR, LIGHT_DIR);
            var tMap = terramap_S.createTexture(this.heightField, LIGHT_DIR, noise_I);
            this.windIntensity = WIND_DEFAULT;

console.log("tMap:", tMap);       


            // Create a large patch of grass to fill the foreground
            this.grass = new grass_S.Grass({
                lightDir: LIGHT_DIR,
                numBlades: this.numGrassBlades,
                radius: this.grassPatchRadius,
                texture: grass_T,
                vertScript: grassVert,
                fragScript: grassFrag,
                heightMap: tMap,
                heightMapScale: heightMapScale,
                fogColor: this.fogColor,
                fogFar: this.fogDist,
                grassFogFar: this.grassFogDist,
                grassColor: this.grassColor,
                transitionLow: BEACH_TRANSITION_LOW,
                transitionHigh: BEACH_TRANSITION_HIGH,
                windIntensity: this.windIntensity,
                simplex: simplex_S
            });

            // Set a specific render order - don't let three.js sort things for us.
            this.grass.mesh.renderOrder = 10;
            this.group.add(this.grass.mesh);


            // Terrain mesh
            this.terrain = new terrain_S.Terrain({
                textures: [terrain1_T, terrain2_T],
                vertScript: terrainVert,
                fragScript: terrainFrag,
                heightMap: tMap,
                heightMapScale: heightMapScale,
                fogColor: this.fogColor,
                fogFar: this.fogDist,
                grassFogFar: this.grassFogDist,
                transitionLow: BEACH_TRANSITION_LOW,
                transitionHigh: BEACH_TRANSITION_HIGH
            });

            this.terrain.mesh.renderOrder = 20;
            this.group.add(this.terrain.mesh);


            //console.log(water_S.Water);
            //scene.add(meshes.terrain);
            /*
            this.water = new water_S.Water({
                envMap: skyenv_T,
                vertScript: waterVert,
                fragScript: waterFrag,
                waterLevel: this.waterLevel,
                waterColor: this.waterColor,
                fogColor: this.fogColor,
                fogNear: 1.0,
                fogFar: this.fogDist
            });
            this.water.mesh.renderOrder = 40;
            this.water.mesh.position.z = this.waterLevel;
            this.group.add(this.water.mesh);
            */
            const waterGeometry = new THREE.PlaneGeometry( 1000, 1000 );
            waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
            let sunVector = new THREE.Vector3(1,1,0);
            sunVector.normalize();
            this.water = new water_S.Water(
                waterGeometry,
                {
                    textureWidth: 512,
                    textureHeight: 512,
                    waterNormals: waterNormals,
                    sunDirection: sunVector,
                    sunColor: 0xffffff,
                    waterColor: 0x001eff,
                    distortionScale: 3.7,
                    fog: scene.fog !== undefined
                }
            );
        this.water.position.z = this.waterLevel;
        this.group.add(this.water);
console.log("GROUP:", this.shape, this.group)

        });
    }

    loadTextureAsset(URL){
        console.log("loadTextureAsset "+URL)
        let assetManager = this.service("AssetManager").assetManager;
        return assetManager.fillCacheIfAbsent(URL, () => {
            let tex = new Microverse.THREE.TextureLoader().load(URL);
            tex.wrapS = tex.wrapT = Microverse.THREE.RepeatWrapping;
            tex.repeat.set(1,1);
            return tex;
        }, this.id);
    }

    loadImageAsset(URL){
        let assetManager = this.service("AssetManager").assetManager;
        return assetManager.fillCacheIfAbsent(URL, () => {
            return new Microverse.THREE.ImageLoader().load(URL);
        }, this.id);
    }

    loadFileAsset(URL){
        let assetManager = this.service("AssetManager").assetManager;
        return assetManager.fillCacheIfAbsent(URL, () => {
            return new Microverse.THREE.FileLoader().load(URL);
        }, this.id);
    }

    update(t){
        let avatar = Microverse.GetPawn( this.actor.service("PlayerManager").players.get(this.viewId).id);
        if(this.grass && avatar){
            const camera = this.service("ThreeRenderManager").camera;

            let cameraPos = camera.getWorldPosition(new THREE.Vector3())
            let cameraDir = camera.getWorldDirection(new THREE.Vector3());
            if(cameraDir.y!==1.0){
                cameraDir.y = 0;
                cameraDir.normalize();
            }

        //    var drawPos = new THREE.Vector2(cameraPos.x + cameraDir.x * this.grassPatchRadius, 
        //        cameraPos.z + cameraDir.z * this.grassPatchRadius);

//var drawPos = new THREE.Vector2(4*cameraPos.x, -4*cameraPos.z);
//drawPos = new THREE.Vector2(4*cameraPos.x+cameraDir.x * this.grassPatchRadius,0);
            let scaleLoc = 1/this.scaleHill;
            var avatarPos = new THREE.Vector2(scaleLoc*avatar.translation[0],-scaleLoc*avatar.translation[2])
            var drawPos = new THREE.Vector2(avatarPos.x+cameraDir.x*this.grassPatchRadius, 
                avatarPos.y-cameraDir.z*this.grassPatchRadius);
            cameraDir.set(cameraDir.x, cameraDir.z, cameraDir.y);
            this.grass.update(t*0.001, cameraDir, drawPos);
            this.terrain.update(avatarPos.x, avatarPos.y);
           // this.water.update(avatarPos);
            this.water.position.x=drawPos.x;
            this.water.position.y=drawPos.y;
           this.water.material.uniforms[ 'time' ].value = t*0.0005;
        }
    /*
        this.terrain.update(ppos.x, ppos.y);
        this.water.update(ppos);
        */
    }

    teardown() {
        let assetManager = this.service("AssetManager").assetManager;

        assetManager.revoke("./assets/hillside/images/heightmap.jpg", this.id);
        assetManager.revoke("./assets/hillside/images/noise.jpg", this.id);
        assetManager.revoke("./assets/hillside/images/grass.jpg", this.id);
        assetManager.revoke("./assets/hillside/images/terrain1.jpg", this.id);
        assetManager.revoke("./assets/hillside/images/terrain2.jpg", this.id);
        assetManager.revoke("./assets/hillside/images/skydome.jpg", this.id);        
        assetManager.revoke("./assets/hillside/images/skyenv.jpg", this.id);
    }
}

export default {
    modules: [
        {
            name: "Hillside",
            actorBehaviors: [HillsideActor],
            pawnBehaviors: [HillsidePawn]
        }
    ]
}

/* globals Microverse */
