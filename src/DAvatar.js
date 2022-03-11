// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
import {
    Constants, Data, mix, GetPawn, Pawn, Actor, AM_Player, AM_Predictive, PM_Predictive, PM_Player, PM_ThreeCamera, PM_ThreeVisible,
    v3_transform, v3_add, v3_scale, v3_sqrMag, v3_normalize, q_pitch, q_yaw, q_roll, q_identity, q_euler, q_axisAngle, v3_lerp, q_slerp, THREE,
    m4_multiply, m4_rotationQ, m4_translation, m4_getTranslation, m4_getRotation} from "@croquet/worldcore";

import { PM_Pointer} from "./Pointer.js";

import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import {addShadows, AssetManager as BasicAssetManager} from "./assetManager.js";

let avatarModelPromises = [];
export let EYE_HEIGHT = 1.7;
export let EYE_EPSILON = 0.01;
export let THROTTLE = 50;
export let isMobile = !!("ontouchstart" in window);

export let isWalking = true;
let isTweening = false; // transition between camera modes

function setUpDnButton(bttn, doThis, doThat) {
    bttn.onpointerdown = doThis;
    bttn.onpointerup = doThat;
}

export class AvatarActor extends mix(Actor).with(AM_Player, AM_Predictive) {
    init(options) {
        // this presumes we are selecting the next avatar in a list - this is not what will happen in the future
        super.init(options);
        this.avatarIndex = options.index;
        
        this.fall = true;
        this.tug = 0.05; // minimize effect of unstable wifi
        this.listen("goHome", this.goHome);
        this.listen("goThere", this.goThere);
        this.listen("startMMotion", this.startFalling);
        this.listen("setTranslation", this.setTranslation);
        this.listen("setFloor", this.setFloor);
        this.listen("avatarLookTo", this.onLookTo);
        this.listen("comeToMe", this.comeToMe);
        this.listen("fileUploaded", "fileUploaded");
        this.listen("addSticky", this.addSticky);
    }
    get pawn() {return AvatarPawn};
    get lookPitch() { return this._lookPitch || 0 };
    get lookYaw() { return this._lookYaw || 0 };
    get lookNormal(){ return v3_transform([0,0,-1], m4_rotationQ(this.rotation)); }

    setSpin(q){
        super.setSpin(q);
        this.follow = undefined;
    }

    setVelocity(v){
        super.setVelocity(v);
        this.follow = undefined;
    }

    setVelocitySpin(vq){
        super.setVelocitySpin(vq);
        this.follow = undefined;
    }

    setTranslation(v){
        this.translation = v;
    }

    setFloor(p){
        let t=this.translation;
        t[1]=p;
        this.translation=t;
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
        this.goTo( ...there, true );
    }

    goTo( v, q, fall ){
        this.follow = undefined;
        this.vStart = [...this.translation];
        this.qStart = [...this.rotation];
        this.vEnd = v;
        this.qEnd = q;
        this.fall = fall;
        this.goToStep(0.1);
        //this.set({translation: there[0], rotation: there[1]});
    }

