// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Collaborative Card Object
// Also works with DSurface as a smart 2D object
// This needs to be redone to use Worldcore. 

import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { THREE, PM_ThreeVisible, Actor, Pawn, mix, AM_Predictive, PM_Predictive, AM_PointerTarget, PM_PointerTarget, Data, ModelService, ViewService } from '@croquet/worldcore';
import { D } from './DConstants.js';
import { addShadows, normalizeSVG, addTexture } from './assetManager.js'
import { TextFieldActor } from './text/text.js';
//import { AM_Code } from './code.js';

const CardColor = 0x9999cc;  // light blue
const OverColor = 0x181808; //0xffff77;   // yellow
const DownColor = 0x081808; // green
const NoColor = 0x000000; // black

const timeOutDown = 5000; // if no user action after down event, then cancel
const timeOutOver = 10000; // if no user action after enter event, then cancel
let counter = 0;

export const intrinsicProperties = ["translation", "scale", "rotation", "layers", "parent", "actorCode", "pawnCode", "multiuser", "noSave"];

//------------------------------------------------------------------------------------------
//-- DCardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class DCardActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget) {
    init(options) {
        let cardOptions = {};
        let shapeOptions = {};

        Object.keys(options).forEach((k) => {
            if (intrinsicProperties.indexOf(k) >= 0) {
                cardOptions[k] = options[k];
            } else {
                shapeOptions[k] = options[k];
            }
        });
        super.init(cardOptions);
        this.set({shapeOptions});
        this.createShape(shapeOptions);

        if (options.actorCode) {
            this.setModelCode(options.actorCode);
        }
        if (options.pawnCode) {
            this.setViewCode(options.pawnCode);
        }
    }

    createShape(options) {
        if (!options.parent) {
            options = {...options, parent: this};
        } else {
            // look up and set
        }
        
        if (options.type === "text") {
            let text = {
                isSticky: options.isSticky || true,
                color: options.color || 0xf4e056,
                textWidth: options.textWidth || 500,
                textHeight: options.textHeight || 500,
                runs: options.runs || [],
                parent: this
            };
            this.textActor = TextFieldActor.create(text);
            this.subscribe(this.textActor.id, "changed", "textChanged");
        } else if (options.type === "model") {
            this.creationTime = this.now();
        } else if (options.type === "shape") {
        } else if (options.type === "lighting") {
        } else if (options.type === "code") {
            let textOptions = {
                isSticky: false,
                color: 0xFFFFFF,
                textWidth: options.textWidth || 500,
                textHeight: options.textHeight || 500,
                isExternal: true,
                runs: options.runs || [],
                parent: this,
            };
            this.textActor = TextFieldActor.create(textOptions);
            this.subscribe(this.textActor.id, "text", "codeAccepted");
        }
    }

    get pawn() { return DCardPawn; }
    get layers() { return this._layers || ['pointer']; }
    get isCard() {return true;}

    uv2xy(uv) {
        return [this.width * uv[0],this.height * (1 - uv[1])];
    }
    get width() {
        return this._shapeOptions.width || 1024;
    }
    get height() {
        return this._shapeOptions.height || 1024;
    }

    textChanged() {
        this._shapeOptions.runs = this.textActor.content.runs;
        this.publish(this.sessionId, "triggerPersist");
    }

    sayDeck(message, data) {
        if (this._parent) {
            return this.publish(this._parent.id, message, data);
        }
        this.publish(this.id, message, data);
    }

    listenDeck(message, method) {
        if (this._parent) {
            return this.subscribe(this._parent.id, message, method);
        }
        this.subscribe(this.id, message, method);
    }

    // placeholders. overwritten by AM_Code when it is mixed in
    setModelCode() {}
    setViewCode() {}
    codeAccepted() {}
}
DCardActor.register('DCardActor');

