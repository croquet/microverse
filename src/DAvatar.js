// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
import {
    Constants, Data, App, ViewService, mix, GetPawn, Pawn, Actor, AM_Player, AM_Predictive, PM_Predictive, PM_Player, PM_ThreeCamera, PM_ThreeVisible,
    v3_transform, v3_add, v3_scale, v3_sqrMag, v3_normalize, v3_rotate, v3_multiply, q_pitch, q_yaw, q_roll, q_identity, q_euler, q_axisAngle, v3_lerp, q_slerp, THREE,
    m4_multiply, m4_rotationQ, m4_translation, m4_getTranslation, m4_getRotation} from "@croquet/worldcore";

import { PM_Pointer} from "./Pointer.js";
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import {addShadows, AssetManager as BasicAssetManager} from "./assetManager.js";

import {setupWorldMenuButton} from "./worldMenu.js";

let avatarModelPromises = [];
export let EYE_HEIGHT = 1.7;
export let EYE_EPSILON = 0.01;
export let THROTTLE = 50;
export let isMobile = !!("ontouchstart" in window);

let isTweening = false; // transition between camera modes

let avatarManager; // Local pointer for avatars

export class AvatarManager extends ViewService {
    constructor(name) {
        super(name || "AvatarManager");
        avatarManager = this;
        this.avatars = new Map();
    }

    add(avatar) {
        this.avatars.set(avatar.actor.id, avatar);
    }

    has(id) {
        return this.avatars.has(id);
    }

    get(id) {
        return this.avatars.get(id);
    }

    delete(avatar) {
        this.avatars.delete(avatar.actor.id);
    }
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
        let t = this.translation;
        this.translation = [t[0], p, t[2]];
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
            let normal = [...(p3d.normal || this.lookNormal)]; //target normal may not exist
            let point = p3d.xyz;
            this.vEnd = v3_add(point, v3_scale(normal, p3d.offset));
            normal[1] = 0; // clear up and down
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

    dropPose(distance, optOffset) {
        // compute the position in front of the avatar
        // optOffset is perpendicular (on the same xz plane) to the lookNormal 

        let n = this.lookNormal;
        let t = this.translation;
        let r = this.rotation;
        if (!optOffset) {
            let p = v3_add(v3_scale(n, distance), t);
            return {translation: p, rotation: r};
        }

        let q = q_euler(0, -Math.PI / 2, 0);
        let perpendicular = v3_rotate(n, q);
        let offset = v3_multiply(optOffset, perpendicular);
        let p = v3_add(v3_add(v3_scale(n, distance), t), offset);
        return {translation:p, rotation:r};
    }

