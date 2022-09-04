// Crowd manager
// Croquet Microverse
// Generate and animate many, many bots...

class CrowdActor {
    setup() {
        this.maxCrowdSize = 5000;
        this.crowdSize = 1000;
        this.range = 1000;
        this.speed = 0.125; // don't move very fast yet
        this.height = 1.9; // height above the terrain
        let r2 = this.range/2;

        this.crowd = [];
        this.color1 = 0xaaaaaa;
        this.color2 = 0x6666ff;
        this.color3 = 0xff6666;
        for(let i=0; i<this.maxCrowdSize; i++){
            let p = [Math.random()*this.range-r2, 0, Math.random()*this.range-r2]; //current position
            let color = i%10 !== 0? this.color1 : i%100 !==0? this.color2 : this.color3; // color
            this.crowd.push(
                [p, // current position
                [0,0,0], // go to next position
                [0,0,0], // delta
                0, // yaw value
                Math.random()*Math.PI, // used as offset for sin computation
                1+Math.random()/10, // scale time so crowd isn't so lock step
                color, // bot color
                0,// how long till it changes direction
                0 // player counter
                ]
            )
            this.resetBot(i, this.speed);
        }
        this.updateCrowd();
    }

    resetBot(index, speed, delta){
        let r2 = this.range/2;
        let c = this.crowd[index];
        let p = c[0]; // current position, updated regularly
        let n = [Math.random()*this.range-r2, 0, Math.random()*this.range-r2]; //next position
        if (typeof delta === 'undefined') delta = [n[0]-p[0], 0, n[2]-p[2]]; // delta - used to move
        let ds = Math.sqrt(delta[0]*delta[0]+delta[2]*delta[2]);
        delta = [delta[0]/ds, 0, delta[2]/ds];
        delta[0]*=speed; delta[2]*=speed; 
        let yaw = Math.atan2(delta[0], delta[2]);
        c[1] = n;
        c[2] = delta;
        c[3] = yaw;
        c[7] = this.now()+15000+Math.random()*10000; // when is the next reset?
        c[8] = 0; // player counter
        c[9] = 0;
    }

    updateCrowd(){
        let collideDistance = 12;
        let players = this.service("PlayerManager").players.values();
        let avatarTranslation = [];
        for(const value of players){
            avatarTranslation.push(value.translation);
        }
        let aLen = avatarTranslation.length;
        let now = this.now();
        for(let i=0; i<this.crowdSize; i++){
            let c = this.crowd[i];
            let p = c[0]; // current position
            let aIndex = c[8];

            if(c[8]>=aLen)aIndex=0;
            c[8]=aIndex+1;
            let t = avatarTranslation.length>0?avatarTranslation[aIndex]:[0,0,0];
            let tp = [p[0]-t[0], 0, p[2]-t[2]];
            if(c[9]>10 && Math.abs(tp[0])<collideDistance && Math.abs(tp[2])<collideDistance){
                // run away from avatar
                this.resetBot(i, this.speed*5, tp);
            }else if(c[7]<now)this.resetBot(i, this.speed);
            else{
                p[0] += c[2][0];
                p[1] = this.height + 0.1* Math.sin(c[5]*(c[4]+0.004*this.now())); // bobbing
                p[2] += c[2][2];
                c[9]++;
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
        let maxCrowdSize = this.actor.maxCrowdSize;
        let crowd = this.actor.crowd;
        this.crowdMask = new Microverse.THREE.InstancedMesh(this.mask.geometry, this.mask.material, maxCrowdSize);
        // set the colors because those don't change
        for(let i=0; i<maxCrowdSize; i++){
            //console.log(crowd[i][6])
            this.crowdMask.setColorAt(i,new Microverse.THREE.Color(crowd[i][6]));
        }
        this.crowdMask.count = crowdSize;
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
