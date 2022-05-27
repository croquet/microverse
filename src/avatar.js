// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {
    THREE, Data, App, View, mix, GetPawn, AM_Player, PM_Player, PM_ThreeCamera, PM_ThreeVisible,
    v3_zero, v3_isZero, v3_equals, v3_add, v3_sub, v3_scale, v3_sqrMag, v3_normalize, v3_rotate, v3_multiply, v3_lerp, v3_transform, v3_magnitude,
    q_isZero, q_normalize, q_pitch, q_yaw, q_roll, q_identity, q_euler, q_axisAngle, q_slerp, q_multiply, q_equals,
    m4_multiply, m4_rotationQ, m4_translation, m4_invert, m4_getTranslation, m4_getRotation} from "@croquet/worldcore";

import { frameId, isPrimaryFrame, addShellListener, removeShellListener, sendToShell } from "./frame.js";
import {PM_Pointer} from "./Pointer.js";
import {CardActor, CardPawn} from "./DCard.js";

import {setupWorldMenuButton} from "./worldMenu.js";

const EYE_HEIGHT = 1.676;
const EYE_EPSILON = 0.01;
const FALL_DISTANCE = EYE_HEIGHT / 12;
const MAX_FALL = -50;
const MAX_V = 0.05;
const KEY_V = MAX_V/2;
const MAX_SPIN = 0.001;
const COLLIDE_THROTTLE = 50;
const THROTTLE = 20; // 15;
const PORTAL_DISTANCE = 1;
const COLLISION_RADIUS = EYE_HEIGHT / 5;
const isMobile = !!("ontouchstart" in window);
let initialPortalLook;

export class AvatarActor extends mix(CardActor).with(AM_Player) {
    init(options) {
        let playerId = options.playerId;
        delete options.playerId;
        super.init(options);
        this._playerId = playerId;
        this._layers = ["avatar"];

        this.lookPitch = 0;
        this.lookYaw = 0;
        this.lookOffset = [0, 0, 0];

        this.fall = false;
        this.tug = 0.05; // minimize effect of unstable wifi
        this.set({tickStep: 30});
        this.listen("goHome", this.goHome);
        this.listen("goThere", this.goThere);
        this.listen("startMMotion", this.startFalling);
        this.listen("avatarLookTo", this.onLookTo);
        this.listen("comeToMe", this.comeToMe);
        this.listen("followMeToWorld", this.followMeToWorld);
        this.listen("stopPresentation", this.stopPresentation);
        this.listen("inWorldSet", this.inWorldSet);
        this.listen("fileUploaded", "fileUploaded");
        this.listen("addSticky", this.addSticky);
        this.listen("textPasted", this.textPasted);
        this.listen("resetHeight", this.resetHeight);
        this.subscribe("playerManager", "presentationStarted", this.presentationStarted);
        this.subscribe("playerManager", "presentationStopped", this.presentationStopped);
        this.listen("leavePresentation", this.leavePresentation);
        this.future(0).tick();
    }

    get pawn() { return AvatarPawnFactory; }
    get lookNormal() { return v3_rotate([0,0,-1], this.rotation); }
    get collisionRadius() { return this._collisionRadius || COLLISION_RADIUS; } // minimum collison radius for avatar
    get maxFall(){ return this._maxFall || MAX_FALL; } // max fall before we goHome()
    get fallDistance(){ return this._fallDistance || FALL_DISTANCE }; // how far we fall per update
    get inWorld() { return !!this._inWorld; }   // our user is either in this world or render

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

