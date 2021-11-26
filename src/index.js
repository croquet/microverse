// Microverse 2
// TODO:
// Switch between walk and orbit modes
// Generic Importer
// Collisions and height
// Drag and drop


import { App,  ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    AM_Player, PM_Player, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, AM_MouselookAvatar, 
    PM_MouselookAvatar, PM_ThreeCamera, toRad, v3_sqrMag, v3_sub, q_identity, q_euler, q_axisAngle, m4_scaleRotationTranslation, m4_multiply, m4_translation, m4_rotationQ} from "@croquet/worldcore";

import * as THREE from 'three/build/three.module.js';
import { GLTFLoader, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import JSZip from "jszip";

// model art CC 4.0 https://sketchfab.com/3d-models/substation-bimfra-37528b7d65f945d0b31389d95abced6d
import powerPlant from "../assets/OilFacility.glb.zip";
import simplehead from "../assets/simplehead.glb.zip";

// skybox art courtesy of https://opengameart.org/users/spiney
import skyFront from "../assets/sky/bluecloud_ft.jpg";
import skyBack from "../assets/sky/bluecloud_bk.jpg";
import skyRight from "../assets/sky/bluecloud_rt.jpg";
import skyLeft from "../assets/sky/bluecloud_lf.jpg";
import skyUp from "../assets/sky/bluecloud_up.jpg";
import skyDown from "../assets/sky/bluecloud_dn.jpg";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
console.log("%cJSZip.Version",  'color: #f00', JSZip.version);
//const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isMobile = true;

let myAvatar;
let isWalking = false; // switchControl() will make it true

function setupButton( bttn ){ // button click passes through to world otherwise
    bttn.addEventListener("click", switchControl, false);
    bttn.addEventListener("pointerdown", e=>e.stopPropagation(), false);
    bttn.addEventListener("pointerup", e=>e.stopPropagation(), false);
}
setupButton(document.getElementById("orbitingBttn"));
setupButton(document.getElementById("walkingBttn"))

function switchControl(e){
    isWalking = !isWalking;
    if(myAvatar)myAvatar.setControls(isWalking);
    document.getElementById("walkingBttn" ).style.display=isWalking?"none":"inline-block";
    document.getElementById("orbitingBttn").style.display=isWalking?"inline-block":"none";
    if(e){e.stopPropagation(); e.preventDefault();}
}
switchControl(); //initialize the buttons.

async function loadGLB(zip, file, scene, onComplete, position, scale, rotation){
    await fetch(zip)
    .then(res => res.blob())
    .then(blob => {
        let jsz = new JSZip();
        jsz.loadAsync(blob, {createFolders: true}).then(function(zip){
            zip.file(file).async("ArrayBuffer").then(function(data) {
                (new GLTFLoader()).parse( data, null, function (gltf) {  
                    if(onComplete)onComplete(gltf);
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

function addShadows(gltf) {
    gltf.scene.traverse( n => {
        if(n.isMesh){
            n.castShadow = true;
            n.receiveShadow = true;
        }
    });
}

// these are defined outside of the Worldcore objects, otherwise, they will need to be recreated when the app goes to sleep and restarts again.
const plant = new THREE.Group();
loadGLB(powerPlant, "OilFacility.glb", plant, addShadows, [0, -6.5, 0]);

const avatar = new THREE.Group();
loadGLB(simplehead, "simplehead.glb", avatar, addShadows, [0, -0.2, 0.0], [0.4,0.4,0.4], [0, Math.PI, 0]);

class MyAvatar extends mix(Actor).with(AM_Player, AM_MouselookAvatar) {
    init(options) {
        super.init(options);
    }
    get pawn() {return AvatarPawn}
}

MyAvatar.register('MyAvatar');

class AvatarPawn extends mix(Pawn).with(PM_Player, PM_MouselookAvatar, PM_ThreeVisible, PM_ThreeCamera) {
    constructor(...args) {
        super(...args);
        this.isAvatar = true;
        this.fore = this.back = this.left = this.right = 0;
        this.opacity = 1;
        this.activeMMotion = false; // mobile motion initally inactive
        if (this.isMyPlayerPawn) {
            myAvatar = this; // set the global for callbacks
            // create a dummy camera that will be moved by the OrbitControls
            let renderMgr = this.service("ThreeRenderManager");
            this.camera = renderMgr.camera;
            this.scene = renderMgr.scene;
            this.orbitCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.orbitCamera.position.set( 100, 50, 0 );
            this.orbitCamera.updateMatrixWorld();
            this.createOrbitControls( this.orbitCamera, renderMgr.renderer );
            this.setControls(isWalking); // walking or orbiting?
            this.subscribe("input", "pointerDown", this.startMMotion);
            this.subscribe("input", "pointerUp", this.endMMotion);
            this.subscribe("input", "pointerCancel", this.endMMotion);
            this.subscribe("input", "pointerMove", this.continueMMotion);
        } else { 
            // create the avatar (cloned from above) for anyone that is not me (for now)
            let a = this.avatar = avatar.clone();
            a.traverse( n => {if(n.isMesh)n.material = n.material.clone()});
            this.setRenderObject(a);
        }
        this.future(100).fadeNearby();
    }

    createOrbitControls( camera, renderer ) {
        this.controls = new OrbitControls( camera, renderer.domElement );
        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.0;
        this.controls.panSpeed = 0.8;
        this.controls.enablePan = false;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    updateOrbitCamera(data){ // this is a callback from DOM, so can't read 'this' directly

       // myAvatar.orbitCamera.updateWorldMatrix();
        myAvatar.refreshCameraTransform();
        /*
        const pos = new THREE.Vector3().copy(myAvatar.orbitCamera.position);
        myAvatar.camera.position.copy(myAvatar.orbitCamera.position);
        myAvatar.camera.quaternion.copy(myAvatar.orbitCamera.quaternion);
        myAvatar.camera.updateMatrixWorld();
        //camera.quaternion.copy(cameraAvatar.quaternion);
        myAvatar.camera.zoom = myAvatar.orbitCamera.zoom;
        myAvatar.camera.updateMatrixWorld();
        myAvatar.camera.updateProjectionMatrix();
        */

        
       // myAvatar.publish(myAvatar.model.id, "moveCamera", { pos: pos.toArray(), quat: myAvatar.cameraAvatar.quaternion.toArray(), 
       // zoom: myAvatar.cameraAvatar.zoom, viewId: myAvatar.viewId });
    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        // the avatar memory will be reclaimed when the scene is destroyed - it is a clone, so leave the  geometry and material alone.
    }

    setControls(isWalking){
        const input = this.service("InputManager");
        if(isWalking) {
            if(input.addAllListeners)input.addAllListeners();
            this.controls.removeEventListener('change', this.updateOrbitCamera);
        }else {
            input.removeAllListeners();
            this.controls.addEventListener('change', this.updateOrbitCamera);
        }
    }

    // The multipliers here determine how fast the player moves and turns.

    changeVelocity() {
        const velocity = [ -0.01 * (this.left - this.right), 0,  -0.01 * (this.fore - this.back)]
        this.setVelocity(velocity);
    }

    onPointerDelta(data) {
        const pitch = Math.max(-Math.PI, Math.min(Math.PI, this.lookPitch + data.xy[1] * -0.0025));
        const yaw = this.lookYaw + data.xy[0] * -0.0025;
        this.throttledLookTo(pitch, yaw);
    }

    get lookGlobal() { 
        if(isWalking || !this.orbitCamera)return this.global;
        else {return this.orbitCamera.matrixWorld.elements;}
    }

    startMMotion( data ){
        if(isWalking){
            this.activeMMotion = true;
            this.basePosition = data.xy;
        }
    }

    endMMotion( data ){
        if(isWalking){
            this.activeMMotion =false;
            this.setVelocity([0, 0, 0]);
            this.setSpin(q_identity());
        }
    }

    continueMMotion( data ){
        if( isWalking && this.activeMMotion ){
            let v = (data.xy[1] - this.basePosition[1])*0.00005;
            v = Math.min(Math.max(v, -0.008),0.008);
            this.setVelocity([0, 0, v]);

            const yaw = (data.xy[0] - this.basePosition[0]) * -0.000005;
            const qyaw = q_euler(0, yaw ,0);
            this.setSpin(qyaw);
        }
    }

    fadeNearby(){
        let pawnManager = this.service("PawnManager");
        let t = this.actor.translation;
        pawnManager.pawns.forEach(a => {if(a!==this && a.isAvatar){
                let d = Math.min(4, v3_sqrMag(v3_sub(a.translation, t)))/4;
                //console.log(d)
                a.setOpacity(d);
            }
        });
        //this.controls.update();
        this.future(100).fadeNearby();
    }

    setOpacity(opacity){
        let transparent = opacity!=1;
        if(this.opacity!==opacity){
            this.opacity = opacity;
            if(this.avatar)
                this.avatar.traverse( n => {
                    if(n.isMesh){
                        n.material.opacity = opacity;
                        n.material.transparent = transparent;
                    }
                });
            }
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
        // In THREE.js you should destroy lights, backgrounds, etc
        // You don't destroy Object3D - instead destroy geonetries and materials 
        this.background.dispose();
        this.sun.dispose();
        this.hemiLight.dispose();
    }
}

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.lookYaw = toRad(45);
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return MyAvatar.create(options);
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

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const input = this.service("InputManager");
        input.addAllListeners = function(){
            this.addListener(document, 'contextmenu', e => e.preventDefault());
            this.addListener(window, 'resize', e => this.onResize(e));
            this.addListener(window, 'focus', e => this.onFocus(e));
            this.addListener(window, 'blur', e => this.onBlur(e));
            this.addListener(window, 'deviceorientation', e => this.onOrientation(e));
            this.addListener(document, 'click', e => this.onClick(e));
            this.addListener(document, 'pointerlockchange', e => this.onPointerLock(e));

            this.addListener(document, 'pointerdown', e => this.onPointerDown(e));
            this.addListener(document, 'pointerup', e => this.onPointerUp(e));
            this.addListener(document, 'pointercancel', e => this.onPointerUp(e));
            this.addListener(document, 'pointermove', e => this.onPointerMove(e));

            this.addListener(document, 'wheel', e => this.onWheel(e));

            this.addListener(document,'keydown', e => this.onKeyDown(e));
            this.addListener(document,'keyup', e => this.onKeyUp(e));

        }
        //input.removeAllListeners(); //get rid of them at startup
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
