import { Constants, mix, GetPawn, Pawn, Actor, AM_Player, AM_Predictive, PM_Predictive, PM_Player, PM_ThreeCamera, PM_ThreeVisible, PM_LayerTarget,
         v3_transform, v3_add, v3_scale, v3_sqrMag, v3_normalize, q_pitch, q_yaw, q_roll, q_identity, q_euler, q_axisAngle, v3_lerp, q_slerp, THREE,
         m4_multiply, m4_rotationQ, m4_translation, m4_getTranslation, m4_getRotation} from "@croquet/worldcore";

import { PM_Pointer} from "./Pointer.js";

import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { D } from './DConstants.js';
import { defaultKeyBindings } from "./text/text-commands.js";
import {AssetManager} from "./wcAssetManager.js";
import {addShadows, AssetManager as BasicAssetManager} from "./assetManager.js";

export var myAvatarId; 
export var myAvatar;
let avatarModelPromises = [];

export var isWalking = false; // switchControl() will make it true
let isTweening = false; // transition between camera modes

// simple "click button, do this, nothing else"
function setupButton( bttn, dothis ){ 
    bttn.addEventListener("click", dothis, false);
    bttn.addEventListener("pointerdown", e=>e.stopPropagation(), false);// button click passes through to world otherwise
    bttn.addEventListener("pointerup", e=>e.stopPropagation(), false);
}
// swith between walk and orbit
setupButton(document.getElementById("orbitingBttn"), switchControl);
setupButton(document.getElementById("walkingBttn"), switchControl);
setupButton(document.getElementById("fullscreenBttn"), toggleFullScreen);
/*
setupButton(document.getElementById("undoObject"), undoChange);
setupButton(document.getElementById("deleteObject"), deleteObject);
setupButton(document.getElementById("scalebject"), scaleObject);
setupButton(document.getElementById("rotatebject"), rotateObject);
setupButton(document.getElementById("dragbject"), dragObject);
*/

function switchControl(e){
    isWalking = !isWalking;
    if(myAvatar)myAvatar.setControls(isWalking);
    document.getElementById("walkingBttn" ).style.display=isWalking?"none":"inline-block";
    document.getElementById("orbitingBttn").style.display=isWalking?"inline-block":"none";
    if(e){e.stopPropagation(); e.preventDefault();}
}
switchControl(); //initialize the buttons (lazy me)

