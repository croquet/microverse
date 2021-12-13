import { mix, Pawn, Actor, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PM_ThreeVisible, PM_ThreeCamera,
    v3_transform, v3_add, q_identity, q_euler, q_axisAngle,
    m4_multiply, m4_rotationQ, m4_translation, m4_getTranslation, m4_getRotation} from "@croquet/worldcore";

import * as THREE from './three/build/three.module.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';

export var myAvatar;
export var isWalking = false; // switchControl() will make it true
let isTweening = false; // transition between camera modes

const eyeHeight = 1.7; // height of eyes above ground in meters
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
            this.orbitCamera.position.set( 0, 20, 0 );

            this.createOrbitControls( this.orbitCamera, renderMgr.renderer );
            this.setControls(isWalking); // walking or orbiting?
            //this.subscribe("input", "pointerDown", this.startMMotion);
            //this.subscribe("input", "pointerUp", this.endMMotion);
            //this.subscribe("input", "pointerCancel", this.endMMotion);
            //this.subscribe("input", "pointerMove", this.continueMMotion);
            this.subscribe("input", "wheel", this.thirdPerson);
            this.raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
            this.raycaster.layers.set( 1 ); // only test against layer 1. Layer 2 is other players.
            this.future(100).fadeNearby();
            this.lastTranslation = this.translation;

            this.joystick = document.getElementById("joystick");
            this.knob = document.getElementById("knob");             
            this.hiddenknob = document.getElementById("hiddenknob"); 
            this.hiddenknob.onpointerdown = (e) => this.startMMotion(e); // use the knob to start
            //this.hiddenknob.onpointerenter = (e) => console.log("pointerEnter")
            this.hiddenknob.onpointerleave = (e) => this.continueMMotion(e);
            this.joystick.onpointermove = (e) => this.continueMMotion(e);
            this.joystick.onpointerup = (e) => this.endMMotion(e);
            this.joystick.onpointercancel = (e) => this.endMMotion(e);
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
        this.orbitControls = new OrbitControls( camera, renderer.domElement );
        this.orbitControls.rotateSpeed = 1.0;
        this.orbitControls.zoomSpeed = 1.0;
        this.orbitControls.panSpeed = 0.8;
        this.orbitControls.enablePan = false;
        this.orbitControls.minDistance = 5;
        this.orbitControls.maxDistance = 100;
        this.orbitControls.maxPolarAngle = Math.PI / 2;
    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        // the avatar memory will be reclaimed when the scene is destroyed - it is a clone, so leave the  geometry and material alone.
    }

    setControls(isWalking){ // switch between walking and orbiting with a tween between
        const input = this.service("InputManager");
        let look = this.walkLook;

        this.walkCamera.position.set( ...m4_getTranslation(look) );
        this.walkCamera.quaternion.set( ...m4_getRotation(look) );
        this.walkCamera.updateMatrixWorld();
        this.orbitControls.target = this.walkCamera.position;
        this.orbitControls.update();
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
                if(!this.findFloor(eyeHeight*1.5,2))this.moveTo(this.lastTranslation);
            }
            this.refreshCameraTransform();
            this.lastTranslation = this.translation;
        }
    }

    // check if we are standing on an object or about to be
    // if not, allow a short distance fall
    findFloor(maxDist, recurse, move){
        if( recurse < 0 )return false; // never found the ground
        this.raycaster.ray.origin.set( ...(move || this.translation));
        this.raycaster.far = maxDist;
        const intersections = this.raycaster.intersectObjects( this.scene.children, true );
        const onObject = intersections.length > 0;
        if(onObject){
            let dFront = intersections[0].distance;
            let delta = Math.min(dFront-eyeHeight, eyeHeight/8); // can only fall 1/8 eyeHeight at a time
            if(Math.abs(delta)>eyeEpsilon){
                if(delta>0 && !move){ // we are falling - check in front of us to see if there is a step
                    const moveForward = v3_add(this.translation, v3_transform([0,0,0.2], m4_rotationQ(this.rotation)));
                    return this.findFloor(maxDist, 1, moveForward);
                }else { // move up or down
                    let t = this.translation;
                    let p = t[1]-delta;
                    this.moveTo([t[0], p, t[2]]);
                    // console.log(delta, Math.atan(delta/2));
                    return true;
                }
            }else return true; // we are on level ground
        }else{ return this.findFloor(maxDist*1.5, recurse-1, move); } // try to find the ground...
    }

    startMMotion( e ){
        e.preventDefault();
        this.knobX = e.clientX;
        this.knobY = e.clientY;
        if(true || isWalking){
            this.activeMMotion = true;
            this.basePosition = e.xy;
        }
    }

    endMMotion( e ){
        e.preventDefault();
        if(true || isWalking){
            this.activeMMotion =false;
            this.setVelocity([0, 0, 0]);
            this.setSpin(q_identity());
            this.hiddenknob.style.left = `0px`;
            this.hiddenknob.style.top = `0px`;
            this.knob.style.left = `30px`;
            this.knob.style.top = `30px`;        }
    }

    continueMMotion( e ){
        e.preventDefault();
        if( this.activeMMotion ){
            let dx = e.clientX - this.knobX;
            let dy = e.clientY - this.knobY;

            // move the avatar
            let v = dy*0.00005;
            v = Math.min(Math.max(v, -0.008),0.008);
            this.setVelocity([0, 0, v]);

            const yaw = dx * -0.000005;
            const qyaw = q_euler(0, yaw ,0);
            this.setSpin(qyaw);

            hiddenknob.style.left = `${dx}px`;
            hiddenknob.style.top = `${dy}px`;            

            let ds = dx*dx+dy*dy;
            if(ds>30*30){ 
                ds = Math.sqrt(ds);
                dx = 30*dx/ds;
                dy = 30*dy/ds;
            }
            knob.style.left = `${30 + dx}px`;
            knob.style.top = `${30 + dy}px`;

            if(!isWalking){
                let look = this.walkLook;

                this.walkCamera.position.set( ...m4_getTranslation(look) );
                this.walkCamera.quaternion.set( ...m4_getRotation(look) );
                this.walkCamera.updateMatrixWorld();
                this.orbitControls.target = this.walkCamera.position;
                this.orbitControls.update();
            }
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

