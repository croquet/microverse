
// mirror.js
// Croquet Microverse
// A variable sized rectangular mirror

class MirrorPawn {
    setup() {
        this.constructMirror();
    }

    constructMirror(){
        const THREE = Microverse.THREE;
        return Promise.all([
            import("../assets/src/Reflector.js"),
        ]).then(([mirror_S]) => {
            let size = this.actor._cardData.mirrorSize;
            const mirrorGeometry = new THREE.PlaneGeometry( ...size );
            this.mirror = new mirror_S.Reflector(
                mirrorGeometry,
                {
                    clipBias: 0.003,
                    color: 0x5588aa,
                    //side:THREE.DoubleSide,
                    //fog: scene.fog !== undefined
                }
            );
            console.log(this.mirror);
            this.mirror.rotation.x=-Math.PI/2; // flip around the x
            this.shape.add(this.mirror);
        });
    }
}

export default {
    modules: [
        {
            name: "Mirror",
            pawnBehaviors: [MirrorPawn],
        }
    ]
}