//------------------------------------------------------------------------------------------
//-- DCardPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class DCardPawn extends mix(Pawn).with(PM_Predictive, PM_ThreeVisible, PM_PointerTarget) {

    constructor(actor) {
        super(actor);
        this.addToLayers(...actor.layers);
        this.constructCard();
    }

    constructCard() {
        this.shape = new THREE.Group()
        this.setRenderObject(this.shape);

        this.constructShape(this.actor._shapeOptions)
    }

    constructShape(options) {
        if (options.type === "text") {
        } else if (options.type === "model") {
            this.construct3D(options);
        } else if (options.type === "shape") {
            this.constructSurface(options);
        } else if (options.type === "app") {
            this.constructSurface(options);
        }
    }

    construct3D(options) {
        let model3d = options.model3d;
        let modelType = options.modelType;
        if (!model3d) {return;}
        let assetManager = this.service("AssetManager").assetManager;

        this.getBuffer(model3d).then((buffer) => {
            assetManager.load(buffer, modelType, THREE).then((obj) => {
                obj.updateMatrixWorld(true);
                addShadows(obj, options.shadow, options.singleSided, THREE);
                if (options.scale) {
                    obj.scale.set(...options.scale);
                } else {
                    let size = new THREE.Vector3(0, 0, 0);
                    new THREE.Box3().setFromObject(obj).getSize(size);
                    let max = Math.max(size.x, size.y, size.z);
                    let s = 4 / max;
                    obj.scale.set(s, s, s);
                }
                if (options.offset) {
                    obj.position.set(...options.offset);
                }
                if (options.rotation) {
                    obj.rotation.set(...options.rotation);
                }
                if (obj._croquetAnimation) {
                    const spec = obj._croquetAnimation;
                    spec.startTime = this.actor.creationTime;
                    this.animationSpec = spec;
                    this.future(500).runAnimation();
                }
                this.shape.add(obj);
            });
        });
    }

    constructSurface(options) {
        if (options.textureType === "video") {
            this.video = document.createElement('video');
            this.video.src = options.textureURL;
            this.video.loop = true;
            let videoService = this.service("VideoManager");
            videoService.add(this.video);
            // this.video.play();
            this.texture = new THREE.VideoTexture(this.video);
        } else if (options.textureType === "canvas") {
            this.canvas = document.createElement('canvas');
            this.canvas.id = options.name || this.id;
            this.canvas.width = options.width;
            this.canvas.height = options.height;
            this.texture = new THREE.CanvasTexture(this.canvas);
        } else if (options.textureType === "texture") {
            this.texture = new THREE.TextureLoader().load(options.textureURL);
        }

        let loadOptions = {
            texture: this.texture,
            color: options.color,
            frameColor: options.frameColor,
            fullBright: options.fullBright,
            depth: options.depth,
        };
        let assetManager = this.service("AssetManager").assetManager;
        this.getBuffer(options.shapeURL).then((buffer) => {
            return assetManager.load(buffer, "svg", THREE, loadOptions);
        }).then((obj) => {
            normalizeSVG(obj, options.depth, options.shadow, THREE);
            this.aspect = obj.aspect;
            if (this.texture) addTexture(this.texture, obj);
            if (options.offset) {
                obj.position.set(...options.offset);
            }
            this.shape.add(obj);
        });
    }

    getBuffer(name) {
        if (name.startsWith("http://") ||
            name.startsWith("https://") ||
            name.startsWith(".") ||
            name.startsWith("/")) {
            return fetch(name)
                .then((resp) => resp.arrayBuffer())
                .then((arrayBuffer) => new Uint8Array(arrayBuffer));
        } else {
            let handle = Data.fromId(name);
            return Data.fetch(this.sessionId, handle);
        }
    }

    uv2xy(uv) {
        return this.actor.uv2xy(uv);
    }
    get width() {
        return this.actor.width;
    }
    get height() {
        return this.actor.height;
    }

    onFocus(pointerId) {
        console.log("focused")
    }

    onFocusFailure(pointerId) {
        console.log("already focused by another avatar")
    }

    onBlur(pointerId) {
        console.log("blurred")
    }

    onPointerEnter(pointerId) {
        console.log(pointerId)
    //    const pointerPawn = GetPawn(pointerId);
    //    const pointerRotation = pointerPawn.actor.rotation;
    //    this.localOffset = m4_rotationQ(pointerRotation);
    }

    onPointerLeave(pointerId) {
        console.log("pointerLeave")
    }

    // communication with the Card_Actor and the Surface_Pawn
    onPointerDown(p3d){
    //    this.tween(this.shape, new THREE.Quaternion(...p3d.rotation));
        this.say("onPointerDown", p3d);
        if(this.surface && this.surface.onPointerDown)this.surface.onPointerDown(p3d);
    }
    onPointerMove(p3d){
        this.say("onPointerMove", p3d);
        if(this.surface && this.surface.onPointerMove)this.surface.onPointerMove(p3d);
    }
    onPointerUp(p3d){
        this.say("onPointerUp", p3d);
        if(this.surface && this.surface.onPointerUp)this.surface.onPointerUp(p3d);
    }
    onPointerEnter(p3d){
        //this.tween(this.shape, new THREE.Quaternion(...p3d.rotation));
        this.say("onPointerEnter", p3d);
        if(this.surface && this.surface.onPointerEnter)this.surface.onPointerEnter(p3d);
    }
    onPointerOver(p3d){
        this.say("onPointerOver", p3d);
        if(this.surface && this.surface.onPointerOver)this.surface.onPointerOver(p3d);
    }
    onPointerLeave(p3d){
        this.say("onPointerLeave", p3d);
        if(this.surface && this.surface.onPointerLeave)this.surface.onPointerLeave(p3d)
    }
    onKeyDown(e){
        this.say("onKeyDown", e);
        if(this.surface && this.surface.onKeyDown)this.surface.onKeyDown(e);
    }
    onKeyUp(e){
        this.say("onKeyUp", e);
        if(this.surface && this.surface.onKeyUp)this.surface.onKeyUp(e);
    }
    onPointerWheel(e){
        let s = this.scale;
        let w = e < 0 ? -0.1 : 0.1;
        if (s[0] + w > 0.3) {
            this.scaleTo([s[0] + w, s[1] + w, s[2] + w], 100);
        }
    }

    setColor(color) {
        let c = new THREE.Color(color);
        this.shape.traverse(obj=>{
            if(obj.material){
                if (Array.isArray(obj.material)) {
                    obj.material[0].color = c;
                } else {
                    obj.material.color = c;
                }
            }
        });
    }

    hilite(color) { 
        //viewRoot.outlinePass.selectedObjects = [this.shape];
        if(!this.actor._fullBright){
            let c = new THREE.Color(color);
            this.shape.traverse(obj=>{
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material[0].emissive = c;
                    } else {
                        obj.material.emissive = c;
                    }
                }
            });
        }
    }

    tween(target, qEnd, onComplete){
        if(this.isTweening)return;

        this.isTweening = true;
        var qStart = new THREE.Quaternion();
        // tween
        var time = { t: 0 };
        var scope = this;
        new TWEEN.Tween( time )
            .to( { t : 1 }, 300 )
            //.easing( TWEEN.Easing.Quadratic.InOut )
            .easing( TWEEN.Easing.Linear.None )
            .onStart(() => {
                qStart.copy(target.quaternion);
            })
            .onUpdate(() => {
                target.quaternion.slerpQuaternions( qStart, qEnd, time.t );    
                target.updateMatrixWorld();
            })
            .onComplete(() => {
                target.quaternion.copy( qEnd ); // so it is exact  
                target.updateMatrixWorld();
                scope.isTweening = false;
                if(onComplete)onComplete();
            })
            .start();
        this.future(100).updateTween();
    }

    updateTween(){
        if(this.isTweening){
            TWEEN.update();
            this.future(50).updateTween();
        }
    }

    // compute and return the position and distance the avatar should jump to to see the card full screen
    getJumpToPose() {
        if(!this.isFlat)return;
        let current = this.shape.localToWorld(new THREE.Vector3()).toArray(); // this is where the card is
        let camera = this.service("ThreeRenderManager").camera;
        let fov = camera.fov;
        let caspect = camera.aspect;
        let taspect = this.aspect;
        let d, w, h, s = this.scale[0];
        if (taspect < 1) {
            w = taspect * s;
            h = s;
        } else {
            w = s;
            h = s / taspect;
        }

        d = (h / 2) / Math.tan(Math.PI * fov / 360); // compute distance from card assuming vertical 

        if (caspect <= taspect) d *= (taspect / caspect); // use width to fit instead

        return [current, d];
    }

    makePlane(pEvt, useNorm) {
        // worldDirection is an optional direction vector if you don't want to
        // use the objects world direction
        let pos = new THREE.Vector3(), norm = new THREE.Vector3();
        pos.copy(pEvt.point);
        //this.object3D.worldToLocal(vec0);
        //let offset = vec0.z;
        if (useNorm && pEvt.face && pEvt.face.normal) {
            norm.copy(pEvt.face.normal);
            let normalMatrix = new THREE.Matrix3().getNormalMatrix( this.object3D.matrixWorld );
            norm.applyMatrix3( normalMatrix ).normalize();
        } else {
            this.object3D.getWorldDirection(norm);
        }
        let offset = norm.dot(pos); // direction dotted with position in world coords
        this.plane = new THREE.Plane(norm, -offset);
    }

    trackPlane(pEvt, vec) {
        if (this.plane) {
            let vec0 = vec || new THREE.Vector3();
            pEvt.ray3D.ray.intersectPlane(this.plane, vec0);
            return vec0;
        }
        return null;
    }

    runAnimation() {
        const spec = this.animationSpec;
        if (!spec) return;

        const { mixer, startTime, lastTime } = spec;
        const now = this.now();
        const newTime = (now - startTime) / 1000, delta = newTime - lastTime;
        mixer.update(delta);
        spec.lastTime = newTime;

        this.future(1000 / 20).runAnimation();
    }

    sayDeck(message, data) {
        if (this.actor._parent) {
            return this.publish(this.actor._parent.id, message, data);
        }
        this.publish(this.actor.id, message, data);
    }

    listenDeck(message, method) {
        if(this.actor._parent !== undefined)this.subscribe(this.actor._parent.id, message, method);
        else this.subscribe(this.actor.id, message, method);
    }    
}

export class DynaverseAppManager extends ModelService {
    init(options) {
        super.init("DynaverseAppManager");
        this.$apps = options.registry; // new Map() {[name]: cls}
    }

    add(cls) {
        this.set(cls.name, cls);
    }
    set(name, cls) {
        this.$apps.set(name, cls);
    }
    get(name) {
        return this.$apps.get(name);
    }
    delete(name) {
        return this.$apps.delete(name);
    }
}

DynaverseAppManager.register("DynaverseAppManager");

export class VideoManager extends ViewService {
    constructor(name) {
        super(name || "VideoManager");
        this.videos = [];
        this.handler = () => this.videoStart();
        document.addEventListener("click", this.handler);
    }

    add(video) {
        if (this.videos.indexOf(video) < 0) {
            this.videos.push(video);
        }
    }

    videoStart() {
        this.videos.forEach((v)=>v.play());
        if (this.handler) {
            document.removeEventListener('click', this.handler);
            delete this.handler;
        }
    }
}