    resetHeight() {
        let t = this.translation;
        this.goTo([t[0], 0, t[2]], this.rotation, false);
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
        let v = v3_zero();
        let q = q_identity();
        this.goTo(v, q, false);
        this.say("setLookAngles", {pitch: 0, yaw: 0, lookOffset: v3_zero()});
        this.set({lookPitch: 0, lookYaw: 0});
        this.lookOffset = v3_zero();
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
                this.set({lookPitch: pitch, lookYaw: yaw});
                this.say("setLookAngles", {pitch, yaw});
            }
        }
        this.goToStep(0.1);
    }

    comeToMe(teleport) {
        this.norm = this.lookNormal;
        this.service("PlayerManager").startPresentation(this.playerId, teleport);
    }

    followMeToWorld(portalURL) {
        const manager = this.service("PlayerManager");
        if (manager.presentationMode === this.playerId) {
            for (const playerId of manager.followers) {
                const follower = manager.player(playerId);
                follower.leaveToWorld(portalURL);
            }
        }
    }

    leaveToWorld(portalURL) {
        this.say("leaveToWorld", portalURL);
    }

    presentationStarted(playerId, teleport) {
        if (this.playerId !== playerId && this.inWorld) {
            let leader = this.service("PlayerManager").player(playerId);
            if (teleport) {
                this._translation = [...leader.translation];
                this._rotation = [...leader.rotation];
                this.say("forceOnPosition");
            } else {
                this.goTo(leader.translation, leader.rotation, false);
            }
            this.follow = playerId;
            this.fall = false;
        }
    }

    presentationStopped() {
        this.follow = null;
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

    tick(_delta) {
        if (this.follow) {
            let followMe = this.service("PlayerManager").players.get(this.follow);
            if (followMe) {
                this.positionTo({v: followMe._translation, q: followMe._rotation});
                this.lookOffset = followMe.lookOffset;
                this.say("setLookAngles", {pitch: followMe.lookPitch, yaw: followMe.lookYaw, lookOffset: followMe.lookOffset});
            } else {
                this.presentationStopped();
            }
        }
        if (!this.doomed) this.future(this._tickStep).tick(this._tickStep);
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
        let appManager = this.service("MicroverseAppManager");
        let CA = appManager.get("CardActor");

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
                multiuser: true,
                type: "2d",
                textureType: "canvas",
                frameColor: 0xffffff,
                cornerRadius: 0.05,
                color: 0xffffff,
                depth: 0.05,
                fullBright: true,
                pdfLocation: dataId
            };
        } else {
            options = {...options, dataLocation: dataId};
        }

        if (type !== "exr") {
            CA.load([{card: options}], this.wellKnownModel("ModelRoot"), "1")[0];
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

    createStickyNote(translation, rotation, text="") {
        let appManager = this.service("MicroverseAppManager");
        let CA = appManager.get("CardActor");

        let runs = [];
        if (text) runs.push({text});
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

        CA.load([{card: options}], this.wellKnownModel("ModelRoot"), "1")[0];
        this.publish(this.sessionId, "triggerPersist");
    }

    createPortal(translation, rotation, portalURL) {
        let appManager = this.service("MicroverseAppManager");
        let CA = appManager.get("CardActor");

        let card = {
            name: "portal",
            className: "PortalActor",
            translation,
            rotation,
            type: "2d",
            layers: ["pointer", "portal"],
            color: 0xFF66CC,
            frameColor: 0x888888,
            width: 2,
            height: 3,
            depth: 0.2,
            cornerRadius: 0.05,
            portalURL,
            sparkle: false,
        };

        CA.load([{card}], this.wellKnownModel("ModelRoot"), "1");
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
        this.throttle = 15; //ms
        this.ignore("scaleSet");
        this.ignore("rotationSet");
        this.ignore("translationSet");
        this.ignore("positionSet");
    }

    /*
    // If our global changes, so do the globals of our children
    globalChanged() {
        if (!this._global) {
            this.say("viewGlobalChanged");
            if (this.children)  {
                this.children.forEach(child => child.onGlobalChanged());
            }
        }
    }*/

    positionTo(v, q, throttle) {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            this._translation = v;
            this._rotation = q;
            this.onLocalChanged();
            this.localDriver = true;
            this.isTranslating = false;
            this.isRotating = false;
        } else {
            this.localDriver = false;
        }
        super.positionTo(v, q, throttle);
        // this.globalChanged();
    }

    scaleTo(v, throttle) {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            this._scale = v;
            this.onLocalChanged();
            this.isScaling = false;
            this.localDriver = true;
        } else {
            this.localDriver = false;
        }
        super.scaleTo(v, throttle);
        // this.globalChanged();
    }

    rotateTo(q, throttle) {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            this._rotation = q;
            this.onLocalChanged();
            this.localDriver = true;
            this.isRotating = false;
        } else {
            this.localDriver = false;
        }
        super.rotateTo(q, throttle);
        // this.globalChanged();
    }

    translateTo(v, throttle)  {
        if (!this.actor.follow) {
            throttle = throttle || this.throttle;
            this._translation = v;
            this.isTranslating = false;
            this.localDriver = true,
            this.onLocalChanged();
        } else {
            this.localDriver = false;
        }
        super.translateTo(v, throttle);
        // this.globalChanged();
    }
}

