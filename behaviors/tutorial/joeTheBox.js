// Joe the Box
// Copyright 2022 Croquet Corporation
// Croquet Microverse
// Generates a simple 3D box with a grid texture


class JoeTheBoxPawn {
    setup() {
        console.log("AM I GETTING HERE?")
        const THREE = Microverse.THREE;
        const gridImage = './assets/images/grid.png';
        const texture = new THREE.TextureLoader().load(gridImage);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 10, 10 );

        this.box = new THREE.Mesh(
            new THREE.BoxGeometry( 1, 1, 1, 1, 1, 1 ),
            new THREE.MeshStandardMaterial({ map: texture, color: 0xcccccc }));
        this.box.receiveShadow = true;
        this.box.castShadow = true;
        this.shape.add(this.box);
    }
}

export default {
    modules: [
        {
            name: "JoeTheBox",
            pawnBehaviors: [JoeTheBoxPawn],
        }
    ]
}
