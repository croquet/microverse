// Croquet Microverse
// Generates an infinite procedural hillside with blowing grass
//
// To do:
// turn off sound on phones - terrible w/o headphones
// horses
// the tree needs to sway in the wind
// interface to turn music/sound on/off (and other things)
// stones
// switch to PDF viewer w/ presentation describing the world.
// birds
// butterflies
// music - needs Aran's library
// event handler behavior
// big weenie
// set wind volume to height
// move the water plane to be just in front of the avatar - can be smaller and cover more area
// 
// X burning ball - press "f" to view
// X Many, many bots - press 1 to increase by 10, 2 to increase by 100. Max is 5000.
// X start screen - use a plane in front of avatar?
// X stop sound when you are under water (perhaps underwater sound then?)
// X wind gusts affect sound and grass
// X temple
// X fix walking/falling

class TerrainActor {
    setup() {
        this.future(20).update();
        this.future(10000).highWind([0, 0.1]);
    }

    update(){
        this.say("updateWorld", this.now());
        this.future(20).update();
    }

    highWind(data){
        // wind values go from 0-1 and 1-0
        if(data[0]>=0&&data[0]<=1) { 
            this.publish("global", "setWind", data[0]); // 
            this.future(100).highWind([data[0]+data[1], data[1]]); // ramp up/down the wind
        }
        else { // start a new cycle
            if(data[0]>1) this.future(5000+Math.random()*5000).highWind([1,-0.1]);
            else this.future(15000+Math.random()*15000).highWind([0, 0.1]);
        }
    }
}


class TerrainPawn {
    setup() {
//console.log("Constructing hillside");
        this.numGrassBlades = 500000;
        this.grassPatchRadius = 175.0;
        this.heightFieldSize = 3072.0;
        this.heightFieldHeight = 180.0;
        this.scaleHill = 0.4;
        this.invScaleHill = 1.0/this.scaleHill;
        this.waterLevel = this.heightFieldHeight * 0.305556;
        this.waterGlobal = -16.695;
        this.inWater = false;
        this.fogColor = new THREE.Color(0.74, 0.77, 0.91);
        this.grassColor = new THREE.Color(0.45, 0.46, 0.19);
        this.waterColor = new THREE.Color(0.6, 0.7, 0.85);
        this.fogDist = this.scaleHill*this.grassPatchRadius * 20.0;
        this.grassFogDist = this.scaleHill*this.grassPatchRadius * 2.0;

        this.height = -0.430*this.heightFieldHeight/2; // where is the terrain?

        const scene = this.service("ThreeRenderManager").scene;
        scene.fog = new THREE.Fog(this.fogColor.getHex(), 0.1, this.fogDist);

        this.constructHillside();
        this.listen("updateWorld", this.update);
        this.subscribe("global", "setWind", this.setWind);
    }

