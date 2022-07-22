// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {
    Data, App, View, mix, GetPawn, AM_Player, PM_Player,
    v3_zero, v3_isZero, v3_add, v3_sub, v3_scale, v3_sqrMag, v3_normalize, v3_rotate, v3_multiply, v3_lerp, v3_transform, v3_magnitude, v3_equals,
    q_isZero, q_normalize, q_pitch, q_yaw, q_roll, q_identity, q_euler, q_axisAngle, q_slerp, q_multiply, q_equals,
    m4_multiply, m4_rotationQ, m4_rotationY, m4_translation, m4_invert, m4_getTranslation, m4_getRotation,
} from "@croquet/worldcore-kernel";
import { THREE, PM_ThreeCamera, PM_ThreeVisible } from "@croquet/worldcore-three";

import { frameName, isPrimaryFrame, addShellListener, removeShellListener, sendToShell } from "./frame.js";
import {PM_Pointer} from "./Pointer.js";
import {CardActor, CardPawn} from "./card.js";

import {setupWorldMenuButton, filterDomEventsOn} from "./worldMenu.js";

const EYE_HEIGHT = 1.676;
// const EYE_EPSILON = 0.01;
const FALL_DISTANCE = EYE_HEIGHT / 12;
const MAX_FALL = -15;
const MAX_V = 0.015;
const KEY_V = MAX_V / 2;
// const MAX_SPIN = 0.0004;
// const JOYSTICK_V = 0.000030;
const COLLIDE_THROTTLE = 50;
const THROTTLE = 15; // 20
const PORTAL_DISTANCE = 0.4; // tuned to the girth of the avatars
const COLLISION_RADIUS = 0.8;
const M4_ROTATIONY_180 = m4_rotationY(Math.PI);
const Q_ROTATION_180 = q_euler(0, Math.PI, 0);
let initialPortalLookExternal;


export class AvatarActor extends mix(CardActor).with(AM_Player) {
    init(options) {
        let playerId = options.playerId;
        delete options.playerId;
        super.init(options);
        this._playerId = playerId;

        this._layers = options.layers;
        // make sure layers has avatar the user defined layers are given in Avatarnames
        this.addLayer("avatar");

        this.lookPitch = 0;
        this.lookYaw = 0;
        this.lookOffset = v3_zero();

        this.fall = false;
        this.tug = 0.05; // minimize effect of unstable wifi
        this.set({tickStep: 30});
        this.listen("goHome", this.goHome);
        this.listen("goThere", this.goThere);
        this.listen("startFalling", this.startFalling);
        this.listen("avatarLookTo", this.onLookTo);
        this.listen("comeToMe", this.comeToMe);
        this.listen("followMeToWorld", this.followMeToWorld);
        this.listen("continuePresenting", this.continuePresenting);
        this.listen("continueFollowing", this.continueFollowing);
        this.listen("stopPresentation", this.stopPresentation);
        this.listen("inWorldSet", this.inWorldSet);
        this.listen("fileUploaded", "fileUploaded");
        this.listen("addSticky", this.addSticky);
        this.listen("textPasted", this.textPasted);
        this.listen("resetStartPosition", this.resetStartPosition);
        this.subscribe("playerManager", "presentationStarted", this.presentationStarted);
        this.subscribe("playerManager", "presentationStopped", this.presentationStopped);
        this.listen("leavePresentation", this.leavePresentation);
        this.future(0).tick();
    }

    get pawn() { return AvatarPawnFactory; }
    get lookNormal() { return v3_rotate([0, 0, -1], this.rotation); }

    // used by the BVH based walking logic. customizable when the avatar is not a human size.
    get collisionRadius() { return this._cardData.collisionRadius || COLLISION_RADIUS; }
    get fallDistance(){ return this._fallDistance || FALL_DISTANCE }; // how far we fall per update
    get inWorld() { return !!this._inWorld; }   // our user is either in this world or render

    // The user leaves the "guided tour".
    leavePresentation() {
        if (!this.follow) {return;}

        let manager = this.service("PlayerManager");
        let presentationMode = manager.presentationMode;
        if (!presentationMode) {return;}
        if (this.follow !== this.playerId) {
            this.presentationStopped();
            this.say("setLookAngles", {lookOffset: [0, 0, 0]});
            manager.leavePresentation(this.playerId);
        }
    }

    stopPresentation() {
        this.service("PlayerManager").stopPresentation();
    }

    inWorldSet({o, v}) {
        if (!o !== !v) this.service("PlayerManager").playerInWorldChanged(this);
    }

    startFalling() {
        this.fall = true;
    }

    resetStartPosition() {
        this.goTo(this.translation, this.rotation, false);
    }

    onLookTo(data) {
        let [pitch, yaw, lookOffset] = data;
        if (pitch !== undefined) {this.lookPitch = pitch;}
        if (yaw !== undefined) {this.lookYaw = yaw;}
        if (lookOffset !== undefined) this.lookOffset = lookOffset;
        this.rotateTo(q_euler(0, this.lookYaw, 0));
        this.restoreTargetId = undefined; // if you look around, you can't jump back
    }

    goHome() {
        let v, q;
        if (this._anchor) {
            v = this._anchor.translation;
            q = this._anchor.rotation;
        } else {
            v = v3_zero();
            q = q_identity();
        }
        this.goTo(v, q, false);
        this.lookOffset = v3_zero();
        this.lookPitch = 0;
        this.lookYaw = 0;
        this.say("setLookAngles", {pitch: 0, yaw: 0, lookOffset: this.lookOffset});
    }

    goTo(v, q, fall) {
        this.leavePresentation();
        this.vStart = [...this.translation];
        this.qStart = [...this.rotation];
        this.vEnd = v;
        this.qEnd = q;
        this.fall = fall;
        this.goToStep(0.1);
        //this.set({translation: there[0], rotation: there[1]});
    }

    goThere(p3d) {
        this.leavePresentation();
        this.vStart = [...this.translation];
        this.qStart = [...this.rotation];

        if (!this.fall && (p3d.targetId === this.restoreTargetId)) { // jumpback if you are  doubleclicking on the same target you did before
            this.vEnd = this.restoreTranslation;
            this.qEnd = this.restoreRotation;
            this.restoreRotation = undefined;
            this.restoreTranslation = undefined;
            this.restoreTargetId = undefined;
        } else {
            this.fall = false; // sticky until we move
            this.restoreRotation = [...this.rotation];
            this.restoreTranslation = [...this.translation];
            this.restoreTargetId = p3d.targetId;
            let normal = [...(p3d.normal || this.lookNormal)]; //target normal may not exist
            let point = p3d.xyz;
            this.vEnd = v3_add(point, v3_scale(normal, p3d.offset || EYE_HEIGHT));
            normal[1] = 0; // clear up and down
            let nsq = v3_sqrMag(normal);
            if (nsq < 0.0001) {
                this.qEnd = this.rotation; // use the current rotation
            }else {
                normal = v3_normalize(normal);
                let theta = Math.atan2(normal[0], normal[2]);
                this.qEnd = q_euler(0, theta, 0);
            }
            if (p3d.look) {
                let pitch = q_pitch(this.qEnd);
                let yaw = q_yaw(this.qEnd);
                this.lookPitch = pitch;
                this.lookYaw = yaw;
                this.say("setLookAngles", {pitch, yaw});
            }
        }
        this.goToStep(0.1);
    }

    comeToMe() {
        this.service("PlayerManager").startPresentation(this.playerId);
    }

    followMeToWorld(presenterTransferData) {
        // presenterTransferData is the same as the spec this avatar will use to enter
        // the new world, minus its cardData.
        // first confirm that we are indeed still the presenter.
        const manager = this.service("PlayerManager");
        if (manager.presentationMode === this.playerId) {
            const followerTransferData = { ...presenterTransferData };
            followerTransferData.following = followerTransferData.presenting;
            delete followerTransferData.presenting;
            for (const playerId of manager.followers) {
                if (playerId === this.playerId) continue;
                const follower = manager.player(playerId);
                follower.followToWorld(followerTransferData);
            }
        }
    }

