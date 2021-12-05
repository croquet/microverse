import { mix, Pawn, Actor, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PM_ThreeVisible, PM_ThreeCamera,
    v3_transform, v3_add, q_identity, q_euler, q_axisAngle,
    m4_multiply, m4_rotationQ, m4_translation} from "@croquet/worldcore";

import * as THREE from './three/build/three.module.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';

export var myAvatar;
export var isWalking = false; // switchControl() will make it true
let isTweening = false; // transition between camera modes

const eyeHeight = 1.8; // height of eyes above ground in meters
const eyeEpsilon = 0.1; // don't replicate the change unless it is sufficiently large

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

export class AMVAvatar extends mix(Actor).with(AM_Player, AM_Avatar) {
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
    }
    
    get lookPitch() { return this._lookPitch || 0 };
    get lookYaw() { return this._lookYaw || 0 };

    onLookTo(e) {
        this.set({lookPitch: e[0], lookYaw: e[1]});
        this.rotateTo(q_euler(0, this.lookYaw, 0));
    }
}

export class PMVAvatar extends mix(Pawn).with(PM_Player, PM_Avatar, PM_ThreeVisible, PM_ThreeCamera){
    constructor(...args) {
        super(...args);
        this.isAvatar = true;
        this.fore = this.back = this.left = this.right = 0;
        this.opacity = 1;
        this.activeMMotion = false; // mobile motion initally inactive
        this.avatarIndex = args[0].avatarIndex;
        this._lookPitch = this.actor.lookPitch;
        this._lookYaw = this.actor.lookYaw;
        this._lookOffset = [0,0,0]; // Vector displacing the camera from the avatar origin.

        if (this.isMyPlayerPawn) {
            myAvatar = this; // set the global for callbacks
            // create a dummy camera that will be moved by the OrbitControls
            let renderMgr = this.service("ThreeRenderManager");
            this.camera = renderMgr.camera;
            this.scene = renderMgr.scene;
            this.lastHeight = eyeHeight; // tracking the height above ground

            //this.tweenCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            //this.walkCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.orbitCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.tweenCamera = new THREE.Object3D();
            this.walkCamera = new THREE.Object3D();
            this.orbitCamera.position.set( 100, 50, 0 );

            this.createOrbitControls( this.orbitCamera, renderMgr.renderer );
            this.setControls(isWalking); // walking or orbiting?
            this.subscribe("input", "pointerDown", this.startMMotion);
            this.subscribe("input", "pointerUp", this.endMMotion);
            this.subscribe("input", "pointerCancel", this.endMMotion);
            this.subscribe("input", "pointerMove", this.continueMMotion);
            this.subscribe("input", "wheel", this.thirdPerson);
            this.raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
            this.raycaster.layers.set( 1 ); // only test against layer 1. Layer 2 is other players.
            this.future(100).fadeNearby();
        } 
        this.constructVisual();
    }

    constructVisual(){
        // add the 3D avatar here using
        // this.setRenderObject(a)
    }

    get lookOffset(){return this._lookOffset || [0,0,0]}
    get lookPitch() { return this._lookPitch}
    get lookYaw() { return this._lookYaw}

    lookTo(pitch, yaw) {
        this._lookPitch = pitch;
        this._lookYaw = yaw;
        this.lastLookTime = this.time;
        this.lastLookCache = null;
        this.say("avatarLookTo", [pitch, yaw]);
        this.say("lookGlobalChanged");
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
            else if(isWalking)return this.walkLook;
            else if(this.orbitCamera){return this.orbitCamera.matrixWorld.elements;}
            else return this.global;
        }else return this.global;
    }

    get walkLook() {
        const pitchRotation = q_axisAngle([1,0,0], this.lookPitch);
        const m0 = m4_translation(this.lookOffset);
        const m1 = m4_rotationQ(pitchRotation);
        const m2 = m4_multiply(m1, m0);
        return m4_multiply(m2, this.global);
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

    thirdPerson(data){        
        let z = this.lookOffset[2];
        z += data/1000.0;
        z = Math.min(4, Math.max(z,0));
        this.lookOffset[1]=z/3;
        this.lookOffset[2]=z;
        this.lookTo(-z/8, 0);
    }

    fadeNearby(){
        let pawnManager = this.service("PawnManager"); 
        pawnManager.pawns.forEach(a => {
            if( a.avatar ){
                let m = this.lookGlobal; // camera location
                let cv = new THREE.Vector3(m[12], m[13], m[14]);
                m = a.global; // avatar location
                let av = new THREE.Vector3(m[12], m[13], m[14])
                let d = Math.min(1, cv.distanceToSquared(av)/3);
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