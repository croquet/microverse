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
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

async function loadGLB(zip, file, scene, onComplete, position, scale, rotation){
    await fetch(zip)
    .then(res => res.blob())
    .then(blob => {
        let jsz = new JSZip();
        jsz.loadAsync(blob, {createFolders: true}).then(function(zip){
            zip.file(file).async("ArrayBuffer").then(function(data) {
                (new GLTFLoader()).parse( data, null, function (gltf) {  
                    if(onComplete)onComplete(gltf);
                    console.log(gltf.scene);
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
loadGLB(powerPlant, "OilFacility.glb", plant, addShadows, [0, -8, 0]);

const avatar = new THREE.Group();
loadGLB(simplehead, "simplehead.glb", avatar, addShadows, [0, -0.2, 0.0], [0.4,0.4,0.4], [0, Math.PI, 0]);

class MyAvatar extends mix(Actor).with(AM_MouselookAvatar, AM_Player) {
    init(options) {
        super.init(options);
        this.isAvatar = true;
    }
    get pawn() {return AvatarPawn}
}

MyAvatar.register('MyAvatar');

class AvatarPawn extends mix(Pawn).with(PM_MouselookAvatar, PM_Player, PM_ThreeVisible, PM_ThreeCamera) {
    constructor(...args) {
        super(...args);
        this.isAvatar = true;
        this.fore = this.back = this.left = this.right = 0;
        this.mouseLookView = true;
        this.opacity = 1;
        this.activeMMotion = false; // mobile motion inactive
        if (this.isMyPlayerPawn) {
            this.subscribe("input", "doubleDown", this.switchView);
            if( isMobile ){
                this.subscribe("input", "pointerDown", this.startMMotion);
                this.subscribe("input", "pointerUp", this.endMMotion);
                this.subscribe("input", "pointerCancel", this.endMMotion);
                this.subscribe("input", "pointerMove", this.continueMMotion);
            }else{
                this.subscribe("input", "pointerLock", this.onPointerLock);
                this.subscribe("input", "wDown", () => {this.fore = 1; this.changeVelocity()});
                this.subscribe("input", "wUp", () => {this.fore = 0; this.changeVelocity()});
                this.subscribe("input", "sDown", () => {this.back = 1; this.changeVelocity()});
                this.subscribe("input", "sUp", () => {this.back = 0; this.changeVelocity()});
                this.subscribe("input", "aDown", () => {this.left = 1; this.changeVelocity()});
                this.subscribe("input", "aUp", () => {this.left = 0; this.changeVelocity()});
                this.subscribe("input", "dDown", () => {this.right = 1; this.changeVelocity()});
                this.subscribe("input", "dUp", () => {this.right = 0; this.changeVelocity()});

                this.subscribe("input", "ArrowUpDown", () => {this.fore = 1; this.changeVelocity()});
                this.subscribe("input", "ArrowUpUp", () => {this.fore = 0; this.changeVelocity()});
                this.subscribe("input", "ArrowDownDown", () => {this.back = 1; this.changeVelocity()});
                this.subscribe("input", "ArrowDownUp", () => {this.back = 0; this.changeVelocity()});
                this.subscribe("input", "ArrowLeftDown", () => {this.left = 1; this.changeVelocity()});
                this.subscribe("input", "ArrowLeftUp", () => {this.left = 0; this.changeVelocity()});
                this.subscribe("input", "ArrowRightDown", () => {this.right = 1; this.changeVelocity()});
                this.subscribe("input", "ArrowRightUp", () => {this.right = 0; this.changeVelocity()});
            }
        } else { 
            // create the avatar (cloned from above) for anyone that is not me (for now)
            let a = this.avatar = avatar.clone();
            a.traverse( n => {if(n.isMesh)n.material = n.material.clone()});
            this.setRenderObject(a);
        }
        this.future(100).fadeNearby();
    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        // the avatar memory will be reclaimed when the scene is destroyed - it is a clone, so leave the  geometry and material alone.
    }

    onPointerLock(inPointerLock) {
        if (inPointerLock) {
            this.subscribe("input", "pointerDelta", this.onPointerDelta);
        } else {
            this.unsubscribe("input", "pointerDelta");
        }
    }

    switchView(){
        this.mouseLookView = !this.mouseLookView;
        console.log("mouseLookView: ", this.mouseLookView)
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
        if(isMobile) return this.global; 
        else {        
    
            const pitchRotation = q_axisAngle([1,0,0], this.lookPitch);
            const yawRotation = q_axisAngle([0,1,0], this.lookYaw);
    
            const modelLocal =  m4_scaleRotationTranslation(this.scale, yawRotation, this.translation)
            let modelGlobal = modelLocal;
            if (this.parent) modelGlobal = m4_multiply(modelLocal, this.parent.global);

            const m0 = m4_translation(this.lookOffset);
            const m1 = m4_rotationQ(pitchRotation);
            const m2 = m4_multiply(m1, m0);
            return m4_multiply(m2, modelGlobal);
        }
    }

    startMMotion( data ){
        this.activeMMotion = true;
        this.basePosition = data.xy;
        console.log( data );
    }

    endMMotion( data ){
        this.activeMMotion =false;
        this.setVelocity([0, 0, 0]);
        this.setSpin(q_identity());
    }

    continueMMotion( data ){
        if( this.activeMMotion ){
            let v = (data.xy[1] - this.basePosition[1])*0.00005;
            v = Math.min(Math.max(v, -0.008),0.008);
            this.setVelocity([0, 0, v]);

            const yaw = (data.xy[0] - this.basePosition[0]) * -0.00001;
            const qyaw = q_euler(0, yaw ,0);
            this.setSpin(qyaw);
        }
    }

    fadeNearby(){
        let pawnManager = this.service("PawnManager");
        let t = this.actor.translation;
        //console.log('-------------')
        pawnManager.pawns.forEach(a => {if(a!==this && a.isAvatar){
                let d = Math.min(4, v3_sqrMag(v3_sub(a.translation, t)))/4;
                //console.log(d)
                a.setOpacity(d);
            }
        });
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

        if( !isMobile ) this.subscribe("input", "click", () => {this.service("InputManager").enterPointerLock()});
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