    followToWorld(followerTransferData) {
        this.say("followToWorld", { followerTransferData });
    }

    presentationStarted() {
        // the PlayerManager has already decided which players are in the presentation
        const { presenter, followers } = this.service("PlayerManager");
        if (presenter.playerId === this.playerId || !followers.has(this.playerId)) return;

        this._translation = [...presenter.translation];
        this._rotation = [...presenter.rotation];
        this.say("forceOnPosition");
        this.follow = presenter.playerId;
        this.fall = false;
        this._anchor = presenter._anchor;
    }

    presentationStopped() {
        this.follow = null;
    }

    continuePresenting(presenterToken) {
        // we came into this world through a portal while presenting.  if there is
        // not already a presentation in progress, become the presenter and sign up
        // every follower who enters (or has already entered) carrying the same token.
        this.service("PlayerManager").continuePresenting(this, presenterToken);
    }

    continueFollowing(presenterToken) {
        // we came into this world through a portal while following.  if the presenter
        // has come through ahead and is already presenting, the PlayerManager will
        // sign us up and invoke this.presentationStarted.  otherwise we just wait,
        // holding onto the token (and knowing that the expected presenter may never
        // turn up).
        this.service("PlayerManager").continueFollowing(this, presenterToken);
    }

    goToStep(delta, t) {
        if (!t) t = delta;
        if (t >= 1) t = 1;
        let v = v3_lerp(this.vStart, this.vEnd, t);
        let q = q_slerp(this.qStart, this.qEnd, t);
        this.positionTo({v, q});
        this.say("forceOnPosition");
        if (t < 1) this.future(50).goToStep(delta, t + delta);
    }

    // A following avatar updates its pose based on leader's pose, and updates its pawn
    tick(_delta) {
        if (this.follow) {
            let followMe = this.service("PlayerManager").players.get(this.follow);
            if (followMe) {
                this.positionTo({v: followMe._translation, q: followMe._rotation});
                this.lookOffset = followMe.lookOffset;
                this.lookPitch = followMe.lookPitch;
                this.lookYaw = followMe.lookYaw;
                this.say("setLookAngles", {pitch: followMe.lookPitch, yaw: followMe.lookYaw, lookOffset: followMe.lookOffset});
            } else {
                this.presentationStopped();
            }
        }
        if (!this.doomed) this.future(this._tickStep).tick(this._tickStep);
    }

    // compute the position in front of the avatar
    // optOffset is perpendicular (on the same xz plane) to the lookNormal
    dropPose(distance, optOffset) {
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

    // invoked in response to a file drop.
    fileUploaded(data) {
        let {dataId, fileName, type, translation, rotation, animationClipIndex, dataScale} = data;

        let cardType = type === "exr" ? "lighting" : (type === "svg" || type === "img" || type === "pdf" ? "2d" : "3d");

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

        if (animationClipIndex !== undefined) {
            options.animationClipIndex = animationClipIndex;
        }

        if (cardType === "3d" && dataScale) {
            options.dataScale = dataScale;
        }

        if (type === "img") {
            options = {
                ...options,
                textureLocation: dataId,
                textureType: "image",
                scale: [4, 4, 4],
                cornerRadius: 0.02,
                fullBright: false,
            };
        } else if (type === "pdf") {
            options = {
                ...options,
                behaviorModules: ["PDFView"],
                scale: [4, 4, 4],
                layers: ["pointer"],
                type: "2d",
                frameColor: 0xffffff,
                color: 0x888888,
                depth: 0.05,
                fullBright: true,
                pdfLocation: dataId
            };
        } else {
            options = {...options, dataLocation: dataId};
        }

        if (type !== "exr") {
            this.createCard(options);
        } else {
            let light = [...this.service("ActorManager").actors.values()].find(o => o._cardData.type === "lighting");
            if (light) {
                light.updateOptions({...light._cardData, dataLocation: dataId, dataType: "exr"});
            }
        }

        this.publish(this.sessionId, "triggerPersist");
    }

    textPasted({string, translation, rotation}) {
        if (string.startsWith("http://") || string.startsWith("https://")) {
            this.createPortal(translation, rotation, string);
        } else {
            this.createStickyNote(translation, rotation, string);
        }
    }

    addSticky(pe) {
        const tackOffset = 0.1;
        let tackPoint = v3_add(pe.xyz, v3_scale(pe.normal, tackOffset));
        let normal = [...pe.normal]; // clear up and down
        normal[1] = 0;
        let nsq = v3_sqrMag(normal);
        let rotation;
        if (nsq > 0.0001) {
            normal = v3_normalize(normal);
            let theta = Math.atan2(normal[0], normal[2]);
            rotation = q_euler(0, theta, 0);
        } else {
            rotation = this.rotation;
            tackPoint[1] += 2;
        }
        this.createStickyNote(tackPoint, rotation);
    }

    createStickyNote(translation, rotation, text) {
        let runs = [];
        if (!text) {
            text = "";
        }
        runs.push({text});
        let options = {
            name:'sticky note',
            className: "TextFieldActor",
            behaviorModules: ["StickyNote"],
            translation,
            rotation,
            type: "text",
            depth: 0.05,
            margins: {left: 20, top: 20, right: 20, bottom: 20},
            backgroundColor: 0xf4e056,
            frameColor: 0xfad912,
            runs,
            width: 1,
            height: 1,
            textScale: 0.002
        };

        this.createCard(options);
        this.publish(this.sessionId, "triggerPersist");
    }

    createPortal(translation, rotation, portalURL) {
        // sigh - all portals are "backwards"
        // or maybe *all* models are backwards and we need to fix dropPose and avatar models?
        rotation = q_multiply(Q_ROTATION_180, rotation); // flip by 180 degrees

        let card = {
            name: "portal",
            className: "PortalActor",
            translation,
            rotation,
            type: "2d",
            layers: ["pointer"],
            color: 0xFF66CC,
            frameColor: 0x888888,
            width: 3,
            height: 3,
            depth: 0.2,
            cornerRadius: 0.05,
            portalURL,
            sparkle: false,
        };

        this.createCard(card);
        this.publish(this.sessionId, "triggerPersist");
    }
}

AvatarActor.register('AvatarActor');

class AvatarPawnFactory extends View {
    constructor(actor) {
        super(actor);
        if (this.viewId === actor.playerId) {
            return new AvatarPawn(actor);
        }
        return new RemoteAvatarPawn(actor);
    }
}

const PM_SmoothedDriver = superclass => class extends superclass {
    constructor(options) {
        super(options);
        this.throttle = 125; //ms
        this.ignore("scaleSet");
        this.ignore("rotationSet");
        this.ignore("translationSet");
        this.ignore("positionSet");
    }

    // If our global changes, so do the globals of our children
    globalChanged() {
        if (!this._global && this.renderObject && !this.renderObject.matrixWorldNeedsUpdate) {
            this.refreshDrawTransform();
            if (this.children)  {
                this.children.forEach(child => child.onGlobalChanged());
            }
        }
    }

    positionTo(v, q, throttle) {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            // we have special case here for avatar movement
            if (v3_equals(this.actor.translation, v, 0) && q_equals(this.actor.rotation, q, 0)) {return;}

            this._translation = v;
            this._rotation = q;
            this.onLocalChanged();
            this.isTranslating = false;
            this.isRotating = false;
        }
        super.positionTo(v, q, throttle);
        this.globalChanged();
    }

    scaleTo(v, throttle) {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            this._scale = v;
            this.onLocalChanged();
            this.isScaling = false;
        }
        super.scaleTo(v, throttle);
        this.globalChanged();
    }

    rotateTo(q, throttle) {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            this._rotation = q;
            this.onLocalChanged();
            this.isRotating = false;
        }
        super.rotateTo(q, throttle);
        this.globalChanged();
    }

    translateTo(v, throttle)  {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            this._translation = v;
            this.isTranslating = false;
            this.onLocalChanged();
        }
        super.translateTo(v, throttle);
        this.globalChanged();
    }
}

