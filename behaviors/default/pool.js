
// pool.js
// Croquet Microverse
// A variable sized rectangular pool of water


class PoolActor {
    setup() {
        this.future(1000).update();
        let version = '0.1';
    }

    update(){
        this.say("updatePool", this.now());
        this.future(20).update();
    }
}

class PoolPawn {
    setup() {
        this.constructPool();
        this.listen("updatePool", this.updatePool);
    }

    constructPool(){
        const THREE = Microverse.THREE;
        return Promise.all([
            import("../assets/src/WaterReflector.js"),
        ]).then(([water_S]) => {
            let waterNormals = this.loadTextureAsset("./assets/images/waternormals.jpg");
            let size = this.actor._cardData.poolSize;
            const waterGeometry = new THREE.PlaneGeometry( ...size );
            waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
            let sunVector = new THREE.Vector3(-1, 1, 1);
            sunVector.normalize();
            this.water = new water_S.Water(
                waterGeometry,
                {
                    textureWidth: 512,
                    textureHeight: 512,
                    waterNormals: waterNormals,
                    sunDirection: sunVector,
                    sunColor: 0xffffff,
                    //waterColor: 0xaaaaff, //0x001eff,
                    distortionScale: 3.7,
                    turbulence: 0.25,
                    waterColor: 0x4466ff, //0x5588aa,
                    //side:THREE.DoubleSide,
                    //fog: scene.fog !== undefined
                }
            );
            console.log(this.water);
            this.water.rotation.x=-Math.PI/2;
            this.shape.add(this.water);
        });
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

    updatePool(t){
        if(this.water && this.water.material)this.water.material.uniforms[ 'time' ].value = t*0.0001;
    }
}

export default {
    modules: [
        {
            name: "Pool",
            actorBehaviors: [PoolActor],
            pawnBehaviors: [PoolPawn],
        }
    ]
}