    fileUploaded(data) {
        let {dataId, fileName, type, translation, rotation} = data;
        // this.assets.set(dataId, dataId, type);
console.log("fileUploaded", type)
        let CA = this.constructor.allClasses().find(o => o.name === "CardActor");

        let cardType = type === "exr" ? "lighting" :(type === "svg" || type === "img" ? "2d" : "3d");

        let options = {
            name: fileName,
            translation,
            rotation,
            type: cardType,
            fileName,
            modelType: type,
            shadow: true,
            singleSided: true
        };

        if (type === "img") {
            options = {
                ...options,
                ...{
                    textureLocation: dataId, textureType: "image", scale: [4, 4, 4],
                    cornerRadius: 0.02, fullBright: false
                }
            };
        } else {
            options = {...options, ...{dataLocation: dataId}};
        }

        if (type !== "exr") {
            CA.load([{card: options}], this.wellKnownModel("ModelRoot"), "1")[0];
        } else {
            let light = [...this.service("ActorManager").actors.values()].find(o => o.constructor.name === "DLight");
            if (light) {
                light.updateOptions({...light._cardData, dataLocation: dataId});
            }
        }

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
            backgroundColor: 0xf4e056,
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
        avatarManager.add(this);
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
            let renderMgr = this.service("ThreeRenderManager");
            this.camera = renderMgr.camera;
            this.scene = renderMgr.scene;
            this.lastHeight = EYE_HEIGHT; // tracking the height above ground
            this.yawDirection = -1; // which way the mouse moves the world depends on if we are using WASD or not
            //this.tweenCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            //this.walkCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.tweenCamera = new THREE.Object3D();
            this.walkCamera = new THREE.Object3D();

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

             document.getElementById("fullscreenBttn").onclick = (e) => this.toggleFullScreen(e);
            document.getElementById("homeBttn").onclick = () => this.goHome();
            document.getElementById("usersComeHereBttn").onclick = () => this.comeToMe();
            document.getElementById("editModeBttn").setAttribute("mobile", isMobile);

            let editButton = document.getElementById("editModeBttn");
            editButton.onpointerdown = (evt) => this.setEditMode(evt);
            editButton.onpointerup = (evt) => this.clearEditMode(evt);

            let qrCanvas = App.makeQRCanvas({width: 180, height: 180});
            setupWorldMenuButton(this, qrCanvas);

            this.assetManager = this.service("AssetManager");
            window.assetManager = this.assetManager.assetManager;

            this.assetManager.assetManager.setupHandlersOn(window, (buffer, fileName, type) => {
                return Data.store(this.sessionId, buffer, true).then((handle) => {
                    let dataId = Data.toId(handle);
                    let pose = this.dropPose(6);
                    this.say("fileUploaded", {
                        dataId, fileName, type: /^(jpe?g|png|gif)$/.test(type) ? "img" : type,
                        translation: pose.translation,
                        rotation: pose.rotation
                    });
                });
            });
        }
        this.constructVisual();
    }

    dropPose(distance, optOffset) { // compute the position in front of the avatar
        return this.actor.dropPose(distance, optOffset);
    }
    
    setEditMode(evt) {
        evt.target.setPointerCapture(evt.pointerId);
        this.capturedPointers[evt.pointerId] = "editModeBttn";
        evt.stopPropagation();
        this.ctrlKey = true;
        console.log("setEditMode", this.ctrlKey);
    }

    clearEditMode(evt) {
        if (this.capturedPointers[evt.pointerId] !== "editModeBttn") {return;}
        evt.target.releasePointerCapture(evt.pointerId);
        delete this.capturedPointers[evt.pointerId];
        evt.stopPropagation();
        this.ctrlKey = false;
        console.log("clearEditMode", this.ctrlKey);
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
                console.log("getAvatarModel",obj);
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

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        isTweening = false;
        // the avatar memory will be reclaimed when the scene is destroyed - it is a clone, so leave the  geometry and material alone.
        avatarManager.delete(this); // delete from the avatarManager
        super.destroy();
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
            return this.walkLook;
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
        else{
            if(this.isFalling) {
                let t = this._translation;
                this._translation = [t[0], this.floor, t[2]];
            }

            if (time - this.lastUpdateTime <= (this.isFalling ? 50 : 200)) {return;}
            this.lastUpdateTime = time;
            if(this.vq) { this.setVelocitySpin(this.vq); this.vq = undefined;}
            if (this.actor.fall && !this.findFloor()) {
                if (this.translation !== this.lastTranslation) {
                    this.setTranslation(this.lastTranslation);
                }
            }
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
        this.activeMMotion = true;
        this.basePosition = e.xy;
    }

    endMMotion( e ){
        e.preventDefault();
        e.stopPropagation(); 
        this.activeMMotion = false;
        this.vq = undefined;
        this.setVelocitySpin([0, 0, 0],q_identity());
        this.hiddenknob.style.transform = "translate(0px, 0px)";
        this.knob.style.transform = "translate(30px, 30px)";
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
        }
    }

    doKeyDown(e){
        super.doKeyDown(e);
        switch(e.key){
            case 'Shift': this.shiftKey = true; break;
            case 'Control': this.ctrlKey = true; break;
            case 'Alt': this.altKey = true; break;
            case 'Tab': this.jumpToNote(this.shiftKey); break;
            case 'w': case 'W': // forward
                this.yawDirection = -2;
                this.setVelocity([0,0,-0.01]);
                break;
            case 'a': case 'A': // left strafe
                this.yawDirection = -2;
                this.setVelocity([-0.01, 0, 0]);
                break;
            case 'd': case 'D': // right strafe
                this.yawDirection = -2;
                this.setVelocity([0.01, 0, 0]);
                break;
            case 's': case 'S': // backward
                this.yawDirection = -2;
                this.setVelocity([0, 0, 0.01]);
                break;
            default:
                if(this.ctrlKey){
                    switch(e.key){
                        case 'a': 
                            console.log("MyAvatar");
                            console.log("translation: ",this.actor.translation);
                            console.log("rotation:", q_pitch(this.actor.rotation),
                                q_yaw(this.actor.rotation), q_roll(this.actor.rotation));
                            console.log("scale:", this.actor.scale);
                            break;
                        case 'p':
                            if(this.profiling){
                                console.log("end profiling");
                                console.profileEnd("profile");
                                this.profiling = false;
                            }else{
                                this.profiling = true;
                                console.log("start profiling");
                                console.profile("profile");
                            }
                            break;
                }
            }
            /* console.log(e) */
        }
    }

    doKeyUp(e){
        super.doKeyUp(e);
        switch(e.key){
            case 'Shift': this.shiftKey = false; break;
            case 'Control': this.ctrlKey = false; break;
            case 'Alt': this.altKey = false; break;
            case 'w': case 'W': case 'a': case 'A':
            case 'd': case 'D': case 's': case 'S':
                this.yawDirection = -1;
                this.setVelocity([0, 0, 0]);
            break;
        }
    }

    doPointerDoubleDown(e) {
        if (this.shiftKey && this.shiftDouble) {
            const render = this.service("ThreeRenderManager");
            const rc = this.pointerRaycast(e.xy, render.threeLayerUnion('pointer', 'walk'));
            let pe = this.pointerEvent(rc);
            return this.shiftDouble(pe);
        }
        this.isFalling = false;
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
        return[c*(xy[0]-w), c*(h-xy[1])];
    }

    doPointerTap(e){
        if(this.editPawn){ // this gets set in doPointerDown
//            if(this.editMode){ // if we are in edit mode, clear it
                this.editPawn.unselectEdit();
                this.editPawn.showControls({avatar: this.actor.id,distance: this.targetDistance});
                this.editPawn = null;
                this.editPointerId = null;
                this.editMode = false;
//            }
        } else {
            // so that subsequent pointer up can clean up a few things
            try {
                super.doPointerTap(e);
            } catch(e) {
                console.log(e);
            }
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
            this.targetDistance = rc.distance;
            let p3e = this.pointerEvent(rc);
            p3e.lookNormal = this.actor.lookNormal;
            let pawn = GetPawn(p3e.targetId);
            pawn = pawn || null;

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
            if(!this.focusPawn){
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
            if(!this.focusPawn && this.isPointerDown){
                let yp = this.xy2yp(e.xy);
                let yaw = (this._lookYaw + (this.dragWorld[0] - yp[0])* this.yawDirection);
                let pitch = this._lookPitch + this.dragWorld[1] -yp[1];
                pitch = pitch>1 ? 1 : (pitch<-1 ? -1: pitch);
                this.dragWorld = yp;
                this.lookTo(pitch, yaw);
            }
        }
    }

    doPointerUp(e) {
        this.isPointerDown = false;
        if (this.editMode) {
            console.log("doPointerUp editMode");
            return;
        }

        if (this.editPawn) {
            this.editPawn.unselectEdit();
            this.editPawn = null;
            this.editPointerId = null;
            this.p3eDown = null;
            return;
            
        }
        super.doPointerUp(e);
    }

    doPointerWheel(e) {
        const rc = this.pointerRaycast(e.xy, this.getTargets("pointerWheel"));
        if (rc.pawn && this.ctrlKey) {
            this.invokeListeners("pointerWheel", rc.pawn, rc, e);
            return;
        }

        let z = this.lookOffset[2];
        z += Math.max(1,z) * e.deltaY / 1000.0;
        z = Math.min(100, Math.max(z,0));
        this._lookOffset = [this.lookOffset[0], z, z];
        let pitch = (this._lookPitch*11+Math.max(-z / 2, -Math.PI/4))/12;
        this.lookTo(pitch, q_yaw(this._rotation));
    }

    fadeNearby(){
        avatarManager.avatars.forEach(a => {
            if( a.actor.follow ){
                a.setOpacity(0); // get out of my way
            }
            else{
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
            if(this.avatar){
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
    
    goHome() {
        console.log("goHome")
        this.say("goHome", [[0,0,0], [0,0,0,1]])
    }

    comeToMe(){
        console.log("comeToMe");
        this.say("comeToMe");
    }

    jumpToNote(isShift){
        // collect the notes
    console.log(this.actor.service('CardManager').cards);
        // jump to the next one or last 

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
        let t = this._translation;
        this._translation = [t[0], p, t[2]];
        this.floor = p;
        this.onLocalChanged();
        this.say("setFloor", p, 100);
    }

    loadFromFile(data) {
        let model = this.actor.wellKnownModel("ModelRoot");

        let array = new TextEncoder().encode(data);
        let ind = 0;
        let key = Math.random();
        
        this.publish(model.id, "loadStart", key);

        while (ind < array.length) {
            let buf = array.slice(ind, ind + 4000);
            this.publish(model.id, "loadOne", {key, buf});
            ind += 4000;
        }
                
        this.publish(model.id, "loadDone", key);
    }
}
