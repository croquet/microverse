// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
//
// Collaborative Card Object

import { THREE, PM_ThreeVisible, Actor, Pawn, mix, AM_Predictive, PM_Predictive, Data, ModelService, ViewService,
    v3_dot, v3_cross, v3_sub, v3_normalize, v3_magnitude, v3_sqrMag,
    q_euler, q_multiply } from '@croquet/worldcore';
import { AM_PointerTarget, PM_PointerTarget } from './Pointer.js';
import { addShadows, normalizeSVG, addTexture } from './assetManager.js'
import { TextFieldActor } from './text/text.js';
import { DynamicTexture } from './DynamicTexture.js'
import { AM_Code, PM_Code } from './code.js';
import { EYE_HEIGHT } from './DAvatar.js';
import { WorldSaver } from './worldSaver.js';

// import { forEach } from 'jszip';

export const intrinsicProperties = ["translation", "scale", "rotation", "layers", "parent", "behaviorModules", "multiuser", "name", "noSave"];

//------------------------------------------------------------------------------------------
//-- CardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget, AM_Code) {
    // this should be in AM_SPATIAL but that would require changing Worldcore mixins
    static okayToIgnore() { return [ "$local", "$global" ]; }

    init(options) {
        let {cardOptions, cardData} = this.separateOptions(options);

        // coming from different mixins, but still used by listen.
        this.scriptListeners = new Map();
        super.init(cardOptions);
        this._cardData = cardData;
        this.noSave = options.noSave;
        this.createShape(cardData);
        this.listen("selectEdit", this.saySelectEdit);
        this.listen("unselectEdit", this.sayUnselectEdit);
        this.listen("setTranslation", this.setTranslation);
        this.listen("setRotation", this.setRotation);
        this.listen("showControls", this.showControls);
        this.listen("setCardData", this.setCardData);
    }

    separateOptions(options) {
        let cardOptions = {};
        let cardData = {};

        Object.keys(options).forEach((k) => {
            if (intrinsicProperties.indexOf(k) >= 0) {
                cardOptions[k] = options[k];
            } else {
                cardData[k] = options[k];
            }
        });
        return {cardOptions, cardData};
    }

    updateOptions(options) {
        let {cardOptions, cardData} = this.separateOptions(options);
        this.updateBehaviors(options);
        this.set({...cardOptions});
        this._cardData = cardData;

        this.say("updateShape", options);
    }

    updateBehaviors(options) {
        if (!options.behaviorModules) {return;}
        let behaviorManager = this.behaviorManager;


        let allNewActorBehaviors = [];
        let allNewPawnBehaviors = [];

        options.behaviorModules.forEach((moduleName) => {
            let module = behaviorManager.modules.get(moduleName);
            if (!module) {
                console.error(`unknown module ${moduleName} is specified for update`);
                return;
            }
            if (module.actorBehaviors) {
                allNewActorBehaviors.push(...module.actorBehaviors.values());
            }
            if (module.pawnBehaviors) {
                allNewPawnBehaviors.push(...module.pawnBehaviors.values());
            }
        });

        let allOldActorBehaviors = [];
        let allOldPawnBehaviors = [];

        let oldSystemModules = [];
        if (this._behaviorModules) {
            this._behaviorModules.forEach((oldModuleName) => {
                let oldModule = behaviorManager.modules.get(oldModuleName);
                if (oldModule.actorBehaviors) {
                    allOldActorBehaviors.push(...oldModule.actorBehaviors.values());
                }
                if (oldModule.pawnBehaviors) {
                    allOldPawnBehaviors.push(...oldModule.pawnBehaviors.values());
                }
                if (oldModule.systemModule) {
                    oldSystemModules.push(oldModule.externalName);
                    if (oldModule.actorBehaviors) {
                        allNewActorBehaviors.push(...oldModule.actorBehaviors.values());
                    }
                    if (oldModule.pawnBehaviors) {
                        allNewPawnBehaviors.push(...oldModule.pawnBehaviors.values());
                    }
                }
            });
        }

        allOldActorBehaviors.forEach((oldBehavior) => {
            if (!allNewActorBehaviors.includes(oldBehavior)) {
                behaviorManager.modelUnuse(this, oldBehavior);
            }
        });
        allOldPawnBehaviors.forEach((oldBehavior) => {
            if (!allNewPawnBehaviors.includes(oldBehavior)) {
                behaviorManager.viewUnuse(this, oldBehavior);
            }
        });

        allNewActorBehaviors.forEach((newBehavior) => {
            if (!allOldActorBehaviors.includes(newBehavior)) {
                behaviorManager.modelUse(this, newBehavior);
            }
        });
        allNewPawnBehaviors.forEach((newBehavior) => {
            if (!allOldPawnBehaviors.includes(newBehavior)) {
                behaviorManager.viewUse(this, newBehavior);
            }
        });

        this._behaviorModules = [...oldSystemModules, ...options.behaviorModules];
    }

    setCardData(options) {
        let newOptions = {...this._cardData, ...options};
        this.set({cardData: newOptions});
    }

    createShape(options) {
        let type = options.type;
        if (type === "text") {
            this.subscribe(this.id, "changed", "textChanged");
        } else if (type === "3d") {
            this.creationTime = this.now();
        } else if (type === "2d" || type === "2D" ) {
        } else if (type === "lighting") {
        } else if (type === "object") {
        } else if (type === "code") {
            this.subscribe(this.id, "changed", "textChanged");
            // this is a weird inter mixins dependency but not sure how to write it
            this.subscribe(this.id, "text", "codeAccepted");
        } else {
            console.log("unknown type for a card: ", options.type);
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
        return [this._cardData.textureWidth * uv[0],this._cardData.textureHeight * (1 - uv[1])];
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

    nop() {}

    duplicate() {
        let saver = new WorldSaver(CardActor);
        let data = saver.collectCardData(this);
        delete data.parent;
        let t = this.translation;

        data.translation = [t[0] + 2, t[1], t[2]];
        this.createCard(data);
    }

    showControls(toWhom) {
        let avatar = this.service("ActorManager").actors.get(toWhom.avatar);
        let distance = (toWhom.distance || 6);
        distance = Math.min(distance * 0.7, 4);
        if(avatar){
            let pose = avatar.dropPose(distance, [1, 0, 0]);
            if (!this.behaviorManager.modules.get("PropertySheet")) {return;}
            let menu = this.createCard({
                name: "property panel",
                behaviorModules: ["PropertySheet"],
                translation: pose.translation,
                rotation: pose.rotation,
                type: "object",
                fullBright: true,
                color: 0xffffff,
                frameColor: 0x666666,
                width: 2,
                height: 2.8,
                cornerRadius: 0.02,
                depth: 0.02,
                noSave: true,
                target: this.id,
            });
            menu.call("PropertySheet$PropertySheetActor", "setObject", this);
        }
    }

    setBehaviors(selection) {
        let behaviorModules = [];

        selection.forEach((obj) => {
            let {label, selected} = obj;
            if (this.behaviorManager.modules.get(label)) {
                if (selected) {
                    behaviorModules.push(label);
                }
            }
        });
        this.updateBehaviors({behaviorModules});
    }

    setCardSpec(data) {
        console.log(data);
    }

    intrinsicProperties() {return intrinsicProperties;}

    saySelectEdit() {
        this.say("doSelectEdit");
    }

    sayUnselectEdit() {
        this.say("doUnselectEdit");
    }

    collectCardData() {
        let saver = new WorldSaver(CardActor);
        return saver.collectCardData(this, true);
    }

    static load(array, world, version) {
        // it is supposed to load a JSONable structure from array, but a special case is made
        // for the parent property where you can give an actual object
        if (version === "1") {
            let appManager = world.service("DynaverseAppManager");
            let behaviorManager = world.service("BehaviorModelManager");
            let map = new Map();
            return array.map(({id, card}) => {
                let Cls;
                let options = {...card};
                let behavior;
                if (options.type === "code") {
                    if (options.behaviorModule) {
                        let [moduleName, behaviorName] = options.behaviorModule.split(".");
                        behavior = behaviorManager.lookup(moduleName, behaviorName);
                    }

                    let runs = [{text: behavior ? behavior.code : ""}];

                    options = {...options, ...{
                        isSticky: false,
                        backgroundColor: 0xFFFFFF,
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
                    if (typeof card.parent !== "object") {
                        let parent = map.get(card.parent);
                        options.parent = parent;
                    }
                }

                if (Array.isArray(card.rotation) && card.rotation.length === 3) {
                    options.rotation = q_euler(...card.rotation);
                }

                if (Array.isArray(card.dataRotation) && card.dataRotation.length === 3) {
                    options.dataRotation = q_euler(...card.dataRotation);
                }

                let actor = Cls.create(options);
                if (id) {
                    map.set(id, actor);
                }

                if (options.type === "code" && behavior) {
                    actor.subscribe(behavior.id, "setCode", "loadAndReset");
                }
                return actor;
            });
        }
        return [];
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
        this.addEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.listen("doSelectEdit", this.doSelectEdit);
        this.listen("doUnselectEdit", this.doUnselectEdit);
        this.listen("updateTranslation", this.updateTranslation);
        this.listen("updateRotation", this.updateRotation);
        this.listen("_cardData", this.cardDataUpdated);
        this.listen("updateShape", this.updateShape);
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
        let type = options.type;
        if (type === "3d" || type === "3D") {
            this.construct3D(options);
        } else if (type === "2d" || type === "2D") {
            this.isFlat = true;
            this.construct2D(options);
        }  else if (type === "text" || type === "code") {
            this.isFlat = true;
        } else if (type === "lighting") {
            // this.constructLighting(options);
        }
    }

    ensureColliderObject() {
        if (!this.colliderObject) {
            let collider = new THREE.Group();
            this.setColliderObject(collider);
        }
    }

    cleanupColliderObject() {
        if (this.colliderObject) {
            this.colliderObject.children.forEach((m) => {
                this.colliderObject.remove(m);
            });
            if (this.colliderObject.geometry) {
                this.colliderObject.geometry.dispose();
            }
            delete this.colliderObject;
        }
    }

    cleanupShape(_options) {
        let oldLayers = this.layers();
        let toRemove = [];
        oldLayers.forEach((layerName) => {
            if (!this.actor.layers.includes(layerName)) {
                toRemove.push(layerName);
            }
        });
        if (toRemove.length > 0) {
            this.removeFromLayers(...toRemove);
        }
        this.addToLayers(this.actor._layers);

        delete this.isFlat;

        if (this.placeholder) {
            this.placeholder.children.forEach((m) => {
                m.geometry.dispose();
                m.material.dispose();
            });
            this.shape.remove(this.placeholder);
            delete this.placeholder;
        }

        delete this.video;
        if (this.texture) {
            this.texture.dispose();
            delete this.texture;
        }

        if (this.objectURL) {
            URL.revokeObjectURL(this.objectURL);
            delete this.objectURL;
        }

        if (Array.isArray(this.material)) {
            this.material.forEach((m) => m.dispose());
        } else if (this.material) {
            this.material.dispose();
        }

        delete this.name;
        delete this.properties2D;
        delete this.animationSpec;

        this.cleanupColliderObject();

        if (this.shape) {
            this.shape.traverse((m) => {
                // the idea here is that any data that should be disposed should be
                // already accounted for.
                if (m === this.shape) {return;}

                if (m.geometry) {
                    m.geometry.dispose();
                }
                if (Array.isArray(m.material)) {
                    m.material.forEach((mm) => mm.dispose());
                } else if (m.material) {
                    m.material.dispose();
                }
            });
            this.shape.children.forEach((m) => this.shape.remove(m));
        }
    }

    updateShape(options) {
        this.cleanupShape(options);
        this.constructShape(this.actor._cardData);
    }

    construct3D(options) {
        let model3d = options.dataLocation;
        let modelType = options.modelType;

        /* this is really a hack to make it work with the current model. */
        if (options.placeholder) {
            let size = options.placeholderSize || [40, 1, 40];
            let color = options.placeholderColor || 0x808080;
            let offset = options.placeholderOffset || [0, -0.065, 0];

            let psGeometry = new THREE.BoxGeometry(...size);
            let psMaterial = new THREE.ShadowMaterial({color: 0x404040, opacity: 0.5, side: THREE.DoubleSide});

            let pGeometry = new THREE.BoxGeometry(...size);
            let pMaterial = new THREE.MeshBasicMaterial({color: color, side: THREE.DoubleSide});

            this.placeholder = new THREE.Group();

            let shadowMesh = new THREE.Mesh(psGeometry, psMaterial);
            shadowMesh.receiveShadow = true;
            this.placeholder.add(shadowMesh);

            let boxMesh = new THREE.Mesh(pGeometry, pMaterial);
            this.placeholder.add(boxMesh);
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
            addShadows(obj, shadow, singleSided, THREE);
            this.setupObj(obj, options);
            obj.updateMatrixWorld(true);
            if (obj._croquetAnimation) {
                const spec = obj._croquetAnimation;
                spec.startTime = this.actor.creationTime;
                this.animationSpec = spec;
                this.future(500).runAnimation();
            }

            if (this.actor.layers.indexOf('walk') >= 0) {
                this.constructCollider(obj);
            }

            // place this after collider construction
            // or collider incorporates shape transform
            this.shape.add(obj);

            if (name) {
                obj.name = name;
            }
            if (options.placeholder) {
                // console.log("need to delete collider for boxmesh");
                this.shape.remove(this.placeholder);
            }
        });
    }

    construct2D(options) {
        let dataLocation = options.dataLocation;
        let textureLocation = options.textureLocation;
        let textureType = options.textureType;

        let texturePromise; // resolves to texture and width and height

        let depth = (options.depth !== undefined) ? options.depth : 0.05;
        let width = (options.width !== undefined) ? options.width : 1;
        let height = (options.height !== undefined) ? options.height : 1;
        let textureWidth = (options.textureWidth !== undefined) ? options.textureWidth : 512;
        let textureHeight = (options.textureHeight !== undefined) ? options.textureHeight : 512;

        let name = options.name || this.id;
        let color = options.color || 0xFFFFFF;
        let frameColor = options.frameColor || 0x666666;
        let fullBright = options.fullBright !== undefined ? options.fullBright : false;
        let shadow = options.shadow !== undefined ? options.shadow : true;
        let cornerRadius = options.cornerRadius !== undefined ? options.cornerRadius : 0;

        this.properties2D = {depth, width, height, textureWidth, textureHeight, name, color, frameColor, fullBright, shadow, cornerRadius};

        // You might want to parallelize the texture data loading and svg data loading by arranging
        // promises cleverly, but this.texture should be set quite early
        // (that is before returning from this method) to have apps like multiblaster function

        if (textureType === "video") {
            this.video = document.createElement('video');
            this.video.autoplay = true;
            this.video.muted = true;
            this.video.loop = true;
            this.video.width = textureWidth;
            this.video.height = textureHeight;

            this.getBuffer(textureLocation).then((buffer) => {
                let objectURL = URL.createObjectURL(new Blob([buffer], {type: "video/mp4"}));
                this.video.src = objectURL;
                this.objectURL = objectURL;
                // need to be revoked when destroyed
            });
            this.video.loop = true;
            let videoService = this.service("VideoManager");
            videoService.add(this.video);
            this.texture = new THREE.VideoTexture(this.video);
            texturePromise = Promise.resolve({
                width: this.video.width,
                height: this.video.height,
                texture: this.texture
            });
        } else if (textureType === "image") {
            texturePromise = this.getBuffer(textureLocation).then((buffer) => {
                let objectURL = URL.createObjectURL(new Blob([buffer]));
                this.objectURL = objectURL;
                return new Promise((resolve, reject) => {
                    this.texture = new THREE.TextureLoader().load(
                        objectURL,
                        (texture) => {
                            resolve({width: texture.image.width, height: texture.image.height, texture})
                        }, null, reject);
                });
            });
        } else if (textureType === "canvas") {
            this.canvas = document.createElement("canvas");
            this.canvas.id = name;
            this.canvas.width = textureWidth;
            this.canvas.height = textureHeight;
            this.texture = new THREE.CanvasTexture(this.canvas);
            texturePromise = Promise.resolve({width: textureWidth, height: textureHeight, texture: this.texture});
        } else if (textureType === "dynamic") {
            this.dynamic = new DynamicTexture(textureWidth, textureHeight, options.fillStyle, options.clearStyle);
            this.texture = this.dynamic.texture;
            texturePromise = Promise.resolve({width: textureWidth, height: textureHeight, texture: this.texture});
        }

        if (!texturePromise) {texturePromise = Promise.resolve(undefined);}

        let loadOptions = {
            texture: this.texture,
            color,
            frameColor,
            fullBright,
            shadow,
            depth,
        };

        let assetManager = this.service("AssetManager").assetManager;

        if (dataLocation) {
            return this.getBuffer(dataLocation).then((buffer) => {
                return assetManager.load(buffer, "svg", THREE, loadOptions);
            }).then((obj) => {
                normalizeSVG(obj, depth, shadow, THREE);
                return obj;
            }).then((obj) => {
                if (this.texture) {
                    addTexture(obj, this.texture);
                }
                if (options.dataTranslation) {
                    obj.position.set(...options.dataTranslation);
                }
                obj.name = "2d";
                this.shape.add(obj);
            });
        } else {
            return texturePromise.then((textureObj) => {
                if (textureObj && textureObj.texture) {
                    textureWidth = textureObj.width;
                    textureHeight = textureObj.height;
                    let max = Math.max(textureWidth, textureHeight);
                    let scale = 1 / max;
                    width = textureWidth * scale;
                    height = textureHeight * scale;

                    this.properties2D = {...this.properties2D, ...{width, height, textureWidth, textureHeight}};
                }

                let geometry = this.roundedCornerGeometry(width, height, depth, cornerRadius);
                let material = this.makePlaneMaterial(depth, color, frameColor, fullBright);

                if (this.texture) {
                    material[0].map = this.texture;
                }

                this.material = material;
                let obj = new THREE.Mesh(geometry, material);
                obj.castShadow = shadow;
                obj.name = "2d";
                this.shape.add(obj);
            });
        }
    }

    constructCollider(obj) {
        let geometries = [];
        this.ensureColliderObject();

        obj.traverse(c =>{
            if(c.geometry){
                let cloned = c.geometry.clone();
                cloned.applyMatrix4( c.matrixWorld );
                for( const key in cloned.attributes) {
                    if (key !== "position") {
                        cloned.deleteAttribute(key);
                    }
                }
                geometries.push( cloned );
            }
        });

        let BufferGeometryUtils = window.THREE.BufferGeometryUtils;
        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries( geometries, false);
        let TRM = this.service("ThreeRenderManager");
        mergedGeometry.boundsTree = new TRM.MeshBVH( mergedGeometry, { lazyGeneration: false } );
        let collider = new THREE.Mesh( mergedGeometry );
        collider.material.wireframe = true;
        collider.material.opacity = 0.5;
        //collider.material.transparent = true;
        collider.matrixWorld = obj.matrixWorld.clone();
        collider.updateMatrixWorld(true);
        collider.visible = false;
        this.colliderObject.add(collider);

        /*
          let visualizer = new TRM.MeshBVHVisualizer( collider, 10 );
          visualizer.visible = true;

          this.shape.parent.add(visualizer)
        */
    }

    constructLighting(options) {
        console.log( "constructLighting", options.dataLocation );
        let assetManager = this.service("AssetManager").assetManager;
        if (options.dataLocation) {
            let dataType = options.dataLocation.split('.').pop().toLowerCase();
            options.dataType = dataType;
            return this.getBuffer(options.dataLocation).then((buffer) => {
                return assetManager.load(buffer, dataType, THREE, options).then((texture) => {
                    let TRM = this.service("ThreeRenderManager");
                    let renderer = TRM.renderer;
                    let scene = TRM.scene;
                    let pmremGenerator = new THREE.PMREMGenerator(renderer);
                    pmremGenerator.compileEquirectangularShader();

                    let exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
                    let exrBackground = exrCubeRenderTarget.texture;


                    let bg = scene.background;
                    let e = scene.environment;
                    scene.background = exrBackground;
                    scene.environment = exrBackground;
                    if(e !== bg) if(bg) bg.dispose();
                    if(e) e.dispose();
                    texture.dispose();
                });
            });
        }
    }

    setupObj(obj, options) {
        if (options.dataScale) {
            obj.scale.set(...options.dataScale);
        } else {
            let size = new THREE.Vector3(0, 0, 0);
            new THREE.Box3().setFromObject(obj).getSize(size);
            let max = Math.max(size.x, size.y, size.z);
            let s = 4 / max;
            obj.scale.set(s, s, s);
        }
        if (options.dataTranslation) {
            obj.position.set(...options.dataTranslation);
        }
        if (options.dataRotation) {
            obj.quaternion.set(...options.dataRotation);
        }
    }

    roundedCornerGeometry(width, height, depth, cornerRadius) {
        let x = - width / 2;
        let y = - height / 2;
        let radius = cornerRadius === undefined ? 0 : cornerRadius;

        let shape = new THREE.Shape();
        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + height - radius);
        shape.quadraticCurveTo(x, y + height, x + radius, y + height);
        shape.lineTo(x + width - radius, y + height);
        shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
        shape.lineTo(x + width, y + radius);
        shape.quadraticCurveTo(x + width, y, x + width - radius, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo( x, y, x, y + radius);

        let geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false});
        geometry.parameters.width = width;
        geometry.parameters.height = height;
        geometry.parameters.depth = depth;

        let normalizeUV = (uvArray, bb) => {
            let s = [bb.max.x - bb.min.x, bb.max.y - bb.min.y];
            s[0] = s[0] > 0 ? 1 / s[0] : 1;
            s[1] = s[1] > 0 ? -1 / s[1] : -1;
            let o = [bb.min.x, -bb.min.y];
            let index = 0;
            for(let i = 0; i < uvArray.length; i++) {
                uvArray[i] = (uvArray[i] - o[index]) * s[index];
                if (index) uvArray[i] = 1 - uvArray[i];
                index = index === 0 ? 1 : 0;
            }
        };

        let boundingBox = new THREE.Box3(
            new THREE.Vector3(-width / 2, -height / 2, -depth / 2),
            new THREE.Vector3(width / 2, height / 2, depth / 2));

        let uv = geometry.getAttribute('uv');
        normalizeUV(uv.array, boundingBox);
        return geometry;
    }

    makePlaneMaterial(depth, color, frameColor, fullBright) {
        if (Array.isArray(this.material)) {
            this.material.forEach((m) => m.dispose());
        } else if (this.material) {
            this.material.dispose();
        }

        let material;
        if (!fullBright) {
            material = new THREE.MeshStandardMaterial({color, side: THREE.DoubleSide});
        } else {
            material = new THREE.MeshBasicMaterial({color, side: THREE.DoubleSide/*, emissive: color*/});
        }

        if (depth > 0) {
            let second;
            second = new THREE.MeshStandardMaterial({color: frameColor, side: THREE.DoubleSide, metalness:1.0});
            material = [material, second ];
        }

        this.material = material;
        return material;
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

    cardDataUpdated(data) {
        if (data.v.targetURL) debugger;
        // it might be independently implemented in a behavior, and independently subscribed

        if (this.actor._cardData.type !== "2d") {return;}
        let obj = this.shape.children.find((o) => o.name === "2d");
        if (!obj || !obj.children || obj.children === 0) {return;}
        obj = obj.children[0];
        if (data.o.color !== data.v.color || data.o.frameColor !== data.v.frameColor ||
            data.o.depth !== data.v.depth || data.o.height !== data.v.height ||
            data.o.width !== data.v.width || data.o.cornerRadius !== data.v.cornerRadius ||
            data.o.fullBright !== data.v.fullBright) {
            let {depth, width, height, color, frameColor, cornerRadius, fullBright} = data.v;

            depth = (depth !== undefined) ? depth : 0.05;
            width = (width !== undefined) ? width : 1;
            height = (height !== undefined) ? height : 1;
            color = color || 0xFFFFFF;
            frameColor = frameColor || 0x666666;
            cornerRadius = cornerRadius !== undefined ? cornerRadius : 0;
            fullBright = fullBright !== undefined ? fullBright : false;

            let material = this.makePlaneMaterial(depth, color, frameColor, fullBright);

            if (data.o.depth !== data.v.depth || data.o.height !== data.v.height ||
                data.o.width !== data.v.width || data.o.cornerRadius !== data.v.cornerRadius) {
                let geometry = this.roundedCornerGeometry(width, height, depth, cornerRadius)
                obj.geometry = geometry;
            }
            obj.material = material;
        }
    }

    uv2xy(uv) {
        return this.actor.uv2xy(uv);
    }

    world2local(xyz){
        return this.shape.worldToLocal(new THREE.Vector3(...xyz)).toArray();
    }

    get width() {
        return this.actor.width;
    }
    get height() {
        return this.actor.height;
    }

    onFocus(_pointerId) {
        console.log("focused")
    }

    onFocusFailure(_pointerId) {
        console.log("already focused by another avatar")
    }

    onBlur(_pointerId) {
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

    onPointerDoubleDown(pe) {
        if (!pe.targetId) {return;}
        let pose = this.getJumpToPose ? this.getJumpToPose() : undefined;
        if (pose) {
            pe.xyz = pose[0]; // world coordinates
            pe.offset = pose[1]; // distance from target
        } else {
            pe.offset = EYE_HEIGHT;
        }
        this.publish(pe.pointerId, "goThere", pe);
    }

    showControls(actorId){
        console.log("Pawn showControls", actorId)
        this.say("showControls", actorId);
    }

    setColor(color) {
        this.say("setCardData", {color});
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

        let d, h;
        if (taspect < 1) {
            // w = size.y * taspect;
            h = size.y;
        } else {
            // w = size.z;
            h = size.z / taspect;
        }

        d = (h / 2) / Math.tan(Math.PI * fov / 360); // compute distance from card assuming vertical

        if (caspect <= taspect) d *= (taspect / caspect); // use width to fit instead

        return [current, d * 1.1];
    }

    verticalNorm(norm){
        let normal = [...norm];
        normal[1] = 0;

        let nsq = v3_sqrMag(normal);
        if(nsq < 0.001){
            normal[0] = 0;
            normal[1] = norm[1];
            normal[2] = 0;
        }
        return v3_normalize(normal);
    }

    dragPlane(rayCaster, p3e){
        // XYZZY the flamingo does not follow the cursor when dragging in the plane.
        if(!this._plane) {
            let normal = p3e.normal || p3e.lookNormal; // normal may not exist
            normal = this.verticalNorm( normal );

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
            // let nsq = v3_sqrMag(normal);
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
            this.addWire(this.renderObject);
        }
    }

    doUnselectEdit(){
        console.log("doUnselectEdit")
        if(this.renderObject){
            this.removeWire(this.renderObject);
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
    nop() {}

    addWire(obj3d) {
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

    removeWire(obj3d) {
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
}

export class DynaverseAppManager extends ModelService {
    init(_options) {
        super.init("DynaverseAppManager");
        // this.$apps = options.registry; // new Map() {[name]: cls}
    }

    add(_cls) {
        // this.set(cls.name, cls);
    }
    set(_name, _cls) {
        // this.$apps.set(name, cls);
    }
    get(name) {
        // return this.$apps.get(name);
        let classes = this.constructor.allClasses();
        for (let i = 0; i < classes.length; i++) {
            if (classes[i].name === name) {
                return classes[i];
            }
        }
        return null;
    }
    delete(_name) {
        // return this.$apps.delete(name);
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
