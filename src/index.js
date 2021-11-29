// Microverse 2
// TODO:
// Generic Importer
// Collisions
// Drag and drop


import { App,  ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    AM_Player, PM_Player, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, AM_Avatar, 
    PM_Avatar, PM_ThreeCamera, toRad, v3_transform, v3_sqrMag, v3_sub, v3_add, q_identity, q_euler, m4_rotationQ} from "@croquet/worldcore";

import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';

import JSZip from "jszip";

// model art CC 4.0 https://sketchfab.com/3d-models/substation-bimfra-37528b7d65f945d0b31389d95abced6d
import powerPlant from "../assets/OilFacility.glb.zip";
import simplehead from "../assets/simplehead.glb.zip";
import alice from "../assets/avatars/alice.zip";
import cheshire from "../assets/avatars/cheshirecat.zip";
import hatter from "../assets/avatars/madhatter.zip";
import hare from "../assets/avatars/marchhare.zip";
import queen from "../assets/avatars/queenofhearts.zip";
import rabbit from "../assets/avatars/whiterabbit.zip";

// skybox art courtesy of https://opengameart.org/users/spiney
import skyFront from "../assets/sky/bluecloud_ft.jpg";
import skyBack from "../assets/sky/bluecloud_bk.jpg";
import skyRight from "../assets/sky/bluecloud_rt.jpg";
import skyLeft from "../assets/sky/bluecloud_lf.jpg";
import skyUp from "../assets/sky/bluecloud_up.jpg";
import skyDown from "../assets/sky/bluecloud_dn.jpg";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
console.log("%cJSZip.Version",  'color: #f00', JSZip.version);

const eyeHeight = 1.8; // height of eyes above ground in meters
const eyeEpsilon = 0.1; // don't replicate the change unless it is sufficiently large

let myAvatar;
let isWalking = false; // switchControl() will make it true
let isTweening = false; // transition between camera modes

