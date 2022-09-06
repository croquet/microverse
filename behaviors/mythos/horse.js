// Horse manager
// Croquet Microverse
// Generate and animate horses

class HorseActor {
    setup() {

        this.range = 1000;
        this.speed = 0.5; // don't move very fast yet
        this.height = 0; // height above the terrain
        let r2 = this.range/2;
        this.position = [0,0,5];
        this.yaw = -Math.PI/2;
        this.updateHorse();
    }

    rotateBy(angle) {
        this.yaw+=angle;
/*
        let q = Microverse.q_euler(0, angle, 0);
        q = Microverse.q_multiply(this.rotation, q);
        this.rotateTo(q);
*/
    }
    
    forwardBy(dist) {
        this.position[0]+=dist*Math.sin(this.yaw);
        this.position[2]+=dist*Math.cos(this.yaw);
/*
        let v = Microverse.v3_rotate([0, 0, dist], this.rotation);
        this.translateTo([
            this.translation[0] + v[0],
            this.translation[1] + v[1],
            this.translation[2] + v[2]]);
*/
       // console.log(this.position, this.translation);
    }

    updateHorse(){
        this.rotateBy(0.002);
        this.forwardBy(0.25);
        this.future(30).updateHorse();
        this.publish("global", "horsePosition", this.position);
    }
}

class HorsePawn {
    setup() {
        console.log("HorsePawn.setup");
        this.subscribe("global", "horsePosition", this.updateHorse);
        this.euler = new Microverse.THREE.Euler();
    }

    updateHorse(){
        // get the terrain
        let h = this.actor.height; //this.actor.height;
        if(this.shape.children.length>0){
            let terrainLayer = this.service("ThreeRenderManager").threeLayer("terrain");
            let handlerModuleName = 'Terrain';
            let heightPawn = terrainLayer[0].wcPawn;
            if (heightPawn.has(`${handlerModuleName}$TerrainPawn`, "getHeightFast")) {
                h += heightPawn.call(`${handlerModuleName}$TerrainPawn`, "getHeightFast", this.actor.position);
            };
            let p = [...this.actor.position];
            p[1]=h;
            this.shape.children[0].position.set(...p);
            this.euler.set(0, this.actor.yaw, 0);
            this.shape.children[0].setRotationFromEuler(this.euler);
        }


       // this.shape.position.set(...this.actor.position);
        /*
        let crowd = this.actor.crowd; // array of the crowd

        if(this.crowdMask && terrainLayer.length){ // should be at least 1
            if(this.crowdMask.count < this.actor.crowdSize){
                let color = new Microverse.THREE.Color();
                for(let i=this.crowdMask.count; i<this.actor.crowdSize; i++){
                    color.set(crowd[i][6]);
                    this.crowdMask.setColorAt(i, color);
                }
                this.crowdMask.count = this.actor.crowdSize;
                this.crowdMask.instanceColor.needsUpdate = true;
            }
            this.crowdMask.count = this.actor.crowdSize;

            let handlerModuleName = 'Terrain';
            let pawn = terrainLayer[0].wcPawn;
            if (pawn.has(`${handlerModuleName}$TerrainPawn`, "getHeightFast")) {
                // initialize the positions

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
        }*/
    }
}

export default {
    modules: [
        {
            name: "Horse",
            actorBehaviors: [HorseActor],
            pawnBehaviors: [HorsePawn],
        }
    ]
}
