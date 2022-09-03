// Blowing in the wind
// Croquet Microverse
// Moves an object with the wind

class BlowingActor {
    setup() {
        // nothing to do here yet
    }
}

class BlowingPawn {
    setup() {
        // the 3D object will likely not be loaded yet. 
        this.subscribe(this.id, "3dModelLoaded", "modelLoaded")
    }

    modelLoaded(){
        console.log("BLOWING", this.shape.children[0])
    }
   
}

export default {
    modules: [
        {
            name: "Blowing",
            actorBehaviors: [BlowingActor],
            pawnBehaviors: [BlowingPawn],
        }
    ]
}
