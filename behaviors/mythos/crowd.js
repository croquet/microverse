// Crowd manager
// Croquet Microverse
// Generate and animate many, many bots...

class CrowdActor {
    setup() {
        this.range = 1000;
        this.speed = 0.125; // don't move very fast yet
        this.height = 1.9; // height above the terrain
        let r2 = this.range/2;
        
        this.crowdSize = 5000;
        this.crowd = [];
        this.color1 = 0xaaaaaa;
        this.color2 = 0x6666ff;
        this.color3 = 0xff6666;
        for(let i=0; i<this.crowdSize; i++){
            let p = [Math.random()*this.range-r2, 0, Math.random()*this.range-r2]; //current position
            let n = [Math.random()*this.range-r2, 0, Math.random()*this.range-r2]; //next position
            let d = [n[0]-p[0], 0, n[2]-p[2]]; //delta
            let ds = Math.sqrt(d[0]*d[0]+d[2]*d[2]);
            d = [d[0]/ds, 0, d[2]/ds];
            let yaw = Math.atan2(d[0], d[2]);
            let color = i%10 !== 0? this.color1 : i%100 !==0? this.color2 : this.color3; // color
           // if(ds<0.0001){n=[1,0], ds = 1}
            d[0]*=this.speed; d[2]*=this.speed;
            this.crowd.push(
                [p, // current position
                n, // go to next position
                d, // delta
                yaw, // yaw value
                Math.random()*Math.PI, // used as offset for sin computation
                1+Math.random()/10, // scale time so crowd isn't so lock step
                color,
                this.now()+15000+Math.random()*10000
                ]
            )
        }
        this.updateCrowd();
    }

    resetBot(index){
        let r2 = this.range/2;
        let c = this.crowd[index];
        let p = c[0];
        let n = [Math.random()*this.range-r2, 0, Math.random()*this.range-r2]; //next position
        let d = [n[0]-p[0], 0, n[2]-p[2]]; //delta
        let ds = Math.sqrt(d[0]*d[0]+d[2]*d[2]);
        d = [d[0]/ds, 0, d[2]/ds];
        d[0]*=this.speed; d[2]*=this.speed;
        let yaw = Math.atan2(d[0], d[2]);
        c[1] = n;
        c[2] = d;
        c[3] = yaw;
        c[7] = this.now()+15000+Math.random()*10000;
    }

    updateCrowd(){
        //let players = this.service("PlayerManager").players;
        //console.log("------------updateCrowd", players)
        let now = this.now();
        for(let i=0; i<this.crowdSize; i++){
            //for(const value of players.values()){
                //value.translation
            //}
            let c = this.crowd[i];
            if(c[7]<now)this.resetBot(i);
            else{
                c[0][0] += c[2][0];
                c[0][1] = this.height + 0.1* Math.sin(c[5]*(c[4]+0.004*this.now())); // bobbing
                c[0][2] += c[2][2];
            }
        }

        this.future(100).updateCrowd();
        this.say("updateCrowd");
    }
}

class CrowdPawn {
    setup() {
        console.log("CrowdPawn.setup");
        this.listen("updateCrowd", this.updateCrowd);
        // Mask by: https://www.thingiverse.com/kongorilla/designs
        const loader = new Microverse.THREE.GLTFLoader();
        console.log(loader);
        loader.load("./assets/3D/mask.glb",mask=>this.installMask(mask), ()=>{},
        err=>{console.log("Error on load:",err)})
    }

    installMask(mask){

        // construct the instanced group
        this.crowdGroup = new Microverse.THREE.Group();
        this.mask = mask.scene.children[0];
        this.mask.material.side = Microverse.THREE.DoubleSide;
        let crowdSize = this.actor.crowdSize;
        let crowd = this.actor.crowd;
        this.crowdMask = new Microverse.THREE.InstancedMesh(this.mask.geometry, this.mask.material, crowdSize);
        // set the colors because those don't change
        for(let i=0; i<this.actor.crowdSize; i++){
            //console.log(crowd[i][6])
            this.crowdMask.setColorAt(i,new Microverse.THREE.Color(crowd[i][6]));
        }
        this.shape.add(this.crowdMask);
        this.updateCrowd();
    }

    updateCrowd(){
        // get the terrain
        let terrainLayer = this.service("ThreeRenderManager").threeLayer("terrain");
        if(terrainLayer.length){ // should be at least 1
            let handlerModuleName = 'Terrain';
            let pawn = terrainLayer[0].wcPawn;
            if (pawn.has(`${handlerModuleName}$TerrainPawn`, "getHeightFast")) {
                // initialize the positions
                let crowd = this.actor.crowd; // array of the crowd
                let crowdSize = this.actor.crowdSize;
                let height = this.actor.height; // height above the terrain
                let m4 = new THREE.Matrix4();
                for(let i=0; i<crowdSize; i++){
                    let c = crowd[i];
                    let pos = c[0];
                    let h = pawn.call(`${handlerModuleName}$TerrainPawn`, "getHeightFast", pos);
                    m4.makeRotationY(c[3]); // yaw angle
                    m4.setPosition(pos[0], h+pos[1], pos[2]);
                    //console.log(pos[0],h,pos[1]);
                    this.crowdMask.setMatrixAt(i, m4);
                }
                this.crowdMask.instanceMatrix.needsUpdate = true;
            }
        }
    }
}

export default {
    modules: [
        {
            name: "Crowd",
            actorBehaviors: [CrowdActor],
            pawnBehaviors: [CrowdPawn],
        }
    ]
}