    async constructHillside() {
        const THREE = Microverse.THREE;

        // images
        let heightmap_I = await this.loadImageAsset("./assets/images/heightmap.jpg");
        let noise_I = await this.loadImageAsset("./assets/images/noise.jpg");
        // textures
        let grass_T = this.loadTextureAsset("./assets/images/grass.jpg");
        let terrain1_T = this.loadTextureAsset("./assets/images/terrain1.jpg");
        let terrain2_T = this.loadTextureAsset("./assets/images/terrain2.jpg");
        let waterNormals = this.loadTextureAsset("./assets/images/waternormals.jpg");
       // let skydome_T = this.loadTextureAsset("./assets/images/skydome.jpg");
       // let skyenv_T = this.loadTextureAsset("./assets/images/skyenv.jpg");
        // shaders
        let grassVert = await fetch('./assets/shaders/grass.vert.glsl').then((resp) => resp.text());
        let grassFrag = await fetch('./assets/shaders/grass.frag.glsl').then((resp) => resp.text());
        let terrainVert = await fetch('./assets/shaders/terrain.vert.glsl').then((resp) => resp.text());
        let terrainFrag = await fetch('./assets/shaders/terrain.frag.glsl').then((resp) => resp.text());
 //       let waterVert = await fetch('./assets/shaders/water.vert.glsl').then((resp) => resp.text());
 //       let waterFrag = await fetch('./assets/shaders/water.frag.glsl').then((resp) => resp.text());

        return Promise.all([
            //import("/assets/src/skydome.js"),
            import("/assets/src/heightfield.js"),
            import("/assets/src/grass.js"),
            import("/assets/src/terrain.js"),
            import("/assets/src/terramap.js"),
            // import("/assets/src/water.js"),
            import("/assets/src/WaterReflector.js"),
            import("/assets/src/simplex.js")
        ]).then(([heightfield_S, grass_S, terrain_S, terramap_S, water_S, simplex_S]) => {

            var BEACH_TRANSITION_LOW = 0.31;
            var BEACH_TRANSITION_HIGH = 0.36;
            this.WIND_DEFAULT = 1.0;

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
            this.waterWorld = (this.waterLevel-this.group.position.y)*this.scaleHill;
            // Setup heightfield
            var hfCellSize = this.heightFieldSize / heightmap_I.width;
            var heightMapScale = new THREE.Vector3(1.0 / this.heightFieldSize, 1.0 / this.heightFieldSize, this.heightFieldHeight);
            this.heightField = new heightfield_S.Heightfield({
                cellSize: hfCellSize,
                minHeight: 0.0,
                maxHeight: heightMapScale.z,
                image: heightmap_I
            });
//console.log("heightField:", this.heightField)
            var LIGHT_DIR = new THREE.Vector3(0.0, 1.0, -1.0);
            LIGHT_DIR.normalize(LIGHT_DIR, LIGHT_DIR);
            var tMap = terramap_S.createTexture(this.heightField, LIGHT_DIR, noise_I);
            this.windIntensity = this.WIND_DEFAULT;

//console.log("tMap:", tMap);       


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
            this.grass.mesh.raycast = ()=>{};
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
            this.terrain.mesh.raycast = ()=>{};
            this.group.add(this.terrain.mesh);

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
                    side:THREE.DoubleSide,
                    fog: scene.fog !== undefined
                }
            );
        this.water.position.z = this.waterLevel; // in terrain coordinates and rotation
        this.group.add(this.water);
        });
    }

    setWind(val){
        if(this.grass){ // grass may not yet exist
            this.windIntensity = this.WIND_DEFAULT+val*2.5; 
            var mat = this.grass.mesh.material;
            mat.uniforms['windIntensity'].value = this.windIntensity;
        }
    }

    loadTextureAsset(URL){
//console.log("loadTextureAsset "+URL)
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
        
        return new Promise((resolve, reject) => {
            new Microverse.THREE.ImageLoader().load(URL, (image) => {
                resolve(assetManager.fillCacheIfAbsent(URL, () => image, this.id));
            });
        });
    }

    loadFileAsset(URL){
        let assetManager = this.service("AssetManager").assetManager;
        return assetManager.fillCacheIfAbsent(URL, () => {
            return new Microverse.THREE.FileLoader().load(URL);
        }, this.id);
    }

    getHeight(pos, eyeHeight){ // given an x,y,z location compute the depth in the height field
        let z = pos[1];
        let inv = this.invScaleHill; // invert my location to find height
        let hfh = -this.heightField.heightAt(inv*pos[0], -inv*pos[2], true);
        let pht = inv*this.height; // height of terrain mesh in scaled down size
        let ht = this.scaleHill*(pht-hfh); //scale the height to world
        let delta = z-ht; // how far above am I?
        let h = (delta<eyeHeight) ? ht+eyeHeight : z; // NEVER go below the terrain
        if(h< this.waterGlobal && !this.inWater){
            this.inWater = true;
            this.publish("global", "scaleWind", 0);
            console.log("into water")
        }
        if(h> this.waterGlobal && this.inWater){
            this.inWater = false;
            this.publish("global", "scaleWind", 1); 
            console.log("out of water");
        }
        return h;
    }

    getHeightFast(pos){ // given an x,y,z location compute the depth in the height field
        if(!this.heightField)return 0;
        let inv = this.invScaleHill; // invert my location to find height
       // console.log(inv*pos[0], -inv*pos[1])
        let hfh = -this.heightField.heightAt(inv*pos[0], -inv*pos[2], true);
       // console.log(hfh)
        let pht = inv*this.height; // height of terrain mesh in scaled down size
        let ht = this.scaleHill*(pht-hfh); //scale the height to world
       // console.log(ht)
        return ht;
    }

    update(t){
        let avatar = Microverse.GetPawn( this.actor.service("PlayerManager").players.get(this.viewId).id);
        if(this.grass && avatar){
            const camera = this.service("ThreeRenderManager").camera;

            let cameraDir = camera.getWorldDirection(new THREE.Vector3());
            if(cameraDir.y!==1.0){
                cameraDir.y = 0;
                cameraDir.normalize();
            }

            let scaleLoc = 1/this.scaleHill;
            var avatarPos = new THREE.Vector2(scaleLoc*avatar.translation[0],-scaleLoc*avatar.translation[2])
            var drawPos = new THREE.Vector2(avatarPos.x+cameraDir.x*this.grassPatchRadius, 
                avatarPos.y-cameraDir.z*this.grassPatchRadius);
            cameraDir.set(cameraDir.x, -cameraDir.z, cameraDir.y);

            this.grass.update(t*0.001, cameraDir, drawPos);

            this.terrain.update(avatarPos.x, avatarPos.y);

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

        assetManager.revoke("./assets/images/heightmap.jpg", this.id);
        assetManager.revoke("./assets/images/noise.jpg", this.id);
        assetManager.revoke("./assets/images/grass.jpg", this.id);
        assetManager.revoke("./assets/images/terrain1.jpg", this.id);
        assetManager.revoke("./assets/images/terrain2.jpg", this.id);
        assetManager.revoke("./assets/images/skydome.jpg", this.id);        
        assetManager.revoke("./assets/images/skyenv.jpg", this.id);
    }
}

export default {
    modules: [
        {
            name: "Terrain",
            actorBehaviors: [TerrainActor],
            pawnBehaviors: [TerrainPawn]
        }
    ]
}

/* globals Microverse */
