// Grid Floor
// Croquet Microverse
// Generates a simple gridded floor card

class GridFloorActor {
    setup() {
        // nothing to do here yet
    }
}

class GridFloorPawn {
    setup() {
        console.log("AM I GETTING HERE?")
        const THREE = Microverse.THREE;
        const gridImage = './assets/images/grid.png';
        const texture = new THREE.TextureLoader().load(gridImage);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 100, 100 );

        if (this.floor) {
            this.shape.remove(this.floor);
            this.floor.dispose();
        }

        this.floor = new THREE.Mesh(
            new THREE.BoxGeometry( 100, 0.1, 100, 1, 1, 1 ),
            new THREE.MeshStandardMaterial({ map: texture, color: 0xcccccc }));
        this.floor.receiveShadow = true;
        this.shape.add(this.floor);
        this.cleanupColliderObject()
        if (this.actor.layers && this.actor.layers.includes("walk")) {
            this.constructCollider(this.floor);
        }
    }
}

export default {
    modules: [
        {
            name: "GridFloor",
            actorBehaviors: [GridFloorActor],
            pawnBehaviors: [GridFloorPawn],
        }
    ]
}