function toggleFullScreen(e) {
    if (!document.fullscreenElement) {
      // If the document is not in full screen mode
      // make the document full screen
      document.body.requestFullscreen();
    } else {
      // Otherwise exit the full screen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    if(e){e.stopPropagation(); e.preventDefault();}
  }
  

export class AvatarActor extends mix(Actor).with(AM_Player, AM_Predictive) {
    init(options) {
        // this presumes we are selecting the next avatar in a list - this is not what will happen in the future
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn will not see it
        super.init(options);
        this.fall = true;
        this.listen("goHome", this.goHome);
        this.listen("doubleDown", this.goThere);
        this.listen("startMMotion", this.startFalling);
        this.listen("setTranslation", this.setTranslation);
        this.listen("setFloor", this.setFloor);
        this.listen("avatarLookTo", this.onLookTo);
    }
    get pawn() {return AvatarPawn};
    get lookPitch() { return this._lookPitch || 0 };
    get lookYaw() { return this._lookYaw || 0 };
    get lookNormal(){ return v3_transform([0,0,-1], m4_rotationQ(this.rotation)); }

    setTranslation(v){
        this._translation = v;
    }

    setFloor(p){
        let t=this.translation;
        t[1]=p;
        this._translation=t;
    }

    startFalling(){
        this.fall = true;
    }

    onLookTo(e) {
        this.set({lookPitch: e[0], lookYaw: e[1]});
        this.rotateTo(q_euler(0, this.lookYaw, 0));
        this.restoreTargetId = undefined; // if you look around, you can't jump back
    }

    goHome( there ){
        console.log("goHome:", there, this.translation, this.rotation);
        this.set({translation: there[0], rotation: there[1]});
    }

    goThere(p3d){
        this.vStart = [...this.translation];
        this.qStart = [...this.rotation];

        if(!this.fall && (p3d.targetId===this.restoreTargetId)){ // jumpback if you are  doubleclicking on the same target you did before
            this.vEnd = this.restoreTranslation;
            this.qEnd = this.restoreRotation;
            this.restoreRotation = undefined;
            this.restoreTranslation = undefined;
            this.restoreTargetId = undefined;
        }else{
            this.fall = false; // sticky until we move
            this.restoreRotation = this.rotation;
            this.restoreTranslation = this.translation;
            this.restoreTargetId = p3d.targetId;
            let normal = p3d.normal;
            let point = p3d.xyz;
            this.vEnd = v3_add(point, v3_scale(normal, p3d.offset));
            normal[1]=0; // clear up and down
            let nsq = v3_sqrMag(normal);
            if(nsq < 0.0001){
                this.qEnd = this.rotation; // use the current rotation
            }else {
                normal = v3_normalize(normal);
                let theta = Math.atan2(normal[0], normal[2]);
                this.qEnd = q_euler(0, theta, 0);
            }
        }
        this.goToStep(0.1);
    }

    goToStep(delta, t){
        if(!t)t=delta;
        if(t>=1)t=1;
        let v = v3_lerp(this.vStart, this.vEnd, t);
        let q = q_slerp(this.qStart, this.qEnd, t );   
        this.set({translation: v, rotation: q})
        if(t<1)this.future(50).goToStep(delta, t+delta);
    }
}

AvatarActor.register('AvatarActor');

export class AvatarPawn extends mix(Pawn).with(PM_Player, PM_Predictive, PM_ThreeVisible, PM_ThreeCamera, PM_Pointer){
    constructor(...args) {
        super(...args);
        this.isAvatar = true;
        this.speed = 0;
        this.lastUpdateTime = 0;
        this.addToLayers('avatar');
        this.fore = this.back = this.left = this.right = 0;
        this.opacity = 1;
        this.activeMMotion = false; // mobile motion initally inactive
        this.avatarIndex = args[0].avatarIndex;
        this._lookPitch = this.actor.lookPitch;
        this._lookYaw = this.actor.lookYaw;
        this.rotateTo(q_euler(0, this.lookYaw, 0));
        this._lookOffset = [0,0,0]; // Vector displacing the camera from the avatar origin.

        if (this.isMyPlayerPawn) {
            myAvatar = this; // set the global for callbacks
            myAvatarId = this.actor.id;
            // create a dummy camera that will be moved by the OrbitControls
            let renderMgr = this.service("ThreeRenderManager");
            this.camera = renderMgr.camera;
            this.scene = renderMgr.scene;
            this.lastHeight = D.EYE_HEIGHT; // tracking the height above ground

            //this.tweenCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            //this.walkCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.orbitCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.tweenCamera = new THREE.Object3D();
            this.walkCamera = new THREE.Object3D();
            this.orbitCamera.position.set( 0, 20, 0 );

            this.createOrbitControls( this.orbitCamera, renderMgr.renderer );
            this.setControls(isWalking); // walking or orbiting?

            this.walkcaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ));
            this.future(100).fadeNearby();
            this.lastTranslation = this.translation;

            this.capturedPointers = {};
            this.joystick = document.getElementById("joystick");
            this.knob = document.getElementById("knob");
            this.releaseHandler = (e) => {
                for (let k in this.capturedPointers) {
                    this.hiddenknob.releasePointerCapture(k);
                }
                this.capturedPointers = {};
                this.endMMotion(e);
            };
                
            this.hiddenknob = document.getElementById("hiddenknob"); 
            this.hiddenknob.onpointerdown = (e) => {
                if (e.pointerId) {
                    this.capturedPointers[e.pointerId] = true;
                    this.hiddenknob.setPointerCapture(e.pointerId);
                }
                this.startMMotion(e); // use the knob to start
            };
            //this.hiddenknob.onpointerenter = (e) => console.log("pointerEnter")
            // this.hiddenknob.onpointerleave = (e) => this.continueMMotion(e);
            this.hiddenknob.onpointerleave = (e) => this.releaseHandler(e);
            this.hiddenknob.onpointermove = (e) => this.continueMMotion(e);
            this.hiddenknob.onpointerup = (e) => this.releaseHandler(e);
            this.hiddenknob.onpointercancel = (e) => this.releaseHandler(e);
            this.hiddenknob.onlostpointercapture = (e) => this.releaseHandler(e);

            setupButton(document.getElementById("homeBttn"), this.goHome);
        }
        this.constructVisual();
    }

    constructVisual(){
        // add the 3D avatar here using
        // this.setRenderObject(a)
    }

    get lookOffset(){return this._lookOffset || [0,0,0]}
    get lookPitch() { return this._lookPitch || 0}
    get lookYaw() { return this._lookYaw || 0}

    getAvatarModel(index) {
        if (avatarModelPromises[index]) {
            return avatarModelPromises[index];
        }

        let name = Constants.AvatarNames[index];
        if (!name) {name = Constants.AvatarNames[0];}

        let promise = fetch(`./assets/avatars/${name}.zip`)
            .then((resp) => resp.arrayBuffer())
            .then((arrayBuffer) => new BasicAssetManager().load(new Uint8Array(arrayBuffer), "glb", THREE))
            .then((obj) => {
                addShadows(obj, true, true, THREE);
                obj.scale.set(0.4,0.4,0.4);
                obj.rotation.set(0, Math.PI, 0);
                let group = new THREE.Group();
                group.add(obj);
                return group;
            });

        avatarModelPromises[index] = promise;
        return promise;
    }

    setupAvatar(modelPromise) {// create the avatar (cloned from above)
        modelPromise.then((model) => {
            model = this.avatar = model.clone();
            model.traverse(n => {
                if (n.material) {
                    n.material = n.material.clone();
                }
            });
            
            this.addToLayers('avatar');
            this.setRenderObject(model);  // note the extension
        });
    }

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
        if(isWalking) this.tween(this.orbitCamera, this.walkCamera); //, ()=> input.addAllListeners());
        else  this.tween(this.walkCamera, this.orbitCamera); //, ()=>input.removeAllListeners());
    }

    // This tween is only on the view side because we are transitioning between two cameras.
    // This does not actually affect the avatar's position, just where you see him from.
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
            if(isTweening && this.tweenCamera.matrixWorld)return this.tweenCamera.matrixWorld.elements;
            if(isWalking)return this.walkLook;
            if(this.orbitCamera && this.orbitCamera.matrixWorld){return this.orbitCamera.matrixWorld.elements;}
            return this.global;
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
        if(time-this.lastUpdateTime > (this.isFalling ? 25:100)){
            this.lastUpdateTime = time;
            if(this.isMyPlayerPawn){
                if(isTweening) TWEEN.update();
                if(!isWalking){
                    this.orbitCamera.updateMatrixWorld();
                    this.orbitCamera.updateProjectionMatrix();
                }else{
                    if(this.actor.fall)
                        if(!this.findFloor()){
                            if(this.translation !== this.lastTranslation){
                                this.setTranslation(this.lastTranslation);
                            }
                        }
                }
                this.refreshCameraTransform();
                this.lastTranslation = this.translation;
            }
        }
    }

    findFloor(move){
        const walkLayer = this.service("ThreeRenderManager").threeLayer('walk');
        if(!walkLayer)return false;
        this.walkcaster.ray.origin.set( ...(move || this.translation));
        const intersections = this.walkcaster.intersectObjects( walkLayer, true );

        if(intersections.length > 0){
            let dFront = intersections[0].distance;
            let delta = Math.min(dFront-D.EYE_HEIGHT, D.EYE_HEIGHT/8); // can only fall 1/8 D.EYE_HEIGHT at a time
            if(Math.abs(delta)>D.EYE_EPSILON){ // moving up or down...
                if(delta>0 && !move){ // we are falling - check in front of us to see if there is a step
                    const moveForward = v3_add(this.translation, v3_transform([0,0,0.2], m4_rotationQ(this.rotation)));
                    return this.findFloor(moveForward);
                }else { // move up or down
                    let t = this.translation;
                    let p = t[1]-delta;
                    this.isFalling  = true;
                    this.setFloor(p);
                    return true;
                }
            }else {this.isFalling = false; return true; }// we are on level ground
        }return false; // try to find the ground...
    }

    startMMotion( e ){
        e.preventDefault();
        e.stopPropagation(); 
        this.knobX = e.clientX;
        this.knobY = e.clientY;
        this.say("startMMotion");
        if(true || isWalking){
            this.activeMMotion = true;
            this.basePosition = e.xy;
        }
    }

    endMMotion( e ){
        e.preventDefault();
        e.stopPropagation(); 
        if(true || isWalking){
            this.activeMMotion =false;
            this.setVelocity([0, 0, 0]);
            this.speed = 0;
            this.setSpin(q_identity());
            this.hiddenknob.style.left = `0px`;
            this.hiddenknob.style.top = `0px`;
            this.knob.style.left = `30px`;
            this.knob.style.top = `30px`;        }
    }

    continueMMotion( e ){
        e.preventDefault();
        e.stopPropagation(); 
        if( this.activeMMotion ){
            let dx = e.clientX - this.knobX;
            let dy = e.clientY - this.knobY;

            // move the avatar
            let v = dy*0.000075;
            v = Math.min(Math.max(v, -0.01),0.01);
            this.setVelocity([0, 0, v]);
            this.speed = v;
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

    doKeyDown(e){
        super.doKeyDown(e);
        switch(e.key){
            case 'Shift': this.shiftKey = true; break;
            case 'Control': this.ctrlKey = true; break;
            case 'Alt': this.altKey = true; break;
            case 'i': 
                console.log("translation: ",this.actor.translation);
                console.log("rotation:", q_pitch(this.actor.rotation),
                    q_yaw(this.actor.rotation), q_roll(this.actor.rotation));
                console.log("scale:", this.actor.scale);
            default: console.log(e)
        }
    }

    doKeyUp(e){
        super.doKeyUp(e);
        switch(e.key){
            case 'Shift': this.shiftKey = false; break;
            case 'Control': this.ctrlKey = false; break;
            case 'Alt': this.altKey = false; break;
        }
    }

    doPointerDoubleDown(e) {
        const render = this.service("ThreeRenderManager");
        const rc = this.pointerRaycast(e.xy, render.threeLayerUnion('pointer', 'walk'));
        let pe = this.pointerEvent(rc);
        if(this.shiftKey && this.shiftDouble) this.shiftDouble(pe);
        else if(pe.targetId){
            let pawn = GetPawn(pe.targetId);
            let pose = pawn.getJumpToPose?pawn.getJumpToPose():undefined;
            console.log(pawn, pose)
            if(pose){
                pe.xyz = pose[0]; // world coordinates
                pe.offset = pose[1]; // distance from target
            } else pe.offset = D.EYE_HEIGHT;
            this.say("doubleDown", pe);
        }
    }

    xy2yp(xy){
        let camera = this.service("ThreeRenderManager").camera;
        let fov = camera.fov/2;
        let h = window.innerHeight/2;
        let w = window.innerWidth/2;
        let c = (fov*Math.PI/180)/h;
        return[c*(w-xy[0]), c*(h-xy[1])];
    }

    doPointerDown(p3e){
        super.doPointerDown(p3e);
        if(this.ctrlKey){
            console.log("doPointerDown + ctrl", this.focusPawn )

        } else if(isWalking && !this.focusPawn){
            this.dragWorld = this.xy2yp(p3e.xy);
            this._lookYaw = q_yaw(this._rotation);
        }
    }

    doPointerMove(p3e){
        super.doPointerMove(p3e);
        if(isWalking && !this.focusPawn && this.isPointerDown){
            let yp = this.xy2yp(p3e.xy);
            let yaw = this._lookYaw + this.dragWorld[0] - yp[0];
            let pitch = this._lookPitch + this.dragWorld[1] -yp[1];
            pitch = pitch>1 ? 1 : (pitch<-1 ? -1: pitch);
            this.dragWorld = yp;
            this.lookTo(pitch, yaw);
        }
    }

    doPointerUp(p3e){
        super.doPointerUp(p3e);

    }

    doPointerWheel(wheel){        
        if (this.focusPawn) this.focusPawn.say("pointerWheel", wheel);
        else{
            let z = this.lookOffset[2];
            z += wheel/1000.0;
            z = Math.min(4, Math.max(z,0));
            this.lookOffset[1]=z/3;
            this.lookOffset[2]=z;
            this.lookTo(-z/8, this._lookYaw);
        }
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
    
    goHome(){ // in a callback, so use myAvatar
        console.log("goHome")
        myAvatar.say("goHome", [[0,0,0], [0,0,0,1]])
    }

    setTranslation(v){
        this._translation = v;
        this.onLocalChanged();
        this.say("setTranslation", v);
    }

    setFloor(p){
        this._translation[1] = p;
        this.onLocalChanged();
        this.say("setFloor", p);
    }
}
