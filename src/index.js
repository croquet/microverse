// Microverse
// TODO:
// Generic Importer
// Collisions
// Drag and drop


import { App,  ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, toRad} from "@croquet/worldcore";
import {AMVAvatar, PMVAvatar, myAvatar} from './MVAvatar.js';
import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';

import JSZip from "jszip";

// model art CC 4.0 https://sketchfab.com/3d-models/substation-bimfra-37528b7d65f945d0b31389d95abced6d
const powerPlant = "../assets/OilFacility.glb.zip";

const alice  = "../assets/avatars/alice.zip";
const cheshire = "../assets/avatars/cheshirecat.zip";
const hatter = "../assets/avatars/madhatter.zip";
const hare = "../assets/avatars/marchhare.zip";
const queen = "../assets/avatars/queenofhearts.zip";
const rabbit = "../assets/avatars/whiterabbit.zip";

// skybox art courtesy of https://opengameart.org/users/spiney
import skyFront from "../assets/sky/sh_ft.png";
import skyBack from "../assets/sky/sh_bk.png";
import skyRight from "../assets/sky/sh_rt.png";
import skyLeft from "../assets/sky/sh_lf.png";
import skyUp from "../assets/sky/sh_up.png";
import skyDown from "../assets/sky/sh_dn.png";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
console.log("%cJSZip.Version",  'color: #f00', JSZip.version);

async function loadGLB(zip, file, scene, onComplete, position, scale, rotation, layer){
    await fetch(zip)
    .then(res => res.blob())
    .then(blob => {
        let jsz = new JSZip();
        jsz.loadAsync(blob, {createFolders: true}).then(function(zip){
            zip.file(file).async("ArrayBuffer").then(function(data) {
                (new GLTFLoader()).parse( data, null, function (gltf) {  
                    if(onComplete)onComplete(gltf, layer);
                    scene.add( gltf.scene );
                    scene.updateMatrixWorld ( true );
                    if(position)gltf.scene.position.set(...position);
                    if(scale)gltf.scene.scale.set(...scale);
                    if(rotation)gltf.scene.rotation.set(...rotation);
                    return scene;
                });
            })
        })
    })
}

function addShadows(gltf, layer) {
    gltf.scene.traverse( n => {
        if(n.material){
            n.material.side = THREE.FrontSide; //only render front side
            n.material.format = THREE.RGBAFormat; // fixes a bug in GLTF import
            n.layers.enable(layer); // use this for raycasting
            n.castShadow = true;
            n.receiveShadow = true;
        }
    });
}

// these are defined outside of the Worldcore objects, otherwise, they will need to be recreated when the app goes to sleep and restarts again.
const plant = new THREE.Group();
loadGLB(powerPlant, "OilFacility.glb", plant, addShadows, [0, -10, 0], [1,1,1], [0,0,0], 1);

var i = 0;
const avatars = []; for(i=0; i<6;i++) avatars[i]=new THREE.Group;
i=0;
loadGLB(alice, "alice.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
loadGLB(rabbit, "white.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
loadGLB(hatter, "madhatter.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
loadGLB(hare, "march.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
loadGLB(queen, "queenofhearts.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
loadGLB(cheshire, "cheshirecat.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);

class AMAvatar extends AMVAvatar{
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
    }

    get pawn() {return PMAvatar}
}

AMAvatar.register('AMAvatar');

class PMAvatar extends PMVAvatar {

    constructVisual(){
        // create the avatar (cloned from above) for anyone that is not me (for now)
        let a = this.avatar = avatars[this.avatarIndex%avatars.length];
        a.traverse( n => {if(n.material)n.material = n.material.clone();});
        this.setRenderObject(a);        
    }
}

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        const scene = this.service("ThreeRenderManager").scene;

        this.background = scene.background = new THREE.CubeTextureLoader().load([skyFront, skyBack, skyUp, skyDown, skyRight, skyLeft]);
        //const ambient = new THREE.AmbientLight( 0xffffff, 0.85 );
        //scene.add(ambient);

        const sun = this.sun = new THREE.DirectionalLight( 0xffa95c, 0.85 );
        sun.position.set(100, 200, 150);
        sun.castShadow = true;
        //Set up shadow properties for the light
        sun.shadow.mapSize.width = 1024; // default
        sun.shadow.mapSize.height = 1024; // default
        sun.shadow.camera.near = 0.5; // default
        sun.shadow.camera.far = 1000; // default
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.zoom = 0.125;
        sun.shadow.bias = -0.0001;

        scene.add(sun);

        const hemiLight = this.hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 2);
        scene.add(hemiLight);

        const renderer = this.service("ThreeRenderManager").renderer;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;

        renderer.shadowMap.enabled = true;
        this.setRenderObject( plant )
    }

    destroy() {
        super.destroy();
        this.background.dispose();
        this.sun.dispose();
        this.hemiLight.dispose();
    }
}

class MyPlayerManager extends PlayerManager {
    createPlayer(options) {
        options.index = this.count;
        options.lookYaw = toRad(45);
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return AMAvatar.create(options);
    }
}
MyPlayerManager.register("MyPlayerManager");

class MyModelRoot extends ModelRoot {
    static modelServices() {
        return [MyPlayerManager];
    }

    init(...args) {
        super.init(...args);
        this.level = LevelActor.create();
    }
}

MyModelRoot.register("MyModelRoot");

class MyViewRoot extends ViewRoot {
    static viewServices() {
        return [InputManager, ThreeRenderManager];
    }
}

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.powerstation',
    apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
    name: App.autoSession(),
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    tps:60
});