class RemoteAvatarPawn extends mix(CardPawn).with(PM_Player, PM_ThreeVisible) {
    constructor(actor) {
        super(actor);
        this.lastUpdateTime = 0;
        this.lastTranslation = this.actor.translation;
        this.opacity = 1;

        this.spin = q_identity();
        this.velocity = [0, 0, 0];

        this.lookPitch = this.actor.lookPitch;
        this.lookYaw = this.actor.lookYaw;
        this.lookOffset = [0, 0, 0]; // Vector displacing the camera from the avatar origin.
        this._rotation = q_euler(0, this.lookYaw, 0);
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
        this.lastTranslation = this.actor.translation;
        this.opacity = 1;

        this.spin = q_identity();
        this.velocity = [0, 0, 0];

        this.lookPitch = this.actor.lookPitch;
        this.lookYaw = this.actor.lookYaw;
        this.lookOffset = [0, 0, 0]; // Vector displacing the camera from the avatar origin.
        this._rotation = q_euler(0, this.lookYaw, 0);
        this.portalLook = initialPortalLook;

        this.moveRadius = this.actor.collisionRadius;
        this.isFalling = false;

        if (true) {
            let renderMgr = this.service("ThreeRenderManager");
            this.camera = renderMgr.camera;
            this.scene = renderMgr.scene;
            this.lastHeight = EYE_HEIGHT; // tracking the height above ground
            this.yawDirection = -1; // which way the mouse moves the world depends on if we are using WASD or not

            this.walkCamera = new THREE.Object3D();

            this.walkcaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0));
            this.portalcaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, PORTAL_DISTANCE);

            this.future(100).fadeNearby();
            this.lastTranslation = this.translation;
            this.lastPortalTranslation = this.translation;

            // clip halfspace behind portalCamera
            this.portalClip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.2); // 0.2 is to cover the gap of the portal thickness

            document.getElementById("homeBttn").onclick = () => this.goHome();
            document.getElementById("usersComeHereBttn").onclick = () => this.comeToMe();
            document.getElementById("editModeBttn").setAttribute("mobile", isMobile);
            document.getElementById("editModeBttn").setAttribute("pressed", false);

            let editButton = document.getElementById("editModeBttn");
            editButton.onpointerdown = (evt) => this.setEditMode(evt);
            editButton.onpointerup = (evt) => this.clearEditMode(evt);

            setupWorldMenuButton(this, App, this.sessionId);

            this.assetManager = this.service("AssetManager");
            window.assetManager = this.assetManager.assetManager;

            // drop and paste
            this.assetManager.assetManager.setupHandlersOn(document, (buffer, fileName, type) => {
                if (type === "pastedtext") {
                    this.pasteText(buffer);
                } else if (type === "vrse") {
                    this.loadvrse(buffer);
                } else {
                    this.uploadFile(buffer, fileName, type);
                }
            });

            // keep track of being in the primary frame or not
            this.isPrimary = isPrimaryFrame;
            this.say("_set", { inWorld: this.isPrimary });
            this.shellListener = (command, { frameType, spec, cameraMatrix, dx, dy}) => {
                switch (command) {
                    case "frame-type":
                        const isPrimary = frameType === "primary";
                        if (isPrimary !== this.isPrimary) {
                            this.frameTypeChanged(isPrimary, spec);
                            this.isPrimary = isPrimary;
                        }
                        // tell shell that we received this command (TODO: should only send this once)
                        sendToShell("started");
                        break;
                    case "portal-update":
                        if (cameraMatrix) {
                            this.portalLook = cameraMatrix;
                            initialPortalLook = cameraMatrix;
                            if (!this.isPrimary) this.refreshCameraTransform();
                        }
                        break;
                    case "motion-start":
                        this.startMMotion();
                        if (dx || dy) this.updateMMotion(dx, dy);
                        break;
                    case "motion-end":
                        this.endMMotion();
                        break;
                    case "motion-update":
                        this.updateMMotion(dx, dy);
                        break;
                }
            }
            addShellListener(this.shellListener);
            this.say("resetHeight");
            this.subscribe("playerManager", "playerCountChanged", this.showNumbers);
            this.listen("setLookAngles", this.setLookAngles);
            this.listen("leaveToWorld", this.leaveToWorld);
            this.showNumbers();

            //this.listenOnce("forceScaleSet", this.onScale);
            this.listen("forceOnPosition", this.onPosition);

            this.listen("goThere", this.stopFalling);
            console.log("MyPlayerPawn created", this, "primary:", this.isPrimary);

            this.wasdVelocity = [0, 0, 0];
            this.wasdMap = {w: false, a: false, d: false, s: false};
        }
    }

    get presenting() {
        return this.actor.service("PlayerManager").presentationMode === this.viewId;
    }

    onPosition() {
        this._rotation = this.actor.rotation;
        this._translation = this.actor.translation;
        this.onLocalChanged();
        //this.globalChanged();
    }

    setLookAngles(data) {
        let {pitch, yaw, lookOffset} = data;
        if (pitch !== undefined) {this.lookPitch = pitch;}
        if (yaw !== undefined) {this.lookYaw = yaw;}
        if (lookOffset !== undefined) {this.lookOffset = lookOffset;}
        this.onLocalChanged();
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
                let followers = manager.followers.size;
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

    lookTo(pitch, yaw, lookOffset) {
        this.say("leavePresentation");
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
            // the look* values are not intialized yet.
            if (!this.isPrimary && this.portalLook) return this.portalLook;
            else return this.walkLook;
        } else return this.global;
    }

    get walkLook() {
        const pitchRotation = q_axisAngle([1,0,0], this.lookPitch);
        const m0 = m4_translation(this.lookOffset);
        const m1 = m4_rotationQ(pitchRotation);
        const m2 = m4_multiply(m1, m0);
        return m4_multiply(m2, this.global);
    }

    specForPortal(portal) {
        // we are about to enter this portal. meaning we disappear from this world and appear in the target world
        // visually nothing should change, so we need this avatar's position relative to the portal, as well as
        // its look pitch and offset. This will be passed to frameTypeChanged() in the target world.
        const t = m4_invert(portal.global);
        const m = m4_multiply(this.global, t);
        // const log = (c, m) => console.log(c+"\n"+m.map((v, i) => +v.toFixed(2) + (i % 4 == 3 ? "\n" : ",")).join(''));
        // log("portal", portal.global);
        // log("avatar", this.global);
        // log("m", m);
        const translation = m4_getTranslation(m);
        const rotation = m4_getRotation(m);
        return {
            translation,
            rotation,
            lookPitch: this.lookPitch,
            lookYaw: this.lookYaw,
            lookOffset: this.lookOffset,
            presenting: this.presenting,    // keep presenting
            cardData: this.actor._cardData, // keep avatar appearance
        };
    }

    frameTypeChanged(isPrimary, spec) {
        // our avatar just came into or left this world, either through a portal
        // (in which case we have a view spec), or through a navigation event (browser's back/forward)
        // in all cases we set the actor's inWorld which will show/hide the avatar
        const enteringWorld = isPrimary;
        const leavingWorld = !isPrimary;
        const actorSpec = {
            inWorld: enteringWorld,
        };
        if (enteringWorld && spec) {
            // move actor to the right place
            actorSpec.translation = spec.translation;
            actorSpec.rotation = spec.rotation;
            // keep avatar appearance
            actorSpec.cardData = spec.cardData;
            // move pawn to the right place
            this._translation = spec.translation;
            this._rotation = spec.rotation;
            this.onLocalChanged();
            // copy camera settings to pawn
            if (spec.lookPitch) this.lookPitch = spec.lookPitch;
            if (spec.lookYaw) this.lookYaw = spec.lookYaw;
            if (spec.lookOffset) this.lookOffset = spec.lookOffset;
        }
        if (leavingWorld) this.endMMotion();
        // if we were presenting, tell followers to come with us
        if (leavingWorld && this.presenting) {
            this.say("followMeToWorld", spec.portalURL);
            // calls leaveToWorld() in followers
            // which will result in frameTypeChanged() on follower's clients
        }
        // now actually leave or enter the world (stops presenting in old world)
        console.log(`portal-${frameId} frame now ${isPrimary ? "primary" : "secondary"}, setting actor`, actorSpec);
        this.say("_set", actorSpec);
        // start presenting in new space too
        if (enteringWorld && spec?.presenting) {
            let manager = this.actor.service("PlayerManager");
            if (!manager.presentationMode) {
                this.say("comeToMe", true);
            }
        }
        this.refreshPortalClip();
    }

    leaveToWorld(portalURL) {
        sendToShell("enter-world", { portalURL });
    }

    update(time, delta) {
        if (!this.actor.follow) {
            if (this.actor.inWorld) {
                let moving = this.updatePose(delta);
                if (this.actor.fall && time - this.lastUpdateTime > THROTTLE) {
                    if (time - this.lastCollideTime > COLLIDE_THROTTLE) {
                        this.lastCollideTime = time;
                        this.collide();
                    }
                    this.lastUpdateTime = time;
                    this.lastTranslation = this.vq.v;
                    this.positionTo(this.vq.v, this.vq.q);
                }
                this.refreshCameraTransform();
            }
        } else {
            this.localDriver = false;
            super.update(time, delta);
        }
        this.refreshPortalClip();
    }

    // compute motion from spin and velocity
    updatePose(delta) {
        let q, v;
        let moving = false;
        let tug = this.tug;
        if (delta) tug = Math.min(1, tug * delta / 15);

        if (!q_isZero(this.spin)) {
            q = q_normalize(q_slerp(this.rotation, q_multiply(this.rotation, this.spin), tug));
            moving = true;
        } else {
            q = this.rotation;
        }
        if (!v3_isZero(this.velocity)) {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            // set the moveRadius (used for collision detection) to scale with velocity
            this.moveRadius = Math.min(0.8, this.actor.collisionRadius + 50*v3_sqrMag(move));
            v = v3_add(this.translation, move);
            moving = true;
        } else {
            v = this.translation;
        }
        this.vq = {v, q};
        return moving;
    }

    refreshPortalClip() {
        let { clippingPlanes } = this.service("ThreeRenderManager").renderer;
        if (this.isPrimary) {
            // we are the top world, so we turn off portal clipping
            const idx = clippingPlanes.indexOf(this.portalClip);
            if (idx >= 0) clippingPlanes.splice(idx, 1);
        } else {
            // we are rendering a portal, so we turn on portal clipping
            if (!clippingPlanes.includes(this.portalClip)) {
                clippingPlanes.push(this.portalClip);
            }
            // check which half-space of the portal the camera is in,
            // and flip the portal's clip plane to the other side if needed
            const cameraInFrontOfPortalPlane = this.lookGlobal[14] > 0;
            const clippingBehindPortalPlane = this.portalClip.normal.z < 0;
            if (clippingBehindPortalPlane !== cameraInFrontOfPortalPlane) {
                this.portalClip.normal.negate();
            }
            // this ensures we can look "through" the portal from behind
            // and see the other half space
            // TODO: we assume the portal is at the origin looking down the z axis
            // when this is no longer true, we need to update this code
        }
    }

    collideBVH(collideList) {
        // uses:
        // https://github.com/gkjohnson/three-mesh-bvh

        let triPoint = new THREE.Vector3();
        let capsulePoint = new THREE.Vector3();

        const radius = this.moveRadius;

        let head = EYE_HEIGHT / 6;
        let v=[...this.vq.v];

        let positionChanged = false;
        let newPosition = new THREE.Vector3(...v);
        collideList.forEach(c => {
            let iMat = new THREE.Matrix4();
            iMat.copy(c.matrixWorld).invert();

            v = newPosition;
            v.applyMatrix4(iMat); // shift this into the BVH frame

            let segment = new THREE.Line3(v.clone(), v.clone());

            segment.start.y += (head - radius);
            segment.end.y -= (EYE_HEIGHT - radius);
            let cBox = new THREE.Box3();
            cBox.min.set(v.x - radius, v.y - EYE_HEIGHT, v.z - radius);
            cBox.max.set(v.x + radius, v.y + EYE_HEIGHT / 6, v.z + radius);

            // let minDistance = 1000000;
            c.children[0].geometry.boundsTree.shapecast({
                intersectsBounds: box => box.intersectsBox(cBox),
                intersectsTriangle: tri => {
                    const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);
                    if (distance < radius) {
                        const depth = radius - distance;
                        const direction = capsulePoint.sub(triPoint).normalize();

                        segment.start.addScaledVector(direction, depth);
                        segment.end.addScaledVector(direction, depth);
                        positionChanged = true;
                    }
                }
            });
            newPosition = segment.start;
            newPosition.applyMatrix4(c.matrixWorld); // convert back to world coordinates
            newPosition.y -= (head - radius);
        })

        if(positionChanged){
            this.vq.v = newPosition.toArray();
            return true;
        }else {
            this.isFalling = true;
            return false;
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

    collidePortal() {
        let portalLayer = this.service("ThreeRenderManager").threeLayer("portal");
        if (!portalLayer) return false;

        let dir = v3_sub(this.vq.v, this.lastPortalTranslation);
        this.lastPortalTranslation = this.vq.v;
        let len = Math.max(v3_magnitude(dir), PORTAL_DISTANCE);
        // not moving then return false
        if (!dir.some(item => item !== 0)) return false;

        dir = v3_normalize(dir);
        this.portalcaster.far = len;
        this.portalcaster.ray.direction.set(...dir);
        this.portalcaster.ray.origin.set(...this.lastPortalTranslation);
        const intersections = this.portalcaster.intersectObjects(portalLayer, true);
        if (intersections.length > 0) {
            let portal = this.pawnFrom3D(intersections[0].object);
            if (portal) {
                portal.enterPortal();
                return true;
            }
        }
        return false;
    }

    collide() {
        if (this.collidePortal()) return true;

        let walkLayer = this.service("ThreeRenderManager").threeLayer('walk');
        if (!walkLayer) return false;

        if(this.isFalling){
            this.vq.v[1] -= this.actor.fallDistance;
            this.isFalling = false;
            if(this.vq.v[1]<this.actor.maxFall){this.goHome(); return;}
        }

        // then check for other floor objects
        let collideList = walkLayer.filter(obj=> !obj.collider);
        if(walkLayer.length >= 0) {
            this.walkcaster.ray.origin.set(...this.vq.v);
            const intersections = this.walkcaster.intersectObjects(walkLayer, true);

            if (intersections.length > 0) {
                let delta = intersections[0].distance - EYE_HEIGHT;
                if (delta<0) { // can only move up - we have already fallen
                    this.vq.v[1] -= delta;
                }
            }
        }
        // check for BVH colliders
        collideList = walkLayer.filter(obj => obj.collider);
        if (collideList.length>0) {this.collideBVH(collideList); }
    }

    startMMotion() {
        this.spin = q_identity();
        this.velocity = [0,0,0];
        this.say("startMMotion");
    }

    endMMotion() {
        this.activeMMotion = false;
        this.spin = q_identity();
        this.velocity = [0,0,0];
    }

    updateMMotion(dx, dy) {
        // move the avatar
        let v = dy * 0.000075;
        v = Math.min(Math.max(v, -MAX_V), MAX_V);

        const yaw = dx * (isMobile ? -MAX_SPIN : -MAX_SPIN);
        this.spin = q_euler(0, yaw ,0);
        this.velocity = [0,0,v];
        this.say("leavePresentation");
    }

    keyDown(e) {
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
                this.say("leavePresentation");
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
                    }
                }
            /* console.log(e) */
        }
    }

    keyUp(e) {
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
            } else if ((p === this || a._playerId === presentationMode) && v3_isZero(a.lookOffset)) {
                p.setOpacity(0); // never render me or leader in 1st person
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

        let pose;

        if (inFront) {
            pose = this.dropPose(6);
        }
        this.publish(model.id, "loadDone", {asScene, key, pose});
    }
}
