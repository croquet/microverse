// Fade In and Launch
// Croquet Microverse
// This generates a blank screen that fades in once the user clicks on it
// It hides the construction of the world and is a gentler introduction 
// It is fully 3D, so will also work in WebXR.
// It does not track the camera or avatar, so the user can actually walk outside of
// it without clicking on it. This will be addressed later.

class FadeInActor {
    setup() {
        // nothing to do here yet
    }
}

class FadeInPawn {
    setup() {
        this.addEventListener("pointerDown", "trigger");
        this.construct();
    }

    construct(){
        console.log("Construct fade in screen")
        const THREE = Microverse.THREE;

        if (this.fadeIn) {
            this.fadeIn.removeFromParent();
            this.fadeIn.dispose();
            this.fadeIn = undefined;
        }

        this.fadeIn = new THREE.Mesh(new THREE.BoxGeometry(10.0, 10.0, 10.0), 
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF, fog: false, transparent: true, opacity: 1.0,
                depthTest: false, depthWrite: false, side:THREE.DoubleSide, toneMapped: false
        }));

        this.fadeIn.renderOrder = 1000;
        let pos = this.service("ThreeRenderManager").camera.position;
        this.fadeIn.position.copy(pos);
        this.shape.add(this.fadeIn);
    }

    // the camera must be in the scene for the fade in to work
    setupCamera(){
        let camera = this.service("ThreeRenderManager").camera;
        if(!camera.parent){
            this.service("ThreeRenderManager").scene.add(camera);
        }
        return camera;
    }

    trigger(){
        this.fadeAway(1);
        this.publish(this.actor.service("PlayerManager").players.get(this.viewId).id, "trigger");
        console.log("trigger");
    }

    fadeAway(alpha){
        alpha -= 0.05;
        if(alpha>0){
            this.fadeIn.material.opacity = alpha;
            this.future(50).fadeAway(alpha);
            return;
        }
        this.teardown();
    }

    teardown(){
        if (this.fadeIn) {
            this.fadeIn.removeFromParent();
            this.fadeIn.geometry.dispose();
            this.fadeIn.material.dispose();
            this.fadeIn = undefined;
            const render = this.service("ThreeRenderManager");
            if (render) render.dirtyAllLayers();
        }
        this.removeEventListener("pointerDown", "toggle");
    }
}

export default {
    modules: [
        {
            name: "FadeIn",
            actorBehaviors: [FadeInActor],
            pawnBehaviors: [FadeInPawn],
        }
    ]
}
