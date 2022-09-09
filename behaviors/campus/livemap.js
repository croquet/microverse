class CampusMapPawn {
    setup() {
        let translation1 = new Microverse.THREE.Matrix4();
        let scale = new Microverse.THREE.Matrix4();
        let rotation1 = new Microverse.THREE.Matrix4();
        let rotation2 = new Microverse.THREE.Matrix4();
        let rotation3 = new Microverse.THREE.Matrix4();

        // first rotate the avatar so that its Z direction is parpendicular to the map.
        rotation2.makeRotationY(0.59294134694891);

        // second make the position right up so that moving into -z direction increases y
        rotation1.makeRotationX(Math.PI / 2);

        // scale that to the size of the map object;
        let div = 825;
        scale.makeScale(7.3 / div, 9.3 / div, 9 / div);

        // rotate to align it with the map plane
        rotation3.makeRotationY(-0.59294134694891);

        // translate the position to the map object
        translation1.makeTranslation(9.42, -0.66, -20.46);

        this.mapMatrix = new Microverse.THREE.Matrix4();
        this.mapMatrix.multiply(translation1);
        this.mapMatrix.multiply(rotation3);
        this.mapMatrix.multiply(scale);
        this.mapMatrix.multiply(rotation1);
        this.mapMatrix.multiply(rotation2);

        // lazily create geometry and material to be shared with all dots.
        let THREE = Microverse.THREE;
        if (this.balls) {
            [...this.balls].forEach((b) => {
                this.shape.remove(b);
                b.geometry.dispose();
                b.material.dispose();
            });
        }
        this.balls = [];

        if (this.geometry) {
            this.geometry.dispose();
        }
        this.geometry = new THREE.SphereGeometry(0.02, 16, 8);

        if (this.avatarMaterial) {
            this.avatarMaterial.dispose();
        }
        this.avatarMaterial = new THREE.MeshStandardMaterial({color: 0xcc2222});

        if (this.cardMaterial) {
            this.cardMaterial.dispose();
        }
        this.cardMaterial = new THREE.MeshStandardMaterial({color: 0x22cc22});

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
        let cards = this.actor.queryCards();
        cards = cards.filter((c) => !c._parent);
        cards = cards.filter((c) => c._name !== "world model");
        cards = cards.filter((c) => c._name !== "light");

        while (this.balls.length < cards.length) {
            let mesh = new Microverse.THREE.Mesh(this.geometry, this.cardMaterial);
            this.balls.push(mesh);
            this.shape.add(mesh);
        }

        while (this.balls.length > cards.length) {
            let mesh = this.balls.pop();
            this.shape.remove(mesh);
        }

        // and translate their translation with the matrix

        let myT = this._translation;
        cards.forEach((a, i) => {
            let t = a.translation;
            let v = new Microverse.THREE.Vector3(t[0], 0, t[2]);
            v.applyMatrix4(this.mapMatrix);
            let m = (a.constructor.name === "AvatarActor") ? this.avatarMaterial : this.cardMaterial;
            this.balls[i].position.set(v.x - myT[0], v.y - myT[1], v.z - myT[2]);
            this.balls[i].material = m;
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

/* globals Microverse */
