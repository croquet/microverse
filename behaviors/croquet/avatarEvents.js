class AvatarPawn {
    setup() {
        if (!this.isMyPlayerPawn) {return;}

        this.addFirstResponder("pointerTap", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerTap", this.pointerTap);

        this.addFirstResponder("pointerDown", {ctrlKey: true, altKey: true}, this);
        this.addLastResponder("pointerDown", {}, this);
        this.addEventListener("pointerDown", this.pointerDown);

        this.addFirstResponder("pointerMove", {ctrlKey: true, altKey: true}, this);
        this.addLastResponder("pointerMove", {}, this);
        this.addEventListener("pointerMove", this.pointerMove);

        this.addLastResponder("pointerUp", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerUp", this.pointerUp);

        this.addLastResponder("pointerWheel", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.addEventListener("pointerDoubleDown", this.addSticky);

        this.addLastResponder("keyDown", {ctrlKey: true}, this);
        this.addEventListener("keyDown", this.keyDown);

        this.addLastResponder("keyUp", {ctrlKey: true}, this);
        this.addEventListener("keyUp", this.keyUp);
    }

    teardown() {
        if (!this.isMyPlayerPawn) {return;}
        console.log("avatar event handler detached");
        this.removeFirstResponder("pointerTap", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerTap", this.pointerTap);

        this.removeFirstResponder("pointerDown", {ctrlKey: true, altKey: true}, this);
        this.removeLastResponder("pointerDown", {}, this);
        this.removeEventListener("pointerDown", this.pointerDown);

        this.removeFirstResponder("pointerMove", {ctrlKey: true, altKey: true}, this);
        this.removeLastResponder("pointerMove", {}, this);
        this.removeEventListener("pointerMove", this.pointerMove);

        this.removeLastResponder("pointerUp", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerUp", this.pointerUp);

        this.removeLastResponder("pointerWheel", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.removeFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.removeEventListener("pointerDoubleDown", this.addSticky);

        this.removeLastResponder("keyDown", {ctrlKey: true}, this);
        this.removeEventListener("keyDown", this.keyDown);

        this.removeLastResponder("keyUp", {ctrlKey: true}, this);
        this.removeEventListener("keyUp", this.keyUp);
    }

    walk(time, delta, vq) {
        const COLLIDE_THROTTLE = 50;
        const THROTTLE = 15; // 20
        if (this.collidePortal(vq)) {return;}
        // test for terrain 

        if (this.actor.fall && time - this.lastUpdateTime > THROTTLE) {
            if (time - this.lastCollideTime > COLLIDE_THROTTLE) {
                this.lastCollideTime = time;
                vq = this.walkTerrain(vq); // calls collideBVH
            }
            this.lastUpdateTime = time;
            vq = this.checkFall(vq);
            vq = this.checkHillside(vq); // the hills are alive...
            this.positionTo(vq.v, vq.q);
        }
    }

    checkHillside(vq){

        const EYE_HEIGHT = 2.5;
        let terrainLayer = this.service("ThreeRenderManager").threeLayer("terrain");
        terrainLayer.forEach(t=>{
            let handlerModuleName = 'Terrain';
            let pawn = t.wcPawn;
            if (pawn.has(`${handlerModuleName}$TerrainPawn`, "getHeight")) {
                vq.v[1] = pawn.call(`${handlerModuleName}$TerrainPawn`, "getHeight", vq.v, EYE_HEIGHT);
            /*
            if(t.wcPawn.heightField){ // heightField may not yet exist
                let inv = t.wcPawn.invScaleHill; // invert my location to find height
                let hfh = -t.wcPawn.heightField.heightAt(inv*vq.v[0], -inv*vq.v[2], true);
                let pht = inv*t.wcPawn.height; // height of terrain mesh in scaled down size
                let ht = t.wcPawn.scaleHill*(pht-hfh); //scale the height to world
                let delta = vq.v[1]-ht; // how far above am I?
                if(delta<EYE_HEIGHT)vq.v[1]=ht+EYE_HEIGHT; // NEVER go below the terrain
            }
            */
            }
        });
        return vq;
    }
}

export default {
    modules: [
        {
            name: "AvatarEventHandler",
            pawnBehaviors: [AvatarPawn],
        }
    ]
}

/* globals Microverse */