    goThere(p3d){
        this.follow = undefined;
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
            this.restoreRotation = [...this.rotation];
            this.restoreTranslation = [...this.translation];
            this.restoreTargetId = p3d.targetId;
            let normal = p3d.normal || this.lookNormal; //target normal may not exist
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

    comeToMe(){
        console.log("comeToMe");
        this.norm = this.lookNormal;
        let count = 0;
        console.log(this.fall)
        this.service("PlayerManager").players.forEach((value, key)=>{

            if(this.playerId !== key){
                count++;
                value.goTo(this.translation, this.rotation, this.fall);
                value.follow = this.playerId;
                value.fall = false;
            }
        });
    }
    
    goToStep(delta, t){
        if(!t)t=delta;
        if(t>=1)t=1;
        let v = v3_lerp(this.vStart, this.vEnd, t);
        let q = q_slerp(this.qStart, this.qEnd, t );   
        this.set({translation: v, rotation: q})
        if(t<1)this.future(50).goToStep(delta, t+delta);
    }

    tick(delta) {
        if( this.follow ){
            let followMe = this.service("PlayerManager").players.get(this.follow);
            if(followMe){
                this.moveTo(followMe.translation);
                this.rotateTo(followMe.rotation);
            }else this.follow = undefined;
        } 
        super.tick(delta);
    }

    dropPose(distance){ // compute the position in front of the avatar
        let n = this.lookNormal;
        let t = this.translation;
        let r = this.rotation;
        let p = v3_add(v3_scale(n, distance),t);
        return{translation:p,rotation:r};
    }

    fileUploaded(data) {
        let {dataId, fileName, type, translation, rotation} = data;
        // this.assets.set(dataId, dataId, type);

        let CA = this.constructor.allClasses().find(o => o.name === "CardActor");

        let options = {
            name: fileName,
            translation,
            rotation,
            type: type === "svg" ? "svg" : "model",
            dataLocation: dataId,
            fileName,
            modelType: type,
            shadow: true,
            singleSided: true
        };

        CA.load([{card: options}], this.wellKnownModel("ModelRoot"), "1")[0];

        this.publish(this.sessionId, "triggerPersist");
    }

    addSticky(pe) {
        const tackOffset = 0.1;
        let tackPoint = v3_add(pe.xyz, v3_scale(pe.normal, tackOffset));
        let normal = [...pe.normal]; // clear up and down
        normal[1] = 0;
        let nsq = v3_sqrMag(normal);
        let rotPoint;
        if(nsq > 0.0001){
            normal = v3_normalize(normal);
            let theta = Math.atan2(normal[0], normal[2]);
            rotPoint = q_euler(0, theta, 0);
        } else {
            rotPoint = this.rotation;
            tackPoint[1] += 2;
        }

        let CA = this.constructor.allClasses().find(o => o.name === "CardActor");

        let options = {
            name:'sticky note',
            className: "TextFieldActor",
            translation: tackPoint,
            rotation: rotPoint,
            multiusexor: true,
            type: "text",
            depth: 0.05,
            isSticky: true,
            color: 0xf4e056,
            frameColor: 0xfad912,
            runs: [],
            width: 1,
            height: 1,
            textScale: 0.002
        };

        CA.load([{card: options}], this.wellKnownModel("ModelRoot"), "1")[0];
        this.publish(this.sessionId, "triggerPersist");
    }
}

AvatarActor.register('AvatarActor');

export class AvatarPawn extends mix(Pawn).with(PM_Player, PM_Predictive, PM_ThreeVisible, PM_ThreeCamera, PM_Pointer) {
    constructor(actor) {
        super(actor);
        this.lastUpdateTime = 0;
        this.addToLayers('avatar');
        this.fore = this.back = this.left = this.right = 0;
        this.opacity = 1;
        this.activeMMotion = false; // mobile motion initally inactive
        this.avatarIndex = actor.avatarIndex;
        this._lookPitch = this.actor.lookPitch;
        this._lookYaw = this.actor.lookYaw;
        this._rotation = q_euler(0, this.lookYaw, 0);
        this._lookOffset = [0,0,0]; // Vector displacing the camera from the avatar origin.
        if (this.isMyPlayerPawn) {
            // create a dummy camera that will be moved by the OrbitControls
            let renderMgr = this.service("ThreeRenderManager");
            this.camera = renderMgr.camera;
            this.scene = renderMgr.scene;
            this.lastHeight = EYE_HEIGHT; // tracking the height above ground

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
                    this.capturedPointers[e.pointerId] = "hiddenKnob";
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

            document.getElementById("walkingBttn").onclick = (e) => this.switchControl(e);
            document.getElementById("fullscreenBttn").onclick = (e) => this.toggleFullScreen(e);
            document.getElementById("homeBttn").onclick = () => this.goHome();
            document.getElementById("usersComeHereBttn").onclick = () => this.comeToMe();
            document.getElementById("editModeBttn").setAttribute("mobile", isMobile);

            let editButton = document.getElementById("editModeBttn");
            editButton.onpointerdown = (evt) => this.setEditMode(evt);
            editButton.onpointerup = (evt) => this.clearEditMode(evt);

            this.assetManager = this.service("AssetManager");
            window.assetManager = this.assetManager.assetManager;

            this.assetManager.assetManager.setupHandlersOn(window, (buffer, fileName, type) => {
                return Data.store(this.sessionId, buffer, true).then((handle) => {
                    let dataId = Data.toId(handle);
                    let pose = this.dropPose(6);
                    this.say("fileUploaded", {
                        dataId, fileName, type,
                        translation: pose.translation,
                        rotation: pose.rotation
                    });
                });
            });
        }
        this.constructVisual();
    }

