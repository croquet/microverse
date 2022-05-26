class CampusMapPawn {
    setup() {
        let translation1 = new Worldcore.THREE.Matrix4();
        let scale = new Worldcore.THREE.Matrix4();
        let rotation1 = new Worldcore.THREE.Matrix4();
        let rotation2 = new Worldcore.THREE.Matrix4();

        // first rotate the avatar so that its Z direction is parpendicular to the map.
        rotation2.makeRotationY(0.59294134694891);

        // second make the position right up so that moving into -z direction increases y
        rotation1.makeRotationX(Math.PI / 2);

        // scale that to the size of the map object;
        let div = 825;
        scale.makeScale(9 / div, 9 / div, 9 / div);

        // translate the position to the map object
        translation1.makeTranslation(9.42, -0.65, -20.5);

        this.matrix = new Worldcore.THREE.Matrix4();
        this.matrix.multiply(translation1);
        this.matrix.multiply(scale);
        this.matrix.multiply(rotation1);
        this.matrix.multiply(rotation2);
        console.log(this.matrix);

        // lazily create geometry and material to be shared with all dots.
        let THREE = Worldcore.THREE;
        if (!this.balls) {
            this.balls = [];
        }

        if (!this.geometry) {
            this.geometry = new THREE.SphereGeometry(0.02, 16, 8);
        }
        if (!this.material) {
            this.material = new THREE.MeshStandardMaterial({color: 0xff0000});
        }

        // run the future loop on updateMap if it is not already doing so
        if (this.mapRunning === undefined) {
            this.mapRunning = true;
            this.updateMap();
        }
    }

    updateMap() {
        if (!this.mapRunning) {return;}
        this.future(250).updateMap();

        // when the number of avatars change, we add or remove dots
        let avatars = this.actor.service("PlayerManager").players;
        while (this.balls.length < avatars.size) {
            let mesh = new Worldcore.THREE.Mesh(this.geometry, this.material);
            this.balls.push(mesh);
            this.shape.add(mesh);
        }

        while (this.balls.length > avatars.size) {
            let mesh = this.balls.pop();
            this.shape.remove(mesh);
        }

        // and translate their translation with the matrix
        [...avatars].forEach((a, i) => {
            let v = new Worldcore.THREE.Vector3(...a[1].translation);
            v.applyMatrix4(this.matrix);
            this.balls[i].position.set(...v.toArray());
        });
    }
}

export default {
    modules: [
        {
            name: "CampusMap",
            pawnBehaviors: [CampusMapPawn],
        }
    ]
}

/* globals Worldcore */
