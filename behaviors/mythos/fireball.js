// Fireball
// Croquet Microverse
// Generates a floating fireball in the world

class FireballActor {
    setup() {
        this.update();
    }
    update(){
        this.future(50).update();
        this.say("updateFire", this.now());
    }
}

class FireballPawn {
    setup() {
        this.listen("updateFire",this.update);
        return Promise.all([
            import("/assets/shader/fireball.frag.js"),
            import("/assets/shader/fireball.vert.js"),
        ]).then(([fragmentShader, vertexShader]) => {

console.log(vertexShader, fragmentShader)
        let explosionTexture = new THREE.TextureLoader().load( "./assets/images/explosion.png" );
        this.material = new THREE.ShaderMaterial( {
          uniforms: {
            tExplosion: {
              type: "t",
              value: explosionTexture
            },
            time: {
              type: "f",
              value: 0.0
            }
          },
          vertexShader: vertexShader.vertexShader(),
          fragmentShader: fragmentShader.fragmentShader()
     
         } );
     
        this.fireball = new THREE.Mesh(
                new THREE.IcosahedronGeometry( 20, 10 ),
                this.material
        );
        this.fireball.scale.set(0.4, 0.4, 0.4);
        this.shape.add(this.fireball);
        this.pointLight = new THREE.PointLight(0xff8844, 1, 4, 2);
        this.fireball.add(this.pointLight);
       });
    }

    update(t){
        if(this.fireball){
            this.fireball.material.uniforms[ 'time' ].value = .00025 * t;
            this.pointLight.intensity = 0.25+ 0.75* Math.sin(t*0.020)*Math.cos(t*0.007);
        }
    }
}

export default {
    modules: [
        {
            name: "Fireball",
            actorBehaviors: [FireballActor],
            pawnBehaviors: [FireballPawn],
        }
    ]
}