    dropPose(distance){ // compute the position in front of the avatar
        return this.actor.dropPose(distance);
    }
    
    setEditMode(evt) {
        evt.target.setPointerCapture(evt.pointerId);
        this.capturedPointers[evt.pointerId] = "editModeBttn";
        evt.stopPropagation();
        this.ctrlKey = true;
        console.log(this.ctrlKey);
    }

    clearEditMode(evt) {
        if (this.capturedPointers[evt.pointerId] !== "editModeBttn") {return;}
        evt.target.releasePointerCapture(evt.pointerId);
        delete this.capturedPointers[evt.pointerId];
        evt.stopPropagation();
        this.ctrlKey = false;
        console.log(this.ctrlKey);
    }

    constructVisual() {
        this.setupAvatar(this.getAvatarModel(this.avatarIndex % Constants.MaxAvatars));
    }

    get lookOffset(){ return this._lookOffset || [0,0,0]; }
    get lookPitch() { return this._lookPitch || 0; }
    get lookYaw() { return this._lookYaw || 0; }

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
            model.name = "Avatar";
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
        isTweening = false;
        // the avatar memory will be reclaimed when the scene is destroyed - it is a clone, so leave the  geometry and material alone.
        super.destroy();
    }

    setControls(isWalking){ // switch between walking and orbiting with a tween between
        if(isTweening)return;
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
        let tweenCam = this.tweenCamera; 
        let qStart = new THREE.Quaternion(), qEnd = new THREE.Quaternion();
        let vStart = new THREE.Vector3(), vEnd = new THREE.Vector3();
        
        // tween
        let time = {t: 0};
        new TWEEN.Tween( time )
            .to( {t: 1}, 1000 )
            .easing( TWEEN.Easing.Quadratic.InOut )
            //.easing( TWEEN.Easing.Linear.None )
            .onStart( () => {
                //console.log("tween start", time.t)
                qStart.copy( fromCam.quaternion );
                qEnd.copy( toCam.quaternion );
                fromCam.getWorldPosition( vStart );
                toCam.getWorldPosition( vEnd );
            } )
            .onUpdate( () => {
                //console.log('tween update', time.t)
                tweenCam.quaternion.slerpQuaternions( qStart, qEnd, time.t );    
                tweenCam.position.lerpVectors(vStart, vEnd, time.t);
                tweenCam.updateMatrixWorld();
            } )
            .onComplete( () => {
                //console.log("tween end", time.t)
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
        if (!this.isMyPlayerPawn) {return;}
        if (isTweening) TWEEN.update();
        else if(isWalking){
            if(this.isFalling)this._translation[1] = this.floor;

            if (time - this.lastUpdateTime <= (this.isFalling ? 50 : 100)) {return;}
            this.lastUpdateTime = time;
            if(this.vq) { this.setVelocitySpin(this.vq); this.vq = undefined;}
            if (this.actor.fall && !this.findFloor()) {
                if (this.translation !== this.lastTranslation) {
                    this.setTranslation(this.lastTranslation);
                }
            }
        }else{
            this.orbitCamera.updateMatrixWorld();
            this.orbitCamera.updateProjectionMatrix();
        }
        this.refreshCameraTransform();
        this.lastTranslation = this.translation;
    }

    findFloor(move){
        const walkLayer = this.service("ThreeRenderManager").threeLayer('walk');
        if(!walkLayer)return false;
        this.walkcaster.ray.origin.set( ...(move || this.translation));
        const intersections = this.walkcaster.intersectObjects( walkLayer, true );

        if(intersections.length > 0){
            let dFront = intersections[0].distance;
            let delta = Math.min(dFront-EYE_HEIGHT, EYE_HEIGHT/8); // can only fall 1/8 EYE_HEIGHT at a time
            if(Math.abs(delta)>EYE_EPSILON){ // moving up or down...
                let t = this.translation;
                let p = t[1]-delta;
                this.isFalling  = true;
                this.setFloor(p);
                return true;
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
        if(true || isWalking) {
            this.activeMMotion = false;
            this.vq = undefined;
            this.setVelocitySpin([0, 0, 0],q_identity());
            this.hiddenknob.style.transform = "translate(0px, 0px)";
            this.knob.style.transform = "translate(30px, 30px)";
        }
    }

    continueMMotion( e ) {
        e.preventDefault();
        e.stopPropagation(); 

        if( this.activeMMotion ){
            let dx = e.clientX - this.knobX;
            let dy = e.clientY - this.knobY;

            // move the avatar
            let v = dy*0.000075;
            v = Math.min(Math.max(v, -0.01),0.01);

            const yaw = dx * (isMobile?-0.00001:-0.000005);
            const qyaw = q_euler(0, yaw ,0);
            this.vq = [[0,0,v], qyaw];

            hiddenknob.style.transform = `translate(${dx}px, ${dy}px)`;

            let ds = dx*dx+dy*dy;
            if(ds>30*30){ 
                ds = Math.sqrt(ds);
                dx = 30*dx/ds;
                dy = 30*dy/ds;
            }

            knob.style.transform = `translate(${30 + dx}px, ${30 + dy}px)`;

            if(!isWalking) {
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
                break;
            default:
            /* console.log(e) */
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
        if (this.shiftKey && this.shiftDouble) {
            const render = this.service("ThreeRenderManager");
            const rc = this.pointerRaycast(e.xy, render.threeLayerUnion('pointer', 'walk'));
            let pe = this.pointerEvent(rc);
            return this.shiftDouble(pe);
        }
        super.doPointerDoubleDown(e);
    }

    shiftDouble(pe) {
        this.say("addSticky", pe);
    }

    xy2yp(xy){
        let camera = this.service("ThreeRenderManager").camera;
        let fov = camera.fov/2;
        let h = window.innerHeight/2;
        let w = window.innerWidth/2;
        let c = (fov*Math.PI/180)/h;
        return[c*(w-xy[0]), c*(h-xy[1])];
    }

    doPointerTap(e){
        if(this.editPawn){ // this gets set in doPointerDown
//            if(this.editMode){ // if we are in edit mode, clear it
                console.log("am I HERE????")
                this.editPawn.unselectEdit();
                this.editPawn.showControls(this.actor.id);
                this.editPawn = null;
                this.editPointerId = null;
                this.editMode = false;
//            }
        }
        /*
                this.editPawn = null;
                this.editPointerId = null;
                this.editMode = false;
                console.log("doPointerTap clear editMode")
            } else {
                console.log("doPointerTap set editMode")
                this.editMode = true; // otherwise, set it
                console.log("doPointerTap",this.actor.id);
                this.editPawn.showControls(this.actor.id);
            }
        }*/
    }

    doPointerDown(e){
        if(this.ctrlKey || this.editPawn){
            const render = this.service("ThreeRenderManager");
            const rc = this.pointerRaycast(e.xy, render.threeLayerUnion('pointer')); // add walk if you want to edit the world
            let p3e = this.pointerEvent(rc);
            p3e.lookNormal = this.actor.lookNormal;
            let pawn = GetPawn(p3e.targetId);

            if(this.editPawn !== pawn){
                if(this.editPawn){
                    console.log('doPointerDown clear old editPawn')
                    this.editPawn.unselectEdit(); 
                    this.editPawn = null;
                    this.editPointerId = null;
                }
                console.log('doPointerDown set new editPawn', pawn)
                this.editMode = false; // this gets set later
                if(pawn){
                    this.editPawn = pawn;
                    this.editPointerId = e.id;
                    this.editPawn.selectEdit();
                    this.isPointerDown = true;
                    this.buttonDown = e.button;
                    if(!p3e.normal){p3e.normal = this.actor.lookNormal}
                    this.p3eDown = p3e;
                }
            }else{
                console.log("doPointerDown in editMode")
            }
        } else {       
            super.doPointerDown(e);
            if(isWalking && !this.focusPawn){
                this.dragWorld = this.xy2yp(e.xy);
                this._lookYaw = q_yaw(this._rotation);
            }
        }
    }

    doPointerMove(e){
        if(this.editMode){ // pawn is in an edit mode
            if(this.isPointerDown){ 
                console.log('doPointerMove editMode')
            }
        }else if(this.editPawn){
            // pawn is in drag mode
            if (e.id === this.editPointerId) {
                if(this.buttonDown === 0)
                    this.editPawn.dragPlane(this.setRayCast(e.xy), this.p3eDown);
                else if(this.buttonDown == 2)
                    this.editPawn.rotatePlane(this.setRayCast(e.xy), this.p3eDown);
            }
        }else {
            super.doPointerMove(e);
            if(isWalking && !this.focusPawn && this.isPointerDown){
                let yp = this.xy2yp(e.xy);
                let yaw = this._lookYaw + this.dragWorld[0] - yp[0];
                let pitch = this._lookPitch + this.dragWorld[1] -yp[1];
                pitch = pitch>1 ? 1 : (pitch<-1 ? -1: pitch);
                this.dragWorld = yp;
                this.lookTo(pitch, yaw);
            }
        }
    }

    doPointerUp(e){
        this.isPointerDown = false;
        if(this.editMode) {
            console.log("doPointerUp editMode");
        } else if(this.editPawn) {
            this.editPawn.unselectEdit();
            this.editPawn = null;
            this.editPointerId = null;
            this.p3eDown = undefined;
        } else super.doPointerUp(e);
    }

    doPointerWheel(e) {
        const rc = this.pointerRaycast(e.xy, this.getTargets("pointerWheel"));
        if (rc.pawn) {
            this.invokeListeners("pointerWheel", rc.pawn, rc, e);
            return;
        }

        let z = this.lookOffset[2];
        z += e.deltaY / 1000.0;
        z = Math.min(4, Math.max(z,0));
        this.lookOffset[1] = z / 3;
        this.lookOffset[2] = z;
        this.lookTo(-z / 8, q_yaw(this._rotation));
    }

    fadeNearby(){
        let pawnManager = this.service("PawnManager"); 
        pawnManager.pawns.forEach(a => {
            if( a.avatar ){
                let m = this.lookGlobal; // camera location
                let cv = new THREE.Vector3(m[12], m[13], m[14]);
                m = a.global; // avatar location
                let av = new THREE.Vector3(m[12], m[13], m[14])
                let d = Math.min(1, cv.distanceToSquared(av) / 10);
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
    
    goHome() {
        console.log("goHome")
        this.say("goHome", [[0,0,0], [0,0,0,1]])
    }

    comeToMe(){
        console.log("comeToMe");
        this.say("comeToMe");
    }

    switchControl(e) {
        e.stopPropagation();
        e.preventDefault();
    
        isWalking = !isWalking;
        this.setControls(isWalking);
        let button = document.getElementById("walkingBttn");
        if (button) {
            button.setAttribute("isWalking", isWalking);
        }
    }

    toggleFullScreen(e) {
        e.stopPropagation();
        e.preventDefault();
    
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
    }

    setTranslation(v){
        this._translation = v;
        this.onLocalChanged();
        this.say("setTranslation", v);
    }

    setFloor(p){
        // we don't want to touch the x/z values because they are
        // computed from avatar velocity. _translation x/z values are old.
        this._translation[1] = p;
        this.floor = p;
        this.onLocalChanged();
        this.say("setFloor", p, 100);
    }
}
