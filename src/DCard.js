// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
//
// Collaborative Card Object

import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { THREE, PM_ThreeVisible, Actor, Pawn, mix, AM_Predictive, PM_Predictive, Data, ModelService, ViewService, 
    v3_dot, v3_cross, v3_sub, v3_sqrMag, v3_normalize, v3_magnitude,
    q_euler, q_multiply } from '@croquet/worldcore';
import { AM_PointerTarget, PM_PointerTarget } from './Pointer.js';
import { D } from './DConstants.js';
import { addShadows, normalizeSVG, addTexture } from './assetManager.js'
import { TextFieldActor } from './text/text.js';
import { DynamicTexture } from './DynamicTexture.js'
import { AM_Code, PM_Code } from './code.js';
// import { forEach } from 'jszip';

export const intrinsicProperties = ["translation", "scale", "rotation", "layers", "parent", "actorCode", "pawnCode", "multiuser", "name"];

//------------------------------------------------------------------------------------------
//-- CardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget, AM_Code) {
    init(options) {
        let cardOptions = {};
        let cardData = {};

        Object.keys(options).forEach((k) => {
            if (intrinsicProperties.indexOf(k) >= 0) {
                cardOptions[k] = options[k];
            } else {
                cardData[k] = options[k];
            }
        });

        super.init(cardOptions);
        this.set({cardData});
        this.createShape(cardData);
        this.listen("selectEdit", ()=>this.say("doSelectEdit"));
        this.listen("unselectEdit", ()=>this.say("doUnselectEdit"));
        this.listen("setTranslation", this.setTranslation);
        this.listen("setRotation", this.setRotation);
    }

    createShape(options) {
        if (options.type === "text") {
            this.subscribe(this.id, "changed", "textChanged");
        } else if (options.type === "model") {
            this.creationTime = this.now();
        } else if (options.type === "svg") {
        } else if (options.type === "lighting") {
        } else if (options.type === "code") {
            this.subscribe(this.id, "changed", "textChanged");
            // this is a weird inter mixins dependency but not sure how to write it
            this.subscribe(this.id, "text", "codeAccepted");
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
    get name() {return this._name || 'Card'}
    get color() {return this._color || 0xffffff}

    uv2xy(uv) {
        return [this.width * uv[0],this.height * (1 - uv[1])];
    }
    get width() {
        return this._cardData.width || 1024;
    }
    get height() {
        return this._cardData.height || 1024;
    }

    setTranslation(v){
        this._translation = v;
        this.localChanged();
        this.say("updateTranslation", v);
    }

    setRotation(q){
        this._rotation = q;
        this.localChanged();
        this.say("updateRotation", q);
    }

    textChanged() {
        this._cardData.runs = this.content.runs;
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

    static load(array, world, version) {
        if (version === "1") {
            let appManager = world.service("DynaverseAppManager");
            let expanderManager = world.service("ExpanderModelManager");
            let map = new Map();
            array.forEach(({id, card}) => {
                let Cls;
                let options = {...card};
                if (options.type === "code") {
                    let expander = expanderManager.code.get(options.expander);
                    let runs = [{text: expander ? expander.code : ""}];
                    
                    options = {...options, ...{
                        isSticky: false,
                        color: 0xFFFFFF,
                        textScale: options.textScale || 0.002,
                        isExternal: true,
                        runs: runs,
                    }};
                    Cls = TextFieldActor;
                } else if (card.className) {
                    Cls = appManager.get(card.className);
                    delete options.className;
                } else {
                    Cls = CardActor;
                }
                if (card.parent) {
                    let parent = map.get(card.parent);
                    options.parent = parent;
                }

                let actor = Cls.create(options);
                if (id) {
                    map.set(id, actor);
                }
            });
        }
    }
}
CardActor.register('CardActor');

//------------------------------------------------------------------------------------------
//-- CardPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class CardPawn extends mix(Pawn).with(PM_Predictive, PM_ThreeVisible, PM_PointerTarget, PM_Code) {

    constructor(actor) {
        super(actor);
        this.addToLayers(...actor.layers);
        this.addEventListener("pointerWheel", "onPointerWheel");
        this.addEventListener("pointerTap", "onPointerTap");
        this.listen("doSelectEdit", this.doSelectEdit);
        this.listen("doUnselectEdit", this.doUnselectEdit);
        this.listen("updateTranslation", this.updateTranslation);
        this.listen("updateRotation", this.updateRotation);
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
        this.shape.name = this.actor.name;
        this.setRenderObject(this.shape);

        this.constructShape(this.actor._cardData);
    }

    constructShape(options) {
        if (options.type === "model") {
            this.construct3D(options);
        } else if (options.type === "svg") {
            this.isFlat = true;
            this.constructSurface(options);
        }  else if (options.type === "text" || options.type === "code") {
            this.isFlat = true;
        }
    }

    construct3D(options) {
        let model3d = options.dataLocation;
        let modelType = options.modelType;

        /* this is really a hack to make it work with the current model. */

        if (options.placeholder) {
            let size = options.placeholderSize || [40, 1, 40];
            let color = options.placeholderColor || 0x808080;
            let offset = options.placeholderOffset || [0, -0.065, 0];
            
            let pGeometry = new THREE.BoxGeometry(...size);
            let pMaterial = new THREE.MeshBasicMaterial({color: color, side: THREE.DoubleSide});
            this.placeholder = new THREE.Mesh(pGeometry, pMaterial);
            this.placeholder.position.set(...offset);
            this.placeholder.name = "placeholder";
            this.shape.add(this.placeholder);
        }

        let name = options.name;
        let shadow = options.shadow !== undefined ? options.shadow : true;
        let singleSided = options.singleSided !== undefined ? options.singleSided : false;

        if (!model3d) {return;}
        let assetManager = this.service("AssetManager").assetManager;

        this.getBuffer(model3d).then((buffer) => {
            return assetManager.load(buffer, modelType, THREE);
        }).then((obj) => {
            obj.updateMatrixWorld(true);
            addShadows(obj, shadow, singleSided, THREE);
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
            if (name) {
                obj.name = name;
            }
            if (options.placeholder) {
                this.shape.remove(this.placeholder);
            }
        });
    }

    constructSurface(options) {
        let shapeURL = options.dataLocation;
        if (!shapeURL) {
            console.log("dataLocation is not defined in ", options);
            return;
        }

        let textureURL = options.textureLocation;
        let textureType = options.textureType;

        let depth = (options.depth !== undefined) ? options.depth : 0.05;
        let width = (options.width !== undefined) ? options.width : 512;
        let height = (options.height !== undefined) ? options.height : 512;
        let name = options.name || this.id;
        let color = options.color || 0xFFFFFF;
        let frameColor = options.frameColor || 0x666666;
        let fullBright = options.fullBright !== undefined ? options.fullBright : true;
        let shadow = options.shadow !== undefined ? options.shadow : true;
        
        if (textureType === "video") {
            this.video = document.createElement('video');

            this.getBuffer(textureURL).then((buffer) => {
                let objectURL = URL.createObjectURL(new Blob([buffer]));
                this.video.src = objectURL;
                this.objectURL = objectURL;
                // need to be revoked when destroyed
            });
            this.video.loop = true;
            let videoService = this.service("VideoManager");
            videoService.add(this.video);
            this.texture = new THREE.VideoTexture(this.video);
        } else if (textureType === "image") {
            this.getBuffer(textureURL).then((buffer) => {
                let objectURL = URL.createObjectURL(new Blob([buffer]));
                this.objectURL = objectURL;
                this.texture = new THREE.TextureLoader().load(objectURL);
            });
        } else if (textureType === "canvas") {
            this.canvas = document.createElement("canvas");
            this.canvas.id = name;
            this.canvas.width = width;
            this.canvas.height = height;
            this.texture = new THREE.CanvasTexture(this.canvas);
        } else if (textureType === "dynamic"){
            this.dynamic = new DynamicTexture(width, height, options.fillStyle, options.clearStyle);
            this.texture = this.dynamic.texture;
        }

        let loadOptions = {
            texture: this.texture,
            color,
            frameColor,
            fullBright,
            shadow,
            depth,
        };
        let assetManager = this.service("AssetManager").assetManager;
        this.getBuffer(shapeURL).then((buffer) => {
            return assetManager.load(buffer, "svg", THREE, loadOptions);
        }).then((obj) => {
            normalizeSVG(obj, depth, shadow, THREE);
            this.aspect = obj.aspect;
            if (this.texture) addTexture(this.texture, obj);
            if (options.offset) {
                obj.position.set(...options.offset);
            }
            this.shape.add(obj);
        });
    }

    isDataId(name) {
        return !(name.startsWith("http://") ||
          name.startsWith("https://") ||
          name.startsWith(".") ||
          name.startsWith("/"));
    }

    getBuffer(name) {
        if (!this.isDataId(name)) {
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
        let wheel = e.deltaY;
        let s = this.scale;
        let w = wheel < 0 ? -0.1 : 0.1;
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
        let current = this.renderObject.localToWorld(new THREE.Vector3()).toArray(); // this is where the card is
        let camera = this.service("ThreeRenderManager").camera;
        let fov = camera.fov;
        let caspect = camera.aspect;

        let size = new THREE.Vector3(0, 0, 0);
        new THREE.Box3().setFromObject(this.renderObject).getSize(size);
        let taspect = size.z / size.y;
        
        let d, w, h;
        if (taspect < 1) {
            w = size.y * taspect;
            h = size.y;
        } else {
            w = size.z;
            h = size.z / taspect;
        }

        d = (h / 2) / Math.tan(Math.PI * fov / 360); // compute distance from card assuming vertical 

        if (caspect <= taspect) d *= (taspect / caspect); // use width to fit instead

        return [current, d];
    }

    dragPlane(rayCaster, p3e){
        if(!this._plane) {
            let normal = p3e.normal || p3e.lookNormal; // normal may not exist
            let offset = v3_dot(p3e.xyz, normal);
            this._plane = new THREE.Plane(new THREE.Vector3(...normal), -offset);
            this.lastDrag = p3e.xyz;
        }
        let p = new THREE.Vector3();
        rayCaster.ray.intersectPlane(this._plane, p);
        let here = p.toArray();
        let delta = v3_sub(this.lastDrag, here);
        this.lastDrag = here;
        this.setTranslation(v3_sub(this._translation, delta));
    }

    rotatePlane(rayCaster, p3e){
        if(!this._plane) {
            // first
            let normal = p3e.lookNormal;
            normal[1] = 0;
            let nsq = v3_sqrMag(normal);
            normal = v3_normalize(normal);
            let offset = v3_dot(p3e.xyz, normal);
            this._plane = new THREE.Plane(new THREE.Vector3(...normal), -offset);
            this.startDrag = p3e.xyz;
            this.baseRotation = this._rotation;
            this.rotAngle = 0;
        }
        let p = new THREE.Vector3();
        rayCaster.ray.intersectPlane(this._plane, p);
        let here = p.toArray();
        let delta = v3_sub(this.startDrag, here);
        delta[1] = 0;
        let angle = v3_magnitude(delta);
        let sign = v3_cross(p3e.lookNormal, delta)[1];
        if(sign < 0)angle = -angle;
        let qAngle = q_euler(0,angle,0);
        this.setRotation(q_multiply(this.baseRotation, qAngle));
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

    setRotation(q){
        this._rotation = q;
        this.onLocalChanged();
        this.say("setRotation", q);
    }

    updateRotation(q){
        if(!this._plane){ // only do this if you are not dragging
            this._rotation = q;
            this.onLocalChanged();
        }
    }
}

function addWire(obj3d) {
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
            
            mat.forEach(m=>{
                let c = m.color; 
                if(c && !m._oldColor) { // check for reused color
                    m._oldColor = c;
                    let gray = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) * 0.50;
                    m.color = new THREE.Color(gray, gray, gray);
                }
            })
            parts.push( obj );
        }
    });
    for(let i = 0; i < lines.length; i++){
        let line = lines[i];
        line.type = '_lineHighlight';
        parts[i].add(line);
    }
}

function removeWire(obj3d){
    let lines = [];
    let mat;
    obj3d.traverse((obj)=>{
        if(obj.type === '_lineHighlight') {
            lines.push(obj);
        } else if(obj.geometry) {
            mat = (Array.isArray(obj.material)) ? obj.material : [obj.material];
            //console.log("removeWire, material",mat);
            mat.forEach(m=>{ 
                if(m._oldColor) {
                    m.color = m._oldColor; 
                    m._oldColor = undefined;
                }
            });
        }
    });
    for(let i = 0; i < lines.length;i++) {
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
