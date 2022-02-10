import { THREE } from "@croquet/worldcore";

export function addShadows(obj3d, singleSide) {
    obj3d.scene.traverse( n => {
        if(n.material){
            if(singleSide)n.material.side = THREE.FrontSide; //only render front side
            n.material.format = THREE.RGBAFormat; // fixes a bug in GLTF import
            n.castShadow = true;
            n.receiveShadow = true;
        }
    });
}
