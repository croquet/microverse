// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Collaborative Card Object
// Also works with DSurface as a smart 2D object
// This needs to be redone to use Worldcore. 

import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { THREE, PM_ThreeVisible, Actor, Pawn, mix, AM_Predictive, PM_Predictive, Data, ModelService, ViewService, v3_dot, v3_sub, v3_add } from '@croquet/worldcore';
import { AM_PointerTarget, PM_PointerTarget } from "./Pointer.js";
import { D } from './DConstants.js';
import { addShadows, normalizeSVG, addTexture } from './assetManager.js'
import { TextFieldActor } from './text/text.js';
import { AM_Code } from './code.js';
import { forEach } from 'jszip';

export const intrinsicProperties = ["translation", "scale", "rotation", "layers", "parent", "actorCode", "pawnCode", "multiuser", "noSave"];

//------------------------------------------------------------------------------------------
//-- CardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget, AM_Code) {
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
        this.listen("selectEdit", ()=>this.say("doSelectEdit"));
        this.listen("unselectEdit", ()=>this.say("doUnselectEdit"));
        this.listen("setTranslation", this.setTranslation);
    }

    createShape(options) {
        if (!options.parent) {
            options = {...options, parent: this};
        } else {
            // look up and set
        }
        
        if (options.type === "text") {
            this.set(this._shapeOptions);
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
            // this is a weird inter mixins dependency but not sure how to write it
            this.subscribe(this.id, "load", "codeLoaded");
            this.subscribe(this.textActor.id, "text", "codeAccepted");
        }
    }

    sayDeck(message, vars){
        if(this._parent !== undefined)this.publish(this._parent.id, message, vars);
        else this.publish(this.id, message, vars);
    }

    listenDeck(message, method){
        if(this._parent !== undefined)this.subscribe(this._parent.id, message, method);
        else this.subscribe(this.id, message, method);
    }

    get pawn() { return CardPawn; }
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

    setTranslation(v){
        this._translation = v;
        this.localChanged();
        this.say("updateTranslation", v);
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
    // setCode() {}
    // setViewCode() {}
    // codeAccepted() {}
}
CardActor.register('CardActor');

//------------------------------------------------------------------------------------------
//-- CardPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class CardPawn extends mix(Pawn).with(PM_Predictive, PM_ThreeVisible, PM_PointerTarget) {

    constructor(actor) {
        super(actor);
        this.addToLayers(...actor.layers);
        this.addEventListener("pointerWheel", "onPointerWheel");
        this.addEventListener("pointerTap", "onPointerTap");
        this.listen("doSelectEdit", this.doSelectEdit);
        this.listen("doUnselectEdit", this.doUnselectEdit);
        this.listen("updateTranslation", this.updateTranslation);
        this.constructCard();
    }

    sayDeck(message, vars){
        if(this.actor._parent !== undefined)this.publish(this.actor._parent.id, message, vars);
        else this.publish(this.actor.id, message, vars);
    }
    
    listenDeck(message, method){
        if(this.actor._parent !== undefined)this.subscribe(this.actor._parent.id, message, method);
        else this.subscribe(this.actor.id, message, method);
    }

    constructCard() {
        this.shape = new THREE.Group()
        this.setRenderObject(this.shape);

        this.constructShape(this.actor._shapeOptions);
    }

    constructShape(options) {
        if (options.type === "model") {
            this.construct3D(options);
        } else if (options.type === "shape") {
            this.constructSurface(options);
        } else if (options.type === "text") {
            //this.constructSurface(options);
        } else if (options.type === "app") {
            this.constructSurface(options);
        }
    }

    construct3D(options) {
        let model3d = options.model3d;
        let modelType = options.modelType;

        if (options.placeholder) {
            let pGeometry = new THREE.BoxGeometry(40, 1, 40);
            let pMaterial = new THREE.MeshBasicMaterial({color: 0x808080, side: THREE.DoubleSide});
            this.placeholder = new THREE.Mesh(pGeometry, pMaterial);
            this.placeholder.position.set(0, -0.065, 0);
            this.placeholder.name = "placeholder";
            this.shape.add(this.placeholder);
            this.shape.name = "terrain";
        }
        
        if (!model3d) {return;}
        let assetManager = this.service("AssetManager").assetManager;

        this.getBuffer(model3d).then((buffer) => {
            return assetManager.load(buffer, modelType, THREE);
        }).then((obj) => {
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
            if (options.placeholder) {
                this.shape.remove(this.placeholder);
            }
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

    onPointerWheel(e) {
        let s = this.scale;
        let w = e < 0 ? -0.1 : 0.1;
        if (s[0] + w > 0.3) {
            this.scaleTo([s[0] + w, s[1] + w, s[2] + w], 100);
        }
    }

    onPointerTap(p3e){
        console.log("onPointerTap", p3e)
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

    dragPlane(rayCaster, p3e){
         if(!this._plane){
            let offset = v3_dot(p3e.xyz, p3e.normal);
            this._plane = new THREE.Plane(new THREE.Vector3(...p3e.normal), -offset);
            this.lastDrag = p3e.xyz;
        }
        let p = new THREE.Vector3();
        rayCaster.ray.intersectPlane(this._plane, p);
        let here = p.toArray();
        let delta = v3_sub(this.lastDrag, here);
        this.lastDrag = here;
        this.setTranslation(v3_sub(this._translation, delta));
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

    selectEdit(){
        this.say('selectEdit');
    }

    unselectEdit(){
        this.say('unselectEdit')
        this._plane = undefined;
    }

    doSelectEdit(){
        console.log("doSelectEdit")
        if(this.renderObject){
            addWire(this.renderObject);
        }
     }

    doUnselectEdit(){
        console.log("doUnselectEdit")
        if(this.renderObject){
            removeWire(this.renderObject);
        }
    }

    setTranslation(v){
        this._translation = v;
        this.onLocalChanged();
        this.say("setTranslation", v);
    }

    updateTranslation(v){
        if(!this._plane){ // only do this if you are not dragging
            this._translation = v;
            this.onLocalChanged();
        }
    }
}

function addWire(obj3d)
{
    let parts = [];
    let lines = [];
    obj3d.traverse((obj)=>{
        if(obj.geometry){
            let edges = new THREE.EdgesGeometry(obj.geometry);
            let line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0x44ff44} ));
            line.raycast = function(){};
            lines.push(line);
            let m = obj.material;
            let mat;
            if(Array.isArray(m))mat = m;
            else mat = [m];
            //console.log("AddWire, material", mat);
            mat.forEach(m=>{
                let c=m.color; 
                //console.log(c);
                if(c){
                    m._oldColor=c;
                    let gray = (c.r*0.299 +c.g*0.587+c.b*0.114)*0.50;
                    m.color = new THREE.Color(gray, gray, gray);
                }
            })
            parts.push( obj );
        }
    });
    for(let i=0; i<lines.length; i++){
        let line = lines[i];
        line.type = '_lineHighlight';
        parts[i].add(line);
    }
}

function removeWire(obj3d){
    let lines = [];
    let mat;
    obj3d.traverse((obj)=>{
        if(obj.type === '_lineHighlight')lines.push(obj);
        else if(obj.geometry){
            if(Array.isArray(obj.material)){mat = obj.material}
            else mat = [obj.material];
            //console.log("removeWire, material",mat);
            mat.forEach(m=>{ 
                m.color = m._oldColor; 
                m._oldColor = undefined;
            });
        }
    })
    for(let i=0; i<lines.length;i++){
        let line = lines[i];
        line.removeFromParent();
        line.geometry.dispose();
        line.material.dispose();
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