class RemoteAvatarPawn extends mix(CardPawn).with(PM_Player, PM_ThreeVisible) {
    constructor(actor) {
        super(actor);
        this.lastUpdateTime = 0;
        this.opacity = 1;

        this.spin = q_identity();
        this.velocity = [0, 0, 0];

        this.lookPitch = this.actor.lookPitch;
        this.lookYaw = this.actor.lookYaw;
        this.lookOffset = [0, 0, 0]; // Vector displacing the camera from the avatar origin.
        this._rotation = q_euler(0, this.lookYaw, 0);

        this.tug = 0.06; // instead of default 0.2, to work with spaced updates
    }

    setOpacity(opacity) {
        if (this.shape) {
            let transparent = opacity !== 1;
            this.shape.visible = this.actor.inWorld && opacity !== 0;
            this.shape.traverse(n => {
                if (n.material) {
                    n.material.opacity = opacity;
                    n.material.transparent = transparent;
                    n.material.side = THREE.DoubleSide;
                    n.material.needsUpdate = true;
                }
            });
        }
    }
}

export class AvatarPawn extends mix(CardPawn).with(PM_Player, PM_SmoothedDriver, PM_ThreeVisible, PM_ThreeCamera, PM_Pointer) {
    constructor(actor) {
        super(actor);

        this.lastUpdateTime = 0;
        this.lastCollideTime = 0;
        this.lastCollideTranslation = this.actor.translation;
        this.opacity = 1;

        this.spin = q_identity();
        this.velocity = v3_zero();

        this.lookPitch = this.actor.lookPitch;
        this.lookYaw = this.actor.lookYaw;
        this.lookOffset = v3_zero(); // Vector displacing the camera from the avatar origin.
        this._rotation = q_euler(0, this.lookYaw, 0);
        this.portalLookExternal = initialPortalLookExternal;

        this.isMobile = !!("ontouchstart" in window);

        this.isFalling = false;

        const renderMgr = this.service("ThreeRenderManager");
        this.camera = renderMgr.camera;
        this.scene = renderMgr.scene;

        this.lastHeight = EYE_HEIGHT; // tracking the height above ground
        this.yawDirection = -1; // which way the mouse moves the world depends on if we are using WASD or not

        this.walkCamera = new THREE.Object3D();

        this.walkcaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0));
        this.portalcaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, PORTAL_DISTANCE);

        this.future(100).fadeNearby();

        document.getElementById("homeBttn").onclick = () => this.goHome();
        filterDomEventsOn(document.getElementById("homeBttn"));
        document.getElementById("usersComeHereBttn").onclick = () => this.comeToMe();
        filterDomEventsOn(document.getElementById("usersComeHereBttn"));
        document.getElementById("editModeBttn").setAttribute("mobile", this.isMobile);
        document.getElementById("editModeBttn").setAttribute("pressed", false);

        let editButton = document.getElementById("editModeBttn");
        editButton.onpointerdown = (evt) => this.setEditMode(evt);
        editButton.onpointerup = (evt) => this.clearEditMode(evt);

        setupWorldMenuButton(this, App, this.sessionId);

        // drop and paste
        this.service("AssetManager").assetManager.setupHandlersOn(document, (buffer, fileName, type) => {
            if (type === "pastedtext") {
                this.pasteText(buffer);
            } else if (type === "vrse") {
                this.loadvrse(buffer);
            } else {
                this.analyzeAndUploadFile(new Uint8Array(buffer), fileName, type);
            }
        });

        // keep track of being in the primary frame or not.  because of the delay involved
        // in creating the avatar, the frame itself (in frame.js) is bound to have already
        // processed a "frame-type" message and set its exported isPrimaryFrame value.
        this.isPrimary = isPrimaryFrame;

        // clip halfspace behind portalCamera.
        // [old comment] 0.2 is to cover the gap of the portal thickness
        // if there is no anchor, this is the default clip plane
        // otherwise it will be updated below
        this.portalClip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
        this.setPortalClipping();

        this.shellListener = (command, { frameType, spec, cameraMatrix, dx, dy, acknowledgeReceipt }) => {
            switch (command) {
                case "frame-type":
                    const isPrimary = frameType === "primary";
                    // a frame generated by addFrame supplies no spec.  in all other cases
                    // (portal-enter, world-enter) we need to start with the frame frozen.
                    if (spec) this.setWorldSwitchFreeze(true);
                    if (isPrimary !== this.isPrimary) this.frameTypeChanged(isPrimary, spec);
                    // a secondary frame for which we already have camera information
                    // will receive it as part of this message
                    if (cameraMatrix) this.portalCameraUpdate(cameraMatrix);
                    // acknowledge receipt so that shell knows this frame is ready
                    sendToShell("frame-type-received", { frameType });
                    break;
                case "release-freeze":
                    // sent to the primary as soon as all frames (this included) have
                    // confirmed their switch to primary or secondary state.
                    this.setWorldSwitchFreeze(false);
                    this.refreshCameraTransform();
                    this.updatePortalRender(true); // true => force portals to re-render
                    break;
                case "sync-render-now":
                    if (this.frozenForWorldSwitch) {
                        console.log(frameName(), "ignoring sync-render while frozen");
                        return;
                    }
                    this.refreshCameraTransform();
                    renderMgr.composer.render();
                    if (acknowledgeReceipt) sendToShell("primary-rendered");
                    break;
                case "portal-camera-update":
                    // sent to a through-portal world, to get it to render using
                    // the camera position supplied by the corresponding portal
                    this.setWorldSwitchFreeze(false);
                    this.portalCameraUpdate(cameraMatrix);
                    break;
                case "motion-start":
                    this.call("AvatarEventHandler$AvatarPawn", "startMotion", dx, dy);
                    break;
                case "motion-end":
                    this.call("AvatarEventHandler$AvatarPawn", "endMotion", dx, dy);
                    break;
                case "motion-update":
                    this.call("AvatarEventHandler$AvatarPawn", "updateMotion", dx, dy);
                    break;
            }
        }
        addShellListener(this.shellListener);
        //initialize actor
        const actorSpec = { inWorld: this.isPrimary };
        const anchor = this.anchorFromURL(window.location, !this.isPrimary);
        if (anchor) {
            actorSpec.anchor = anchor; // actor or {translation, rotation}
            actorSpec.translation = anchor.translation;
            actorSpec.rotation = anchor.rotation;
        }
        this.say("_set", actorSpec);
        this.say("resetStartPosition");

        this.subscribe("playerManager", "playerCountChanged", this.showNumbers);
        this.listen("setLookAngles", this.setLookAngles);
        // respond to followToWorld immediately, to freeze our movements ASAP
        this.listenImmediate("followToWorld", this.followToWorld);
        this.showNumbers();

        this.listen("forceOnPosition", this.onPosition);

        this.listen("goThere", this.stopFalling);
        console.log(frameName(), "MyPlayerPawn created", this, "primary:", this.isPrimary);

        this.wasdVelocity = [0, 0, 0];
        this.wasdMap = {w: false, a: false, d: false, s: false};
    }

    get presenting() {
        return this.actor.service("PlayerManager").presentationMode === this.viewId;
    }

    setWorldSwitchFreeze(bool) {
// if (!!this.frozenForWorldSwitch !== bool) console.warn(frameName(), `freeze: ${bool}`);
        this.frozenForWorldSwitch = bool;
    }

    onPosition() {
        this._rotation = this.actor.rotation;
        this._translation = this.actor.translation;
        this.onLocalChanged();
    }

    setLookAngles(data) {
        let {pitch, yaw, lookOffset} = data;
        if (pitch !== undefined) {this.lookPitch = pitch;}
        if (yaw !== undefined) {this.lookYaw = yaw;}
        if (lookOffset !== undefined) {this.lookOffset = lookOffset;}
    }

    async analyzeAndUploadFile(buffer, fileName, type) {
        let handle = await Data.store(this.sessionId, buffer, true);
        let dataId = Data.toId(handle);
        let assetManager = this.service("AssetManager").assetManager;
        let obj;
        let animationClipIndex;
        let dataScale;
        try {
            obj = await assetManager.load(buffer, type, THREE, {});
        } catch (e) {
            console.warn("dropped file could not be processed", e);
            return;
        }

        function is3D(t) {
            t = t.toLowerCase();
            return ["glb", "obj", "fbx"].includes(t);
        }

        if (is3D(type)) {
            assetManager.setCache(dataId, buffer, "0");
            if (obj._croquetAnimation) {
                animationClipIndex = 0;
            }

            let size = new THREE.Vector3(0, 0, 0);
            new THREE.Box3().setFromObject(obj).getSize(size);
            let max = Math.max(size.x, size.y, size.z);
            let s = 4 / max;
            dataScale = [s, s, s];
        }

        let pose = this.dropPose(6);
        this.say("fileUploaded", {
            dataId, fileName, type: /^(jpe?g|png|gif)$/.test(type) ? "img" : type,
            translation: pose.translation,
            rotation: pose.rotation,
            animationClipIndex,
            dataScale
        });
    }

    async uploadFile(buffer, fileName, type) {
        let handle = await Data.store(this.sessionId, buffer);
        let dataId = Data.toId(handle);
        let pose = this.dropPose(6);
        this.say("fileUploaded", {
            dataId, fileName, type: /^(jpe?g|png|gif)$/.test(type) ? "img" : type,
            translation: pose.translation,
            rotation: pose.rotation
        });
    }

    async pasteText(string) {
        const MAX_PASTE_LENGTH = 2000;
        if (string.length > MAX_PASTE_LENGTH) {
            console.warn("Paste too long, truncating");
            string = string.substr(0, MAX_PASTE_LENGTH);
        }
        let pose = this.dropPose(6);
        this.say("textPasted", {
            string,
            translation: pose.translation,
            rotation: pose.rotation
        });
    }

    loadvrse(buffer) {
        let result = new TextDecoder("utf-8").decode(buffer);
        this.loadFromFile(result, false, true);
    }

    dropPose(distance, optOffset) { // compute the position in front of the avatar
        return this.actor.dropPose(distance, optOffset);
    }

    // if our URL specifies an anchor, this is our home location
    anchorFromURL(url, viaPortal) {
        const { actors } = this.actor.service("ActorManager");
        const { searchParams } = new URL(url);
        const anchorString = searchParams.get("anchor");
        if (!anchorString) {
            // if we are coming via a portal but with no anchor, assume the first portal
            if (viaPortal) {
                for (const actor of actors.values()) {
                    if (actor.isPortal) return actor;
                }
            }
            // otherwise use the default anchor
            for (const actor of actors.values()) {
                if (actor._cardData.spawn === "default") return actor;
            }
            // otherwise come in at [0,0,0]
            return null;
        }
        // see if it's a named actor
        for (const actor of actors.values()) {
            if (actor.name === anchorString) return actor;
        }
        // otherwise it might be explicit coordinates
        const coords = anchorString.split(",").map(x => parseFloat(x));
        if (coords.length !== 7 || coords.some(x => isNaN(x))) return null;
        const [vx, vy, vz, ru, rv, rw, rq] = coords;
        return {
            translation: [vx, vy, vz],
            rotation: [ru, rv, rw, rq]
        }
    }

    showNumbers() {
        let manager = this.actor.service("PlayerManager");
        let comeHere = document.getElementById("usersComeHereBttn");
        let userCountReadout = comeHere.querySelector("#userCountReadout");
        if (userCountReadout) {
            // TODO: change PlayerManager to only create avatars for players that are actually in the world
            let total = manager.players.size;
            let here = manager.playersInWorld().length;
            let tooltip = `${here} ${here === 1 ? "user is" : "users are"} in this world`;
            if (here !== total) {
                let watching = total - here;
                tooltip += `, ${watching} ${watching === 1 ? "user has" : "users have"} not entered yet`;
                total = `${here}+${watching}`;
            }
            if (manager.presentationMode) {
                let followers = manager.followers.size; // includes the presenter
                userCountReadout.textContent = `${followers}/${total}`;
                tooltip = `${followers} ${followers === 1 ? "user" : "users"} in guided tour, ${tooltip}`;
            } else {
                userCountReadout.textContent = `${total}`;
            }
            comeHere.setAttribute("title", tooltip);
        }

        comeHere.setAttribute("presenting", this.presenting);
    }

    setEditMode(evt) {
        evt.target.setAttribute("pressed", true);
        evt.target.setPointerCapture(evt.pointerId);
        evt.stopPropagation();
        this.service("InputManager").setModifierKeys({ctrlKey: true});
    }

    clearEditMode(evt) {
        evt.target.setAttribute("pressed", false);
        evt.target.releasePointerCapture(evt.pointerId);
        evt.stopPropagation();
        this.service("InputManager").setModifierKeys({ctrlKey: false});
    }

    maybeLeavePresentation() {
        if (this.actor.follow) {
            this.say("leavePresentation");
        }
    }

    lookTo(pitch, yaw, lookOffset) {
        this.maybeLeavePresentation();
        this.setLookAngles({pitch, yaw, lookOffset});
        this.say("avatarLookTo", [pitch, yaw, lookOffset]);
        let q = q_euler(0, this.lookYaw, 0);
        this.rotateTo(q);
    }

    destroy() {
        removeShellListener(this.shellListener);
        // When the pawn is destroyed, we dispose of our Three.js objects.
        // the avatar memory will be reclaimed when the scene is destroyed - it is a clone, so leave the  geometry and material alone.
        super.destroy();
    }

    get lookGlobal() {
        if (this.lookOffset) {
            // This test above is relevant only at the start up.
            // This is called from ThreeCamera's constructor but
            // all look* properties are not intialized yet.
            if (!this.isPrimary && this.portalLookExternal) return this.portalLook;
            else return this.walkLook();
        } else return this.global;
    }

    // the camera when walking: based on avatar with 3rd person lookOffset
    walkLook() {
        let behaviorManager = this.actor.behaviorManager;
        let behavior = behaviorManager.lookup("AvatarEventHandler", "AvatarPawn");
        if (behavior) {
            if (behavior.$behavior.walkLook) {
                return this.call("AvatarEventHandler$AvatarPawn", "walkLook");
            }
        }

        const pitchRotation = q_axisAngle([1,0,0], this.lookPitch);
        const m0 = m4_translation(this.lookOffset);
        const m1 = m4_rotationQ(pitchRotation);
        const m2 = m4_multiply(m1, m0);
        return m4_multiply(m2, this.global);
    }

    // the camera when rendering world as portal: based on external camera
    // and our own anchor
    get portalLook() {
        // apply portal transform to external camera
        const anchor = this.anchor || this.actor._anchor || { translation: [0,0,0], rotation: [0,0,0,1] };
        const mtra = m4_translation(anchor.translation);
        const mrot = m4_rotationQ(anchor.rotation);
        const mrot_inv = m4_multiply(mrot, M4_ROTATIONY_180); // flip by 180 degrees
        const mportal = m4_multiply(mrot_inv, mtra);
        const mcam = m4_multiply(this.portalLookExternal, mportal);
        // transform portal clip plane to match the anchor
        this.portalClip.normal.set(0, 0, -1);
        this.portalClip.constant = 0;
        const mclip = new THREE.Matrix4();
        mclip.set(...mrot);
        mclip.invert();
        this.portalClip.applyMatrix4(mclip);
        const pos = new THREE.Vector3(...anchor.translation);
        this.portalClip.constant = -this.portalClip.distanceToPoint(pos);
        // if portal is facing away from us, flip the clip plane
        // const facingAway = ???;
        // if (facingAway) {
        //     this.portalClip.normal.multiplyScalar(-1);
        //     this.portalClip.constant = -this.portalClip.constant;
        // }
        return mcam;
    }

    specForPortal(portal, jumpVector, crossingBackwards) {
        // we are about to enter this portal. meaning we disappear from this world and appear in the target world
        // visually nothing should change, so we need this avatar's position relative to the portal, as well as
        // its look pitch and offset. This will be passed to frameTypeChanged() in the target world.
        const jumpMatrix = m4_translation(jumpVector);
        const ourJumpedMatrix = m4_multiply(this.global, jumpMatrix);
        const t = m4_invert(portal.global);
        const m = m4_multiply(ourJumpedMatrix, t);
        // const log = (c, m) => console.log(c+"\n"+m.map((v, i) => +v.toFixed(2) + (i % 4 == 3 ? "\n" : ",")).join(''));
        // log("portal", portal.global);
        // log("avatar", this.global);
        // log("m", m);

        // the entered world will use the translation and rotation that we send from here
        // relative to its own anchor point
        const translation = m4_getTranslation(m);
        const rotation = m4_getRotation(m);
        const spec = {
            translation,
            rotation,
            lookPitch: this.lookPitch,
            lookYaw: this.lookYaw,
            lookOffset: this.lookOffset,
            cardData: this.actor._cardData, // keep avatar appearance
            name: this.actor._name, // and name
            url: portal.resolvePortalURL(),
            crossingBackwards
        };
        // keep presenting
        if (this.presenting) spec.presenting = Data.hash(this.viewId); // hash to not leak the viewId
        return spec;
    }

    frameTypeChanged(isPrimary, spec) {
        // our avatar just came into or left this world, either through a portal
        // (in which case we have a view spec), or through a navigation event (browser's back/forward)
        // in all cases we set the actor's inWorld which will show/hide the avatar
        this.isPrimary = isPrimary;
        const enteringWorld = isPrimary;
        const leavingWorld = !isPrimary;
        const actorSpec = {
            inWorld: enteringWorld,
        };
        // a portal transition under our own steam specifies translation, rotation etc
        if (enteringWorld && spec?.translation) {
            let { translation, rotation } = spec;
            // transform spec relative to anchor
            const anchor = this.anchorFromURL(spec.url, true);
            if (anchor) {
                const m_avatar_tra = m4_translation(translation);
                const m_avatar_rot = m4_rotationQ(rotation);
                const m_avatar = m4_multiply(m_avatar_rot, m_avatar_tra);
                const m_anchor_tra = m4_translation(anchor.translation);
                const m_anchor_rot = m4_rotationQ(anchor.rotation);
                const m_anchor_rot_inv = m4_multiply(m_anchor_rot, M4_ROTATIONY_180); // flip by 180 degrees
                const m_anchor = m4_multiply(m_anchor_rot_inv, m_anchor_tra);
                const m = m4_multiply(m_avatar, m_anchor);
                translation = m4_getTranslation(m);
                rotation = m4_getRotation(m);
                actorSpec.anchor = anchor; // actor or {translation, rotation}
                this.anchor = anchor;
            }
            // move actor to the right place
            actorSpec.translation = translation;
            actorSpec.rotation = rotation;
            // move pawn to the right place
            this._translation = translation;
            this._rotation = rotation;
            this.onLocalChanged();
            // copy camera settings to pawn
            if (spec.lookPitch) this.lookPitch = spec.lookPitch;
            if (spec.lookYaw) this.lookYaw = spec.lookYaw;
            if (spec.lookOffset) this.lookOffset = spec.lookOffset;
        }
        // portal-enter and world-enter provide cardData so avatar can keep its
        // appearance.
        if (spec?.cardData) actorSpec.cardData = spec.cardData;
        if (spec?.name) actorSpec.name = spec.name;
        if (leavingWorld) {
            this.call("AvatarEventHandler$AvatarPawn", "endMotion");
        }
        // now actually leave or enter the world (stops presenting in old world)
        console.log(`${frameName()} setting actor`, actorSpec);
        this.say("_set", actorSpec);
        // start presenting and following in new space too
        if (enteringWorld) {
            if (spec?.presenting) {
                let manager = this.actor.service("PlayerManager");
                if (!manager.presentationMode) {
                    this.say("continuePresenting", spec.presenting);
                }
            } else if (spec?.following) {
                this.say("continueFollowing", spec.following);
            }
        }
        this.setPortalClipping();
    }

    followToWorld({ followerTransferData }) {
        const { url, following } = followerTransferData;
        if (this.isPrimary) {
            console.log(`${frameName()} sending world-enter to ${url} following: ${following}`);
            this.setWorldSwitchFreeze(true);
            followerTransferData.cardData = this.actor._cardData;
            sendToShell("world-enter", { portalURL: url, transferData: followerTransferData });
        } else {
            console.log(`${frameName()} not sending world-enter to ${url}`);
        }
    }

    update(time, delta) {
        if (this.frozenForWorldSwitch) return; // don't move

        if (this.actor.follow || this.actor.remoteControlled) {
            // when following, the actor is remote controlled (see AvatarActor.tick)
            // so just call the PM_Smoothed version of update()
            this.tug = 0.06;
            super.update(time, delta);
        } else {
            this.tug = 0.2;
            const manager = this.actor.service("PlayerManager");
            this.throttle = (manager.presentationMode === this.actor.playerId) ? 60 : 125;
            if (this.actor.inWorld) {
                // get the potential new pose from velocity and spin.
                // the v and q variable is passed around to compute a new position.
                // unless positionTo() is called the avatar state (should) stays the same.
                let vq = this.updatePose(delta);
                if (this.collidePortal(vq)) {return;}
                if (!this.checkFloor(vq)) {
                    // if the new position leads to a position where there is no walkable floor below
                    // it tries to move the avatar the opposite side of the previous good position.
                    vq.v = v3_lerp(this.lastCollideTranslation, vq.v, -1);
                } else {
                    this.lastCollideTranslation = vq.v;
                }
                if (this.actor.fall && time - this.lastUpdateTime > THROTTLE) {
                    if (time - this.lastCollideTime > COLLIDE_THROTTLE) {
                        this.lastCollideTime = time;
                        vq = this.collide(vq);
                    }
                    this.lastUpdateTime = time;
                    this.positionTo(vq.v, vq.q);
                }
                this.refreshCameraTransform();
            }
        }
        this.updatePortalRender();
    }

    // compute motion from spin and velocity
    updatePose(delta) {
        let q, v;
        let tug = this.tug;
        if (delta) tug = Math.min(1, tug * delta / 15);

        if (!q_isZero(this.spin)) {
            q = q_normalize(q_slerp(this.rotation, q_multiply(this.rotation, this.spin), tug));
        } else {
            q = this.rotation;
        }
        if (!v3_isZero(this.velocity)) {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            v = v3_add(this.translation, move);
        } else {
            v = this.translation;
        }

        return {v, q};
    }

    // update the camera transform and clipping planes depending on whether this avatar
    // is non-primary - i.e., rendering for a portal.
    setPortalClipping() {
        let { clippingPlanes } = this.service("ThreeRenderManager").renderer;
        if (this.isPrimary) {
            // we are the top world, so we turn off portal clipping
            const idx = clippingPlanes.indexOf(this.portalClip);
            if (idx >= 0) clippingPlanes.splice(idx, 1);
        } else {
            // we are rendering for a portal in another world.  turn on portal clipping.
            if (!clippingPlanes.includes(this.portalClip)) {
                clippingPlanes.push(this.portalClip);
            }
        }
    }

    // this is sent on every update(), as long as we're not frozen.
    // if this is the primary frame and it has portals,
    // they are given the chance to figure out if their camera matrices have
    // changed (due to motion of either the avatar or the portal).  if changed
    // portals are found, we tell the shell so it can coordinate rendering.
    updatePortalRender(force = false) {
        if (this.isPrimary) {
            const portalSpecs = [];
            let secondaryRenders = false;
            this.publish("avatar", "gatherPortalSpecs", {
                callback: spec => {
                    portalSpecs.push(spec);
                    secondaryRenders |= !!spec.cameraMatrix;
                },
                force
            });
            const renderMgr = this.service("ThreeRenderManager");
            if (portalSpecs.length) sendToShell("portal-update", { portalSpecs });
            else renderMgr.setRender(true); // no portals, so use automatic rendering.

            // if we are being woken after a world switch (in which case force=true),
            // and it turns out that there are no portals whose rendering the shell
            // will await, render immediately and send "primary-rendered" to the shell
            // so it will reorder any frames.
            if (force && !secondaryRenders) {
                console.log(frameName(), "no portals in sight; rendering immediately");
                renderMgr.composer.render();
                sendToShell("primary-rendered");
            }
        } else {
            // we are rendering for a portal in another world.
            // if we have an anchor, the anchor may have been moved
            if (this.actor._anchor) this.refreshCameraTransform();
        }
    }

    portalCameraUpdate(cameraMatrix) {
        this.lastCameraMatrix = cameraMatrix;
        const renderMgr = this.service("ThreeRenderManager");
        renderMgr.setRender(false); // we assume each update is likely part of a series; auto rendering will be switched back on if there is a pause in the updates
        if (cameraMatrix) {
            if (this.endMovementTimeout) clearTimeout(this.endMovementTimeout);
            this.endMovementTimeout = setTimeout(() => {
                const renderNow = !!this.lastCameraMatrix && !this.frozenForWorldSwitch;
                // console.log(`movement ended; setRender(${renderNow})`);
                renderMgr.setRender(renderNow);
            }, 50);

            this.portalLookExternal = cameraMatrix;
            initialPortalLookExternal = cameraMatrix;
            if (!this.isPrimary && !this.frozenForWorldSwitch) {
                this.refreshCameraTransform();
                renderMgr.composer.render();
                sendToShell("portal-world-rendered");
            }
        }

    }
    checkFloor(vq) {
        // cast a ray to negative y direction and see if there is a walk layer object
        let walkLayer = this.service("ThreeRenderManager").threeLayer("walk");
        let collideList = walkLayer.filter(obj => obj.collider);

        let someFloor = false;

        for (let j = 0; j < collideList.length; j++) {
            let c = collideList[j];
            let iMat = new THREE.Matrix4();
            iMat.copy(c.matrixWorld).invert();

            let down = new THREE.Vector3(0, -1, 0);
            let ray = new THREE.Ray(new THREE.Vector3(...vq.v), down);
            ray.applyMatrix4(iMat);
            let hit = c.children[0].geometry.boundsTree.raycastFirst(ray);
            someFloor = someFloor || hit;
        }

        return someFloor;
    }

    collideBVH(collideList, vq) {
        // uses:
        // https://github.com/gkjohnson/three-mesh-bvh
        // in particular, the characterMovement.js example

        // The segment is a short vertical line at the center of the avatar body.
        // From each end, a semi-sphere is added and make the cBox emcompasses the "capsule" shape.
        // It makes sure tha the bottom of the bottom semi-sphere "touches" the floor.

        // segment and cBox are transformed into the colliders frame (there may be a bug)
        // the shapecast method first enumerates the triangles that intersects cBox.

        // among those triangles, we compute the distance to the segment and checks if the distance
        // is less than radius. That is there is no explicit capsule like geometry, but the distance
        // check gives you that if a triangle interesects with the capsule.

        // We collect all intersecting triangles. The basic idea is that we move the segment away
        // from intersecting triangles so that end result has no intersection with the gometry.
        // IOW, we nudge the segment a bit by bit based on the list of triangles.

        // Some of those triangles would be in the direction of
        // the xz-plane from the bottom end point of the segment and some of those triangles are
        // in the direction of negative y direction. A problem is that we need to order nudges.
        // If the new position is on a part of stair-like geometry, if we first nudge the segment
        // away from a trinangle on the xz-plane, the avatar loses the toe-hold onto the triangle
        // that was under it. So we sort the triangles so that the bottom ones are tested first,
        // make sure that stairs pushes up the avatar first and then checks if it still intersects
        // with the triangle more closer to the horizontal plane.

        // The above is done to save a triangle in the maybeUp variable and unshift it into directions.

        // When all nudging is done, there should not be an intersecting triangle.

        // if there is no walkable geometry in the negative y direction (checkFloor()),
        // it however reverts back to the opposite side of the last safe position.

        // If it determined that the position change is mostly only horizontal,
        // it deems that the avatar is on a solid floor and keep it from trying to fall all the time.

        // This method returns a new pose (v for position and q for rotation) of the avatar.

        let capsulePoint = new THREE.Vector3();
        let triPoint = new THREE.Vector3();

        const radius = this.actor.collisionRadius;
        const leg = EYE_HEIGHT / 2; // all are fudge factors at this moment

        let positionChanged = false;

        let velocity = v3_sub(vq.v, this.translation);
        // let currentPosition = this.translation;
        let newPosition = vq.v; // v3_add(currentPosition, stepVelocity);
        let onGround = false;

        for (let j = 0; j < collideList.length; j++) {
            let c = collideList[j];
            let iMat = c.children[0].matrixWorld.clone();
            iMat.invert();

            let segment = new THREE.Line3(
                new THREE.Vector3(newPosition[0], newPosition[1], newPosition[2]),
                new THREE.Vector3(newPosition[0], newPosition[1] - leg, newPosition[2])
            );

            let cBox = new THREE.Box3();
            cBox.makeEmpty();
            cBox.expandByPoint(segment.start);
            cBox.expandByPoint(segment.end);
            cBox.min.addScaledVector(new THREE.Vector3(-1, -1, -1), radius);
            cBox.max.addScaledVector(new THREE.Vector3(1, 1, 1), radius);

            segment.applyMatrix4(iMat);
            cBox.applyMatrix4(iMat);

            let directions = [];
            // let start = Date.now();

            let maybeUp;

            c.children[0].geometry.boundsTree.shapecast({
                intersectsBounds: box => box.intersectsBox(cBox),
                intersectsTriangle: tri => {
                    const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);
                    if (distance < radius) {
                        const depth = radius - distance;
                        const direction = capsulePoint.sub(triPoint).normalize();

                        let h = Math.sqrt(direction.x ** 2 + direction.z ** 2);
                        let v = direction.y;

                        if (h < 0.1 && v > 0.9 && (!maybeUp || depth > maybeUp.depth)) {
                            maybeUp = tri.clone();
                            directions.unshift(maybeUp);
                        } else {
                            directions.push(tri.clone());
                        }
                    }
                }
            });

            directions.forEach((tri) => {
                const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);
                if (distance < radius) {
                    let depth = radius - distance;
                    const direction = capsulePoint.sub(triPoint).normalize();

                    // there is an issue when you double click a too low point, but it is
                    // a better problem than simply go up the wall
                    //if (direction.y < 0) {
                    //depth = -depth;
                    //}

                    segment.start.addScaledVector(direction, depth);
                    segment.end.addScaledVector(direction, depth);
                    positionChanged = true;
                }
            });

            // console.log(Date.now() - start);

            let outPosition = segment.start.clone();
            outPosition.applyMatrix4(c.children[0].matrixWorld); // convert back to world coordinates
            // outPosition.y -= centerLen;

            newPosition = outPosition.toArray();
            // console.log(deltaVector);
            onGround = onGround || positionChanged && velocity[1] < -0.1 && Math.abs(velocity[0]) < 0.001 && Math.abs(velocity[2]) < 0.001;
        }

        if (!this.checkFloor({v: newPosition, q: vq.q})) {
            let newv = v3_lerp(this.lastCollideTranslation, vq.v, -1);
            return {v: newv, q: vq.q};
        }

        if (onGround) {
            this.isFalling = false;
            return {v: this.translation, q: vq.q};
        }

        if (positionChanged) {
            this.isFalling = true;
            return {v: newPosition, q: vq.q};
        } else {
            this.isFalling = true;
            return vq;
        }
    }

    // given the 3D object, find the pawn
    pawnFrom3D(obj3d) {
        while (obj3d) {
            if (obj3d.wcPawn) return obj3d.wcPawn;
            obj3d = obj3d.parent;
        }
        return undefined;
    }

    collidePortal(vq) {
        if (this.frozenForWorldSwitch) return false;

        const renderMgr = this.service("ThreeRenderManager");
        const portalLayer = renderMgr.threeLayer("portal");
        if (!portalLayer) return false;

        let dir = v3_sub(vq.v, this.translation);
        const traveled = v3_magnitude(dir);
        // if we're not moving, we're not crossing
        if (traveled === 0) return false;

        dir = v3_normalize(dir);
        this.portalcaster.far = 5; // first just find a portal; later worry about if we're close enough to cross it
        this.portalcaster.ray.direction.set(...dir);
        this.portalcaster.ray.origin.set(...this.translation);
        const firstIntersection = this.portalcaster.intersectObjects(portalLayer, true)[0];
        if (firstIntersection) {
            let portal = this.pawnFrom3D(firstIntersection.object);
            if (!portal) return false;

            // the normal of the portal's globalPlane points into the portal world
            const portalPlane = portal.globalPlane;
            const movingTowards = portalPlane.normal.dot(new THREE.Vector3(...dir)) > 0;
            if (!movingTowards) return false;

            // simplest check is whether the distance to the intersect with the portal
            // plane is less than the distance we moved in the last time unit.  if
            // it is, assume we're going to cross within the next step.
            let crosses = firstIntersection.distance <= traveled;

            if (!crosses) {
                // otherwise, find our signed perpendicular distance to the portal's plane.
                // if within the designated portal-crossing distance, on the portal's
                // front side, we're going to cross.
                const perpendicular = portalPlane.distanceToPoint(new THREE.Vector3(...vq.v));
                crosses = perpendicular >= -PORTAL_DISTANCE;
            }

            if (!crosses) return false;

            const { camera } = renderMgr;
            const cameraDir = camera.getWorldDirection(new THREE.Vector3());
            const crossingBackwards = portalPlane.normal.dot(cameraDir) < 0;

            // remember which portal we left the world from
            this.anchor = portal.actor;

            // NOTE: THIS IS NOT THE ONLY CODE PATH FOR ENTERING WORLDS
            // we also jump between worlds using the browser's "forward/back" buttons
            console.log(frameName(), "player", this.viewId, "enter portal", portal.portalId);

            // make sure automatic rendering is off, and update-generated rendering
            renderMgr.setRender(false);
            this.setWorldSwitchFreeze(true);

            // spec for this avatar in new world
            let jumpVector = v3_scale(dir, firstIntersection.distance);
            jumpVector = v3_add(jumpVector, v3_scale(portalPlane.normal.toArray(), PORTAL_DISTANCE));
            const transferData = this.specForPortal(portal, jumpVector, crossingBackwards);

            // shell will swap iframes and trigger avatarPawn.frameTypeChanged() for this user in both worlds
            // but it also may delete this frame if it is unowned
            sendToShell("portal-enter", { portalId: portal.portalId, transferData });
            // if we were presenting, tell followers to come with us
            if (this.presenting) {
                const { cardData: _cd, ...presenterTransferData } = transferData;
                this.say("followMeToWorld", presenterTransferData);
                // calls followToWorld() in followers
                // which will result in frameTypeChanged() on follower's clients
            }
            return true;
        }
        return false;
    }

    collide(vq) {
        let walkLayer = this.service("ThreeRenderManager").threeLayer('walk');
        if (!walkLayer) return vq;

        let v = vq.v;

        if (this.isFalling) {
            v = [v[0], v[1] - this.actor.fallDistance, v[2]];
            this.isFalling = false;
            if (v[1] < MAX_FALL) {
                this.goHome();
                return {v: v3_zero(), q: q_identity()};
            }
        }

        let collideList = walkLayer.filter(obj => obj.collider);
        if (collideList.length > 0) {
            let a = this.collideBVH(collideList, {v, q: vq.q});
            window.abc = a;
            return a;
        }
        return vq;
    }

    keyDown(e) {
        // This is currently invoked as the "last responder", namely only if no card handled it.
        // by writing a new avatarEvents.js that exports a different AvatarEventHandler behavior module
        // you can override the avatars behavior.
        let w = this.wasdVelocity;
        let nw;
        switch(e.key) {
            case 'Tab':
                this.jumpToNote(e); break;
            case 'w': case 'W': // forward
            case 'a': case 'A': // left strafe
            case 'd': case 'D': // right strafe
            case 's': case 'S': // backward
                this.yawDirection = -2;
                this.wasdMap[e.key.toLowerCase()] = true;
                switch (e.key) {
                    case 'w': case 'W': // forward
                        nw = w[2] === KEY_V ? 0 : -KEY_V;
                        this.wasdVelocity = [w[0], w[1], nw];
                        break;
                    case 'a': case 'A': // left strafe
                        nw = w[0] === KEY_V ? 0 : -KEY_V;
                        this.wasdVelocity = [nw, w[1], w[2]];
                        break;
                    case 'd': case 'D': // right strafe
                        nw = w[0] === -KEY_V ? 0 : KEY_V;
                        this.wasdVelocity = [nw, w[1], w[2]];
                        break;
                    case 's': case 'S': // backward
                        nw = w[2] === -KEY_V ? 0 : KEY_V;
                        this.wasdVelocity = [w[0], w[1], nw];
                        break;
                }
                this.velocity = this.wasdVelocity;
                this.maybeLeavePresentation();
                break;
            default:
                if (e.ctrlKey) {
                    switch(e.key) {
                        case 'a':
                            console.log("MyAvatar");
                            console.log("translation: ",this.actor.translation);
                            console.log("rotation:", q_pitch(this.actor.rotation),
                                q_yaw(this.actor.rotation), q_roll(this.actor.rotation));
                            console.log("scale:", this.actor.scale);
                            break;
                        case 'p':
                            if (this.profiling) {
                                console.log("end profiling");
                                console.profileEnd("profile");
                                this.profiling = false;
                            } else {
                                this.profiling = true;
                                console.log("start profiling");
                                console.profile("profile");
                            }
                            break;
                        case 'r':
                            let renderer = this.service("ThreeRenderManager").renderer;
                            console.log("Scene polycount:", renderer.info.render.triangles)
                            console.log("Active Drawcalls:", renderer.info.render.calls)
                            console.log("Textures in Memory", renderer.info.memory.textures)
                            console.log("Geometries in Memory", renderer.info.memory.geometries)
                            break;
                    }
                }
            /* console.log(e) */
        }
    }

    keyUp(e) {
        // This is currently invoked as the "last responder", namely only if no card handled it.
        // by writing a new avatarEvents.js that exports a different AvatarEventHandler behavior module
        // you can override the avatars behavior.
        switch(e.key) {
            case 'w': case 'W': // forward
            case 'a': case 'A': // left strafe
            case 'd': case 'D': // right strafe
            case 's': case 'S': // backward
                this.yawDirection = -1;
                this.wasdMap[e.key.toLowerCase()] = false;
                let h;
                if (this.wasdMap.a && !this.wasdMap.d) {
                    h = -0.01;
                } else if (!this.wasdMap.a && this.wasdMap.d) {
                    h = 0.01;
                } else {
                    h = 0;
                }
                let v;
                if (this.wasdMap.w && !this.wasdMap.s) {
                    v = -0.01;
                } else if (!this.wasdMap.w && this.wasdMap.s) {
                    v = 0.01;
                } else {
                    v = 0;
                }
                this.wasdVelocity = [h, 0, v];
                this.velocity = this.wasdVelocity;;
        }
    }

    addSticky(e) {
        if (e.shiftKey) {
            const render = this.service("ThreeRenderManager");
            const rc = this.pointerRaycast(e.xy, render.threeLayerUnion('pointer', 'walk'));
            let pe = this.pointerEvent(rc, e);
            this.say("addSticky", pe);
        }
    }

    stopFalling() {
        this.isFalling = false;
    }

    xy2yp(xy) {
        let camera = this.service("ThreeRenderManager").camera;
        let fov = camera.fov / 2;
        let h = window.innerHeight / 2;
        let w = window.innerWidth / 2;
        let c = (fov * Math.PI / 180) / h;
        return[c * (xy[0] - w), c * (h - xy[1])];
    }

    pointerDown(e) {
        if (e.ctrlKey) { // should be the first responder case
            const render = this.service("ThreeRenderManager");
            const rc = this.pointerRaycast(e.xy, render.threeLayerUnion('pointer'));
            this.targetDistance = rc.distance;
            let p3e = this.pointerEvent(rc, e);
            p3e.lookNormal = this.actor.lookNormal;
            let pawn = GetPawn(p3e.targetId);
            pawn = pawn || null;

            if (this.editPawn !== pawn) {
                if (this.editPawn) {
                    console.log('pointerDown clear old editPawn')
                    this.editPawn.unselectEdit();
                    this.editPawn = null;
                    this.editPointerId = null;
                }
                console.log('pointerDown set new editPawn', pawn)
                if (pawn) {
                    this.editPawn = pawn;
                    this.editPointerId = e.id;
                    this.editPawn.selectEdit();
                    this.buttonDown = e.button;
                    if (!p3e.normal) {p3e.normal = this.actor.lookNormal}
                    this.p3eDown = p3e;
                }
            } else {
                console.log("pointerDown in editMode");
            }
        } else {
            if (!this.focusPawn) {
                // because this case is called as the last responder, facusPawn should be always empty
                this.dragWorld = this.xy2yp(e.xy);
                this.lookYaw = q_yaw(this._rotation);
            }
        }
    }

    pointerMove(e) {
        if (this.editPawn) {
            // a pawn is selected for draggging
            if (e.id === this.editPointerId) {
                if (this.buttonDown === 0) {
                    this.editPawn.dragPlane(this.setRayCast(e.xy), this.p3eDown);
                }else if (this.buttonDown == 2) {
                    this.editPawn.rotatePlane(this.setRayCast(e.xy), this.p3eDown);
                }
            }
        }else {
            // we should add and remove responders dynamically so that we don't have to check things this way
            if (!this.focusPawn && this.isPointerDown) {
                let yp = this.xy2yp(e.xy);
                let yaw = (this.lookYaw + (this.dragWorld[0] - yp[0]) * this.yawDirection);
                let pitch = this.lookPitch + this.dragWorld[1] - yp[1];
                pitch = pitch > 1 ? 1 : (pitch < -1 ? -1 : pitch);
                this.dragWorld = yp;
                this.lookTo(pitch, yaw);
            }
        }
    }

    pointerUp(_e) {
        if (this.editPawn) {
            this.editPawn.unselectEdit();
            this.editPawn = null;
            this.editPointerId = null;
            this.p3eDown = null;
            this.buttonDown = null;
        }

        // Below is a workaround to support an incomplete user program.
        // If there are left over first responders (pointer capture) from a user object,
        // delete them here.
        if (this.firstResponders) {
            for (let [_eventType, array] of this.firstResponders) {
                for (let i = array.length - 1; i >= 0; i--) {
                    let obj = array[i];
                    if (obj.pawn !== this) {
                        array.splice(i, 1);
                    }
                }
            }
        }
    }

    pointerTap(_e) {
        if (this.editPawn) { // this gets set in pointerDown
            this.editPawn.unselectEdit();
            this.editPawn.showControls({avatar: this.actor.id,distance: this.targetDistance});
            this.editPawn = null;
            this.editPointerId = null;
        }
    }

    pointerWheel(e) {
        let z = this.lookOffset[2];
        z += Math.max(1,z) * e.deltaY / 1000.0;
        z = Math.min(100, Math.max(z,0));
        this.lookOffset = [this.lookOffset[0], z, z];
        let pitch = (this.lookPitch * 11 + Math.max(-z / 2, -Math.PI / 4)) / 12;
        this.lookTo(pitch, q_yaw(this._rotation), this.lookOffset); //,
    }

    fadeNearby() {
        let manager = this.actor.service("PlayerManager");
        let presentationMode = manager.presentationMode;
        for (let [_viewId, a] of manager.players) {
            // a for actor, p for pawn
            let p = GetPawn(a.id);
            if (!this.actor.inWorld) {
                p.setOpacity(1); // we are not even here so don't affect their opacity
            } else if (a.follow) {
                p.setOpacity(0); // never render followers
            } else if ((p === this || (a._playerId === presentationMode && this.actor.follow)) && v3_isZero(a.lookOffset)) {
                p.setOpacity(0); // never render me or my leader in 1st person
            } else { // fade based on their (or our own) distance between avatar and camera
                let m = this.lookGlobal; // camera location
                let cv = new THREE.Vector3(m[12], m[13], m[14]);
                m = a.global; // avatar location
                let av = new THREE.Vector3(m[12], m[13], m[14]);
                // fade between 0.5 and 3.3 meters (but we used squared distance)
                let d = Math.min(Math.max((cv.distanceToSquared(av) - 0.7) / 10, 0), 1);
                p.setOpacity(d);
            }
        }
        this.future(100).fadeNearby();
    }

    setOpacity(opacity) {
        if (this.shape) {
            let transparent = opacity !== 1;
            this.shape.visible = this.actor.inWorld && opacity !== 0;
            this.shape.traverse(n => {
                if (n.material && n.material.opacity !== opacity) {
                    n.material.opacity = opacity;
                    n.material.transparent = transparent;
                    n.material.side = THREE.DoubleSide;
                    n.material.needsUpdate = true;
                }
            });
        }
    }

    goHome() {
        this.say("goHome");
    }

    comeToMe() {
        let manager = this.actor.service("PlayerManager");
        if (!manager.presentationMode) {
            this.say("comeToMe");
            return;
        }

        if (manager.presentationMode === this.viewId) {
            this.say("stopPresentation");
        }
    }

    jumpToNote(e) {
        // collect the notes and jump to the next one or last.
        let cards = this.actor.queryCards({methodName: "filterNotes"}, this);
        let lastIndex;
        if (this.lastCardId === undefined) {
            lastIndex = 0;
        } else {
            lastIndex = cards.findIndex(c => c.id === this.lastCardId);
            if (e.shiftKey) {
                lastIndex--;
            } else {
                lastIndex++;
            }
        }

        if (lastIndex >= cards.length) {
            lastIndex = 0;
        }

        if (lastIndex < 0) {
            lastIndex = cards.length - 1;
        }

        let newCard = cards[lastIndex];

        if (newCard) {
            this.lastCardId = newCard.id;
            let pawn = GetPawn(newCard.id);
            let pose = pawn.getJumpToPose ? pawn.getJumpToPose() : null;

            if (pose) {
                let obj = {xyz: pose[0], offset: pose[1], look: true, targetId: newCard.id, normal: pawn.hitNormal || [0, 0, 1]};
                this.say("goThere", obj);
            }
        }
    }

    filterNotes(c) {
        return c._behaviorModules && c._behaviorModules.includes("StickyNote");
    }

    loadFromFile(data, asScene, inFront) {
        let model = this.actor.wellKnownModel("ModelRoot");

        let array = new TextEncoder().encode(data);
        let ind = 0;
        let key = Math.random();

        this.publish(model.id, "loadStart", key);

        while (ind < array.length) {
            let buf = array.slice(ind, ind + 2880);
            this.publish(model.id, "loadOne", {key, buf});
            ind += 2880;
        }

        let pose = inFront ? this.dropPose(6) : null;
        this.publish(model.id, "loadDone", {asScene, key, pose});
    }
}
