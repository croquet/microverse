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
        const THREE = Worldcore.THREE;
        const gridImage = `./assets/images/grid.png`;
        const texture = new THREE.TextureLoader().load(gridImage);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 40, 40 );

        this.floor = new THREE.Mesh(
            new THREE.BoxGeometry( 40, 1, 40, 1, 1, 1 ),
            new THREE.MeshStandardMaterial({ map: texture, color: 0x606060 }));
        this.floor.receiveShadow = true;
        this.shape.add(this.floor);
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