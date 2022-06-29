class EarthPawn {
    setup() {
        this.constructEarth();
    }

    constructEarth() {
        // Create the earth
        const SHADOWRADIUS = 3.95; // size of the earth (water)
        const BASERADIUS = 4;      // size of the earth (land)
        const earthbase = `./assets/images/earthbase.png`;
        const earthshadow = `./assets/images/earthshadow.jpg`;
        const ball = './assets/images/ball.png';

        const THREE = Microverse.THREE;

        this.shape.children.forEach((c) => {
            c.material.dispose();
            this.shape.remove(c);
        });
        this.shape.children = []; // ??

        const earthBaseTexture = new THREE.TextureLoader().load(earthbase);
        earthBaseTexture.wrapS = earthBaseTexture.wrapT = THREE.RepeatWrapping;
        earthBaseTexture.repeat.set(1,1);

        const earthShadowTexture = new THREE.TextureLoader().load(earthshadow);
        earthShadowTexture.wrapS = earthShadowTexture.wrapT = THREE.RepeatWrapping;
        earthShadowTexture.repeat.set(1,1);

        this.shadowSphere = new THREE.Mesh(
            new THREE.SphereGeometry(SHADOWRADIUS, 64, 64),
            new THREE.MeshStandardMaterial({ map: earthShadowTexture, color: 0xaaaaaa, roughness: 0.7, opacity:0.9, transparent: true }));
        this.shadowSphere.receiveShadow = true;
        this.shape.add(this.shadowSphere);

        this.baseSphere = new THREE.Mesh(
            new THREE.SphereGeometry(BASERADIUS, 64, 64),
            new THREE.MeshStandardMaterial({ alphaMap: earthBaseTexture, color: 0x22ee22, roughness: 0.7, opacity:0.9, transparent: true }));
        this.baseSphere.receiveShadow = true;
        this.baseSphere.castShadow = true;
        this.shape.add(this.baseSphere);
    }
}

export default {
    modules: [
        {
            name: "Earth",
            pawnBehaviors: [EarthPawn],
        }
    ]
}

/* globals Microverse */