function setupButton( bttn ){ 
    bttn.addEventListener("click", switchControl, false);
    bttn.addEventListener("pointerdown", e=>e.stopPropagation(), false);// button click passes through to world otherwise
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

const avatar = new THREE.Group(); // note that we are putting avatars into layer 2
loadGLB(simplehead, "simplehead.glb", avatar, addShadows, [0, -0.2, 0.0], [0.4,0.4,0.4], [0, Math.PI, 0], 2);

const plant = new THREE.Group();
loadGLB(powerPlant, "OilFacility.glb", plant, addShadows, [0, -10, 0], [1,1,1], [0,0,0], 1);

const a1 = new THREE.Group(); loadGLB(alice, "alice.glb", a1, addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
const a2 = new THREE.Group(); loadGLB(hatter, "madhatter.glb", a2, addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
const a3 = new THREE.Group(); loadGLB(hare, "march.glb", a3, addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
const a4 = new THREE.Group(); loadGLB(queen, "queenofhearts.glb", a4, addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
const a5 = new THREE.Group(); loadGLB(rabbit, "white.glb", a5, addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);
const a6 = new THREE.Group(); loadGLB(cheshire, "cheshirecat.glb", a6, addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], 2);

const avatars = [a1, a2, a3, a4, a5, a6];

class MyAvatar extends mix(Actor).with(AM_Player, AM_Avatar) {
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
    }
    get pawn() {return AvatarPawn}
}

MyAvatar.register('MyAvatar');

class AvatarPawn extends mix(Pawn).with(PM_Player, PM_Avatar, PM_ThreeVisible, PM_ThreeCamera) {
    constructor(...args) {
        super(...args);
        this.isAvatar = true;
        this.fore = this.back = this.left = this.right = 0;
        this.opacity = 1;
        this.activeMMotion = false; // mobile motion initally inactive
        this.avatarIndex = args[0].avatarIndex;
        if (this.isMyPlayerPawn) {
            myAvatar = this; // set the global for callbacks
            // create a dummy camera that will be moved by the OrbitControls
            let renderMgr = this.service("ThreeRenderManager");
            this.camera = renderMgr.camera;
            this.scene = renderMgr.scene;
            this.lastHeight = eyeHeight; // tracking the height above ground
            this.tweenCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.walkCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.orbitCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.orbitCamera.position.set( 100, 50, 0 );
            //this.orbitCamera.updateMatrixWorld();

            this.createOrbitControls( this.orbitCamera, renderMgr.renderer );
            this.setControls(isWalking); // walking or orbiting?
            this.subscribe("input", "pointerDown", this.startMMotion);
            this.subscribe("input", "pointerUp", this.endMMotion);
            this.subscribe("input", "pointerCancel", this.endMMotion);
            this.subscribe("input", "pointerMove", this.continueMMotion);
            this.raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
            this.raycaster.layers.set( 1 ); // only test against layer 1. Layer 2 is other players.
            this.future(100).fadeNearby();
        } else { 
            // create the avatar (cloned from above) for anyone that is not me (for now)
            let a = this.avatar = avatars[this.avatarIndex%avatars.length];
            a.traverse( n => {if(n.material)n.material = n.material.clone();});
            this.setRenderObject(a);
        }
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

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        // the avatar memory will be reclaimed when the scene is destroyed - it is a clone, so leave the  geometry and material alone.
    }

    setControls(isWalking){ // switch between walking and orbiting with a tween between
        const input = this.service("InputManager");
        this.walkCamera.position.set( ...this.translation );
        this.walkCamera.quaternion.set( ...this.rotation );
        this.walkCamera.updateMatrixWorld();
        if(isWalking) this.tween(this.orbitCamera, this.walkCamera, ()=> input.addAllListeners());
        else  this.tween(this.walkCamera, this.orbitCamera, ()=>input.removeAllListeners());
    }

    tween(fromCam, toCam, onComplete){
        isTweening = true;
        var tweenCam = this.tweenCamera; 
        var qStart = new THREE.Quaternion(), qEnd = new THREE.Quaternion();
        var vStart = new THREE.Vector3(), vEnd = new THREE.Vector3();
        
        // tween
        var time = { t: 0 };
        new TWEEN.Tween( time )
            .to( { t : 1 }, 1000 )
            .easing( TWEEN.Easing.Quadratic.InOut )
            //.easing( TWEEN.Easing.Linear.None )
            .onStart( function() {
                qStart.copy( fromCam.quaternion );
                qEnd.copy( toCam.quaternion );
                fromCam.getWorldPosition( vStart );
                toCam.getWorldPosition( vEnd );
            } )
            .onUpdate( function() {
                tweenCam.quaternion.slerpQuaternions( qStart, qEnd, time.t );    
                tweenCam.position.lerpVectors(vStart, vEnd, time.t);
                tweenCam.updateMatrixWorld();
            } )
            .onComplete( function() {
                isTweening = false;
                tweenCam.quaternion.copy( qEnd ); // so it is exact  
                tweenCam.position.copy( vEnd );
                if(onComplete)onComplete();

            } )
            .start();
    }

    get lookGlobal() { 
        if (this.isMyPlayerPawn) {
            if(isTweening)return this.tweenCamera.matrixWorld.elements;
            else if(isWalking)return this.global;
            else {return this.orbitCamera.matrixWorld.elements;}
        }else return this.global;
    }

    update(time, delta) {
        super.update(time, delta);
        if(this.isMyPlayerPawn){
            if(isTweening) TWEEN.update();
            if(!isWalking){
                this.orbitCamera.updateMatrixWorld();
                this.orbitCamera.updateProjectionMatrix();
            }else{
                this.findFloor(10,2);
            }
            this.refreshCameraTransform();
        }
    }

    findFloor(maxDist, recurse, move){
        if( recurse < 0 )return;
        this.raycaster.ray.origin.set( ...(move || this.translation));
        this.raycaster.far = maxDist;
        const intersections = this.raycaster.intersectObjects( this.scene.children, true );
        const onObject = intersections.length > 0;
        if(onObject){
            let dFront = intersections[0].distance;
            let delta = Math.min(dFront-eyeHeight, eyeHeight/16); // can only fall 1/16 eyeHeight at a time
            if(Math.abs(delta)>eyeEpsilon){
                if(delta>0 && !move){ // we are falling
                    const moveForward = v3_add(this.translation, v3_transform([0,0,0.2], m4_rotationQ(this.rotation)));
                    this.findFloor(maxDist, 1, moveForward);
                }else { // fall
                    let t = this.translation;
                    this.moveTo([t[0], t[1]-delta, t[2]]);
                }
            }
        }else{ this.findFloor(maxDist*2, recurse-1); } // try to find the ground...
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
        pawnManager.pawns.forEach(a => {
            if( a.avatar ){
                let d = Math.min(4, v3_sqrMag(v3_sub(a.translation, t)))/4;
                a.setOpacity(d);
            }
        });
        this.future(100).fadeNearby();
    }

    setOpacity(opacity){
        let transparent = opacity!=1;
        if(this.opacity!==opacity){
            this.opacity = opacity;
            this.avatar.traverse( n => {
                if(n.material){
                    n.material.opacity = opacity;
                    n.material.transparent = transparent;
                    n.material.needsUpdate = true;
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

