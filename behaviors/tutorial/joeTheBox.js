// Joe the Box
// Copyright 2022 Croquet Corporation
// Croquet Microverse
// Generates a simple 3D box with a grid texture


class JoeTheBoxPawn {
    setup() {
        console.log("JoeTheBox.setup()");
        const THREE = Microverse.THREE;

        // this is the base64 encoded version of a png file with the unit grid pattern.
        let gridImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOnAAADusBZ+q87AAAAJtJREFUeJzt0EENwDAAxLDbNP6UOxh+NEYQ5dl2drFv286598GrA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAu37AD8eaBH5JQdVbAAAAAElFTkSuQmCC";

        let image = new Image();
        let texture = new THREE.Texture(image);
        image.onload = () => texture.needsUpdate = true;
        image.src = gridImage;

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 10, 10 );

        [...this.shape.children].forEach((c) => c.removeFromParent());

        let box = new THREE.Mesh(
            new THREE.BoxGeometry( 1, 1, 1, 1, 1, 1 ),
            new THREE.MeshStandardMaterial({ map: texture, color: 0xcccccc }));
        box.receiveShadow = true;
        box.castShadow = true;
        this.shape.add(box);
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
