import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import JSZip from "jszip";
import { THREE } from "@croquet/worldcore";

console.log("%cJSZip.Version",  'color: #f00', JSZip.version);

// This will be replaced by the generic file load
export async function loadGLB(zip, group, onComplete, position, scale, rotation, singleSide){
    await fetch(zip)
    .then(res => res.blob())
    .then(blob => {
        let jsz = new JSZip();
        jsz.loadAsync(blob, {createFolders: true}).then(function(zip){
            Object.values(zip.files)[0].async("ArrayBuffer").
            //zip.file(file).async("ArrayBuffer").
                then(function(data) {
                (new GLTFLoader()).parse( data, null, function (gltf) {  
                    if(onComplete)onComplete(gltf, singleSide);
                    group.add( gltf.scene );
                    group.updateMatrixWorld ( true );
                    if(position)gltf.scene.position.set(...position);
                    if(scale)gltf.scene.scale.set(...scale);
                    if(rotation)gltf.scene.rotation.set(...rotation);
                    group.ready = true;
                    return group;
                });
            })
        })
    })
}

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

export function addShadows2(obj3d, singleSide) {
    obj3d.traverse( n => {
        if(n.material){
            if(singleSide)n.material.side = THREE.FrontSide; //only render front side
            n.material.format = THREE.RGBAFormat; // fixes a bug in GLTF import
            n.castShadow = true;
            n.receiveShadow = true;
        }
    });
}
