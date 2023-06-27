// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
//
// Collaborative Card Object

import {
    Data, Constants, // re-exported from @croquet/croquet
    Actor, Pawn, ModelService, mix, AM_Smoothed, PM_Smoothed, GetPawn,
    v3_dot, v3_cross, v3_sub, v3_add, v3_normalize, v3_magnitude, v3_sqrMag, v3_transform, v3_rotate,
    q_euler, q_multiply,
    m4_invert, m4_identity
} from './worldcore';
import { THREE, THREE_MESH_BVH, PM_ThreeVisible } from './ThreeRender.js';
import { AM_PointerTarget, PM_PointerTarget } from './Pointer.js';
import { addMeshProperties, normalizeSVG, addTexture, toIndexed } from './assetManager.js'
import { TextFieldActor } from './text/text.js';
import { DynamicTexture } from './DynamicTexture.js'
import { AM_Code, PM_Code } from './code.js';
import { WorldSaver } from './worldSaver.js';

// import { forEach } from 'jszip';

const { MeshBVH, /*MeshBVHVisualizer*/ } = THREE_MESH_BVH;

export const intrinsicProperties = ["translation", "scale", "rotation", "layers", "parent", "behaviorModules", "name", "noSave", "hidden"];


//------------------------------------------------------------------------------------------
//-- CardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardActor extends mix(Actor).with(AM_Smoothed, AM_PointerTarget, AM_Code) {
    static okayToIgnore() { return [ "$local", "$global", "$rigidBody" ]; }

    init(options) {
        let {cardOptions, cardData} = this.separateOptions(options);

        if (!cardOptions.layers) {cardOptions.layers = ["pointer"];}

        // coming from different mixins, but still used by listen.
        this.scriptListeners = new Map();
        super.init(cardOptions);
        this._cardData = cardData;
        this.noSave = options.noSave;
        if (cardOptions.hidden) {
            this._hidden = cardOptions.hidden;
        }
        this.createShape(cardData);
        this.listen("selectEdit", this.saySelectEdit);
        this.listen("unselectEdit", this.sayUnselectEdit);
        this.listen("showControls", this.showControls);
        this.listen("setCardData", this.setCardData);

        // this.listen("dataScaleComputed", this.dataScaleComputed);
        this.listen("setAnimationClipIndex", this.setAnimationClipIndex);
    }

    destroy() {
        this.publish("actorManager", "destroyed", this.id);
        super.destroy();
    }

    separateOptions(options) {
        // options are either intrinsic or non-intrinsic. We store non-intrinsic values in _cardData.
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
        // fully override the _cardData with given variable (keys that are not in options will be deleted.
        // console.log("updateOptions", options);
        let {cardOptions, cardData} = this.separateOptions(options);
        this.updateBehaviors(options);
        this.set({...cardOptions});
        this.set({cardData: cardData});
        this.say("updateShape", options);
    }

    addBehaviorModule(moduleName) {
        let behaviorModules;
        if (!this._behaviorModules) {
            behaviorModules = [moduleName];
        } else if (this._behaviorModules.includes(moduleName)) {
            return;
        } else {
            behaviorModules = [...this._behaviorModules, moduleName];
        }
        this.updateBehaviors({behaviorModules});
    }

    removeBehaviorModule(moduleName) {
        let behaviorModules;
        if (!this._behaviorModules) {return;}
        let index = this._behaviorModules.indexOf(moduleName);
        if (index < 0) {return;}
        behaviorModules = [...this._behaviorModules];
        behaviorModules.splice(index, 1);
        this.updateBehaviors({behaviorModules});
    }

    updateBehaviors(options) {
        // we need to call teardown and setup for behaviors removed or added;
        // so we need to keep track of changes from the previous state.
        // also, since non-system modules can depend on system modules, we ensure that
        // system modules appear first in the behavior order even if added later.

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

    addLayer(newLayerName) {
        if (this._layers && this._layers.includes(newLayerName)) {return;}
        this.set({layers: [...(this._layers || []), newLayerName]});
    }

    removeLayer(layerName) {
        if (!this._layers.includes(layerName)) {return;}
        this._layers = this._layers.filter((layer) => layer !== layerName);
    }

    setCardData(options) {
        let newOptions = {...this._cardData, ...options};
        this.set({cardData: newOptions});
        this.updateBehaviors(options);
        // this line below should be good, except that right now it fails some objects.
        // this.say("updateShape", options);
    }

    createShape(options) {
        let type = options.type;
        if (type === "text") {
            this.subscribe(this.id, "changed", "textChanged");
        } else if (type === "code") {
            this.subscribe(this.id, "changed", "textChanged");
            // this is a weird inter mixins dependency but not sure how to write it
            this.subscribe(this.id, "text", "codeAccepted");
        } else if (type === "3d" || type === "3D") {
            if (this._cardData.animationClipIndex !== undefined && this._cardData.animationStartTime === undefined) {
                this._cardData.animationStartTime = this.now();
            }
        } else if (type === "2d" || type === "2D" ) {
        } else if (type === "lighting") {
        } else if (type === "object" || type === "initial") {
        } else {
            console.log("unknown type for a card: ", options.type);
        }
    }

    get pawn() { return CardPawn; }
    get layers() { return this._layers; }
    get isCard() {return true;}
    get name() {return this._name || 'Card'}
    get color() {return this._color || 0xffffff}

    uv2xy(uv) {
        return [this._cardData.textureWidth * uv[0], this._cardData.textureHeight * (1 - uv[1])];
    }

    /*
    dataScaleComputed(s) {
        // when a 3D model is loaded, it automatically computes dataScale on the view side.
        // the value is transmitted to the model. (potentially multiple times).
        if (s === undefined) {
            delete this._cardData.dataScale;
        } else {
            this._cardData.dataScale = s;
        }
    }
    */

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

    rotateTo(rotation) {
        // rotation is either a 3 value array, a 4 value array, or a number.
        // if it is a 3-value array, it is interpreted as an euler angle.
        // if it is a 4-value array, it is interpreted as a quaternion.
        // if it is a number, it is interpreted as [0, rotation, 0].
        if (typeof rotation === "number") rotation = [0, rotation, 0];
        let q = rotation.length === 3 ? q_euler(...rotation) : rotation;
        return super.rotateTo(q);
    }

    rotateBy(amount) {
        // amount is either a 3 value array, a 4 value array, or a number.
        // if it is a 3-value array, it is interpreted as an euler angle.
        // if it is a 4-value array, it is interpreted as a quaternion.
        // if it is a number, it is interpreted as [0, amount, 0].
        if (typeof amount === "number") amount = [0, amount, 0];
        let q = amount.length === 3 ? q_euler(...amount) : amount;
        let newQ = q_multiply(this.rotation, q);
        super.rotateTo(newQ);
    }

    translateTo(pos) {
        // pos is a 3 value array that represents the new xyz position
        return super.translateTo(pos);
    }

    translateBy(dist) {
        // dist is a 3-value array.
        let t = this.translation;
        super.translateTo([t[0] + dist[0], t[1] + dist[1], t[2] + dist[2]]);
    }

    forwardBy(dist) {
        // dist is either a 3-value array or a number.
        // if it is a 3-value array, it specifies the offset, in the reference frame of the receiver.
        // if it is a number, it is interpreted as [0, 0, dist] to be the offset, in the reference frame of the receiver.
        let offset = Array.isArray(dist) ? dist : [0, 0, dist];
        let vec = v3_rotate(offset, this.rotation)
        let t = this.translation;
        super.translateTo([t[0] + vec[0], t[1] + vec[1], t[2] + vec[2]]);
    }

    scaleTo(factor) {
        // factor is either a 3-value array or a number.
        // if it is a 3-value array, it specifies the difference.
        // if it is a number, it is interpreted as [factor, factor, factor].
        let scale = Array.isArray(factor) ? factor : [factor, factor, factor];
        super.scaleTo(scale);
    }

    scaleBy(factor) {
        // factor is either a 3-value array or a number.
        // if it is a 3-value array, it specifies the difference.
        // if it is a number, it is interpreted as [factor, factor, factor].
        let offset = Array.isArray(factor) ? factor : [factor, factor, factor];
        let cur = this.scale;
        super.scaleTo([cur[0] + offset[0], cur[1] + offset[1], cur[2] + offset[2]]);
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

    saveCard(data) {
        this.say("saveCard", data);
    }

    allChildrenMap(cards) {
        if (!cards) {cards = new Map();}
        if (!this.noSave) {
            cards.set(this.id, this);
        }
        if (this.children) {
            this.children.forEach(c => c.allChildrenMap(cards));
        }
        return cards;
    }

    showControls(toWhom) {
        // it creates a property sheet, when a module called "PropertySheet" is loaded.
        let avatar = this.service("ActorManager").actors.get(toWhom.avatar);
        let distance = (toWhom.distance || 6);
        distance = Math.min(distance * 0.7, 4);
        if (avatar) {
            let pose = avatar.dropPose(distance, [1, 1, 0]);
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
                width: 3,
                height: 3.2,
                cornerRadius: 0.02,
                depth: 0.02,
                noSave: true,
                target: this.id,
            });
            menu.call("PropertySheet$PropertySheetActor", "setObject", this);
        }
    }

    setAnimationClipIndex(animationClipIndex) {
        // called when a view loads a 3D model and detects that it has animation clips.
        this._cardData.animationClipIndex = animationClipIndex;
        if (this._cardData.animationStartTime === undefined) this._cardData.animationStartTime = this.now();
        this.say("animationStateChanged");
    }

    intrinsicProperties() {return intrinsicProperties;}

    saySelectEdit(editBox) {
        this.editBox = editBox; // used only by the pedestal
        this.say("doSelectEdit");
    }

    sayUnselectEdit() {
        this.say("doUnselectEdit");
    }

    collectCardData() {
        let saver = new WorldSaver(CardActor);
        return saver.collectCardData(this, true);
    }

    static load(cards, world, version) {
        let array;
        let nameMap;
        if (Array.isArray(cards)) {
            array = cards;
        } else {
            array = cards.array;
            nameMap = cards.nameMap;
        }
        // it is supposed to load a JSONable structure from array, but a special case is made
        // for the parent property where you can give an actual object
        if (version === "1") {
            let appManager = world.service("MicroverseAppManager");
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

                    options = {
                        backgroundColor: 0xcccccc,
                        textScale: options.textScale || 0.002,
                        ...options,
                        runs: runs,
                    };
                    Cls = TextFieldActor;
                } else if (card.type === "text") {
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

                if (nameMap) {
                    if (options.behaviorModules) {
                        options.behaviorModules = options.behaviorModules.map((n) => nameMap.get(n) || n);
                    }
                }

                // this should not happen but so far we have not found the cause.
                if (typeof options.parent === "string") {
                    console.log("encountered parent as string", options.parent);
                    delete options.parent;
                }

                let actor = Cls.create(options);
                if (id) {
                    map.set(id, actor);
                }

                if (options.type === "code" && behavior) {
                    actor.subscribe(behavior.id, "setCode", "loadAndReset");
                }

                actor.initBehaviors(options);

                return actor;
            });
        }
        return [];
    }

    get rigidBody() {
        // the API changed from rapier 0.7.6 to 0.9.0, but we do not want to load two versions of Rapier engines.
        // The old session with Rapier 0.7.6 will still load with the stubbed out versions of behaviors/croquet/rapier.js.
        // but the simulation in such a session won't run anymore.
        if (this._oldRapier07) {
            return {applyForce: () => undefined, applyTorque: () => undefined};
        }
        return this.call("Physics$PhysicsActor", "getRigidBody");
    }

    setPhysicsWorld(v) {
        this._physicsWorld = v;
        return v;
    }

    get physicsWorld() {
        let manager = this.service("PhysicsManager");
        if (manager.globalWorld) {return manager.globalWorld;}
        if (this._physicsWorld) {return this._physicsWorld;}
        if (this._parent) {return this._parent._physicsWorld;}
        return undefined;
    }

    collisionEvent(rb1, rb2, started) {
        return this.call(this.collisionEventHandlerBehavior, this.collisionEventHandlerMethod, rb1, rb2, started);
    }

    getTextFieldActorClass() {
        return TextFieldActor;
    }

    get hidden() { return !!this._hidden; }
    set hidden(hidden) { this._hidden = hidden; }
}
CardActor.register('CardActor');

//------------------------------------------------------------------------------------------
//-- CardPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class CardPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_PointerTarget, PM_Code) {
    constructor(actor) {
        super(actor);
        this.addToLayers(...actor.layers);
        //this.addEventListener("pointerWheel", "onPointerWheel");
        this.addEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.listen("doSelectEdit", this.doSelectEdit);
        this.listen("doUnselectEdit", this.doUnselectEdit);
        this.listen("cardDataSet", this.cardDataUpdated);
        this.listen("updateShape", this.updateShape);
        this.listen("layersSet", this.updateLayers);

        this.listen("saveCard", this.saveCard);
        this.listen("animationStateChanged", this.tryStartAnimation);
        this.animationInterval = null;
        this.subscribe(this.id, "3dModelLoaded", this.tryStartAnimation);

        this.listen("hiddenSet", this.onHiddenSet);
        
        this.constructCard();
    }

    sayDeck(message, vars) {
        if (this.actor._parent !== undefined) this.publish(this.actor._parent.id, message, vars);
        else this.publish(this.actor.id, message, vars);
    }

    listenDeck(message, method) {
        if (this.actor._parent !== undefined) this.subscribe(this.actor._parent.id, message, method);
        else this.subscribe(this.actor.id, message, method);
    }

    constructCard() {
        this.shape = new THREE.Group()
        this.shape.name = this.actor.name;
        this.setRenderObject(this.shape);
        this.constructShape(this.actor._cardData);
        if (this.actor.hidden) {
            this.onHiddenSet({v: this.actor.hidden});
        }
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

    destroy() {
        let cardData = this.actor._cardData;
        let assetManager = this.service("AssetManager").assetManager;
        if (cardData.dataLocation) {
            assetManager.revoke(cardData.dataLocation, this.id);
        }
        if (cardData.textureLocation) {
            assetManager.revoke(cardData.textureLocation, this.id);
        }
        this.cleanupColliderObject();
        super.destroy();
    }

    ensureColliderObject() {
        if (!this.colliderObject) {
            let collider = new THREE.Group();
            this.setColliderObject(collider);
            collider.collider = true;
        }
    }

    cleanupColliderObject() {
        if (this.colliderObject) {
            [...this.colliderObject.children].forEach((m) => {
                if (m.geometry) {
                    m.geometry.dispose();
                    this.colliderObject.remove(m);
                }
            });
            if (this.colliderObject.geometry) {
                this.colliderObject.geometry.dispose();
            }
            this.colliderObject.removeFromParent();
            delete this.colliderObject;
        }
    }

    updateLayers() {
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
        let origLayers = this.actor._layers;
        if (origLayers) {
            this.addToLayers(...origLayers);
        }
    }

    cleanupShape(_options) {
        this.updateLayers();
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

        if (this.material) {
            this.material.dispose();
        }

        delete this.name;
        delete this.properties2D;
        delete this.animationSpec;

        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }

        this.cleanupColliderObject();

        if (this.shape) {
            this.shape.traverse((m) => {
                // the idea here is that any data that should be disposed should be
                // already accounted for.
                if (m === this.shape) {return;}

                if (m.geometry) {
                    m.geometry.dispose();
                }
                if (m.material) {
                    if (m.material.dispose) {
                        m.material.dispose();
                    } else {
                        m.material.forEach((mm) => mm.dispose());
                    }
                }
            });
            [...this.shape.children].forEach((m) => this.shape.remove(m));
        }
    }

    updateShape(options) {
        this.cleanupShape(options);
        this.constructShape(this.actor._cardData);
    }

    construct3D(options) {
        let assetManager = this.service("AssetManager").assetManager;
        let model3d = options.dataLocation;
        let modelType = options.modelType;
        if (!modelType && model3d) {
            let lastDot = model3d.lastIndexOf(".");
            if (lastDot > 0) {
                let suffix = model3d.slice(lastDot + 1);
                if (assetManager.supportedFileTypes.has(suffix)) {
                    modelType = suffix;
                }
            }
        }

        let publishLoaded = () => {
            this.publish(this.id, "3dModelLoaded");
            if (this.actor._cardData.loadSynchronously) {
                this.publish(this.sessionId, "synchronousCardLoaded", {id: this.actor.id});
            }
        };

        /* this is really a hack to make it work with the current model. */
        if (options.placeholder) {
            let size = options.placeholderSize || [40, 1, 40];
            let color = options.placeholderColor || 0x808080;
            let offset = options.placeholderOffset || [0, -1.7, 0];

            const gridImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOnAAADusBZ+q87AAAAJtJREFUeJzt0EENwDAAxLDbNP6UOxh+NEYQ5dl2drFv286598GrA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAu37AD8eaBH5JQdVbAAAAAElFTkSuQmCC";

            let image = new Image();
            let texture = new THREE.Texture(image);
            image.onload = () => texture.needsUpdate = true;
            image.src = gridImage;

            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(size[0], size[2]);
            let pGeometry = new THREE.BoxGeometry(...size);
            let pMaterial = new THREE.MeshStandardMaterial({map:texture, color: color, side: THREE.FrontSide});

            let mesh = new THREE.Mesh(pGeometry, pMaterial);
            mesh.receiveShadow = true;
            this.placeholder = mesh;
            this.placeholder.position.set(...offset);
            this.placeholder.name = "placeholder";
            if (this.actor.layers.indexOf("walk") >= 0) {
                this.constructCollider(this.placeholder);
            }
            this.shape.add(this.placeholder);
        }

        let name = this.actor.name;
        let shadow = options.shadow !== undefined ? options.shadow : true;
        let singleSided = options.singleSided !== undefined ? options.singleSided : false;
        let noFog = options.noFog !== undefined ? options.noFog : false;

        // bail out if we're in the process of loading this same model
        if (!model3d || this._model3dLoading === model3d) {return;}

        this._model3dLoading = model3d;
        assetManager.fillCacheIfAbsent(model3d, () => {
            let b = this.getBuffer(model3d);
            return b;
        }, this.id).then((buffer) => {
            return assetManager.load(buffer, modelType, THREE);
        }).then((obj) => {
            if (model3d !== this._model3dLoading) {
                console.log("model load has been superseded");
                return;
            }

            this.setupObj(obj, options);
            // if it is loading an old session, the animation field may not be there.
            this.setupAnimation(obj);
            obj.updateMatrixWorld(true); // @@ not sure whose benefit this is for, given that obj isn't yet in the scene graph

            if (options.placeholder) {
                console.log("delete collider for placeholder");
                // assuming that a card with placeholder specified does not need to keep the cache.
                // So we special case it to delete the cache entry.
                assetManager.revoke(model3d, this.id);
                this.cleanupColliderObject();
                this.shape.remove(this.placeholder);
            }
            if(options.flatten) {
                let flattenedObj = this.flattenObj(obj);
                if(flattenedObj !== obj) {
                    obj.traverse((mesh) => {
                        if (mesh.geometry){
                            mesh.geometry.dispose();
                            mesh.material.dispose();
                        }
                    });
                    obj = flattenedObj;
                }
            }
            let fullBright = options.fullBright !== undefined ? options.fullBright : false;
            addMeshProperties(obj, shadow, singleSided, noFog, fullBright, THREE);
            if (this.actor.layers.indexOf("walk") >= 0) {
                this.constructCollider(obj);
            }

            // place this after collider construction
            // or collider incorporates shape transform
            this.shape.add(obj);

            obj.updateMatrixWorld(true); // now sort out where everything is, before announcing model load

            if (name) {obj.name = name;}

            if (Array.isArray(obj.material)) {
                obj.material.dispose = arrayDispose;
            }

            delete this._model3dLoading;
            publishLoaded();
        }).catch((e) => {
            console.error(e.message, model3d);
            this.say("assetLoadError", {message: e.message, path: model3d});
            delete this._model3dLoading;
        });
    }

    construct2D(options) {
        let assetManager = this.service("AssetManager").assetManager;

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
        let color = options.color; // if color is undefined, use SVG colors
        let frameColor = options.frameColor || 0x666666;
        let fullBright = options.fullBright !== undefined ? options.fullBright : false;
        let shadow = options.shadow !== undefined ? options.shadow : true;
        let cornerRadius = options.cornerRadius !== undefined ? options.cornerRadius : 0;

        this.properties2D = {depth, width, height, textureWidth, textureHeight, name, color, frameColor, fullBright, shadow, cornerRadius};

        let publishLoaded = () => {
            this.publish(this.id, "2dModelLoaded");
            if (this.actor._cardData.loadSynchronously) {
                this.publish(this.sessionId, "synchronousCardLoaded", {id: this.actor.id});
            }
        };

        // You might want to parallelize the texture data loading and svg data loading by arranging
        // promises cleverly, but this.texture should be set quite early
        // (that is before returning from this method) to have apps like multiblaster function

        if (textureType === "video") {
            let muted = this.actor._cardData.muted !== undefined ? this.actor._cardData.muted : true;
            let loop = this.actor._cardData.loop !== undefined ? this.actor._cardData.loop : false;
            let autoplay = this.actor._cardData.autoplay !== undefined ? this.actor._cardData.autoplay : false;
            this.video = document.createElement("video");
            this.video.autoplay = autoplay;
            this.video.muted = muted;
            this.video.loop = loop;
            this.video.controls = false;

            texturePromise = assetManager.fillCacheIfAbsent(textureLocation, () => {
                return this.getBuffer(textureLocation);
            }, this.id).then((buffer) => {
                let objectURL = URL.createObjectURL(new Blob([buffer], {type: "video/mp4"}));
                this.video.src = objectURL;
                this.video.preload = "metadata";
                this.objectURL = objectURL;
                this.videoPromiseResolved = false;
                return new Promise((resolve, reject) => {
                    this.video.onloadeddata = resolve;
                    this.video.onloadedmetadata = resolve;
                    this.video.onerror = reject;
                });
            }).then(() => {
                if (!this.videoPromiseResolved) {
                    this.videoPromiseResolved = true;
                    this.video.onloadeddata = null;
                    this.video.onloadedmetadata = null;
                }

                this.videoLoaded = true;
                this.video.width = options.textureWidth || this.video.videoWidth;
                this.video.height = options.textureHeight || this.video.videoHeight;
                this.video.currentTime = 0.03;
                // need to be revoked when destroyed
                this.texture = new THREE.VideoTexture(this.video);

                return {
                    width: this.video.width,
                    height: this.video.height,
                    texture: this.texture
                }
            }).catch((e) => {
                console.error(e.message, textureLocation);
                this.say("assetLoadError", {message: e.message, path: textureLocation});
            });
        } else if (textureType === "image") {
            texturePromise = assetManager.fillCacheIfAbsent(textureLocation, () =>
                this.getBuffer(textureLocation), this.id)
                .then((buffer) => {
                    let objectURL = URL.createObjectURL(new Blob([buffer]));
                    this.objectURL = objectURL;
                    return new Promise((resolve, reject) => {
                        this.texture = new THREE.TextureLoader().load(
                            objectURL,
                            (texture) => {
                                URL.revokeObjectURL(objectURL);
                                resolve({width: texture.image.width, height: texture.image.height, texture})
                            }, null, reject);
                    });
                }).catch((e) => {
                    console.error(e.message, textureLocation);
                    this.say("assetLoadError", {message: e.message, path: textureLocation});
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

        if (dataLocation) {
            assetManager.fillCacheIfAbsent(
                dataLocation,
                () => this.getBuffer(dataLocation),
                this.id)
                .then((buffer) => assetManager.load(buffer, "svg", THREE, loadOptions))
                .then((obj) => {
                    normalizeSVG(obj, depth, shadow, THREE);
                    // this is not working for SVGs
                    // let geometry = toIndexed(obj.children[0].geometry, THREE, true);
                    // obj.children[0].geometry = geometry;
                    return obj;
                }).then((obj) => {
                    if (this.texture) {
                        addTexture(obj, this.texture);
                    }
                    if (options.dataTranslation) {
                        obj.position.set(...options.dataTranslation);
                    }
                    obj.name = "2d";
                    if (Array.isArray(obj.material)) {
                        obj.material.dispose = arrayDispose;
                    }
                    this.objectCreated(obj);
                    this.shape.add(obj);
                    if (this.actor.layers.indexOf("walk") >= 0) {
                        this.constructCollider(obj);
                    }
                    publishLoaded();
                }).catch((e) => {
                    console.error(e.message, dataLocation);
                    this.say("assetLoadError", {message: e.message, path: dataLocation});
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
                    this.properties2D = {...this.properties2D, width, height, textureWidth, textureHeight};
                }

                let geometry = this.roundedCornerGeometry(width, height, depth, cornerRadius);
                let material = this.makePlaneMaterial(depth, color || 0xffffff, frameColor, fullBright);

                if (this.texture) {
                    material[0].map = this.texture;
                }

                this.material = material;
                let obj = new THREE.Mesh(geometry, material);
                obj.castShadow = shadow;
                obj.name = "2d";
                this.objectCreated(obj);
                this.shape.add(obj);
                if (this.actor.layers.indexOf("walk") >= 0) {
                    this.constructCollider(obj);
                }
                publishLoaded();
            });
        }
    }

    // flattenObj does its best to remove groups and merge meshes with the same
    // textures. It is used if the "flatten:" flag is set in the card.
    // It is a poor man's mesh merge, so should not be used if the same texture is used
    // in different kinds of materials (which is likely rare).
    // It is quite similar to constructCollider and these could be merged at some point.
    flattenObj(obj) {
        let staticGroup = new THREE.Group();
        let meshData = [];
        let beforeCount = 0, endCount = 0;
        try {
            obj.traverse(c =>{
                beforeCount++;
                if(c.geometry){
                    let cloned = c.geometry.clone();
                    cloned.applyMatrix4(c.matrixWorld);
                    if (cloned.index) {
                        // this test may be dubious as some models can legitimately contain
                        // non-indexed buffered geometry.
                        if(cloned.attributes.uv2){
                            // three.js doesn't support these
                            delete cloned.attributes.uv2;
                            delete cloned.attributes.texcoord_2;
                        }
                        let id = c.material.map ? c.material.map.id : 0;
                        if (!meshData[id]) meshData[id] = {material: c.material.clone(), geometries:[]};
                        meshData[id].geometries.push(cloned);
                    } else {
                        console.warn("skipping a geometry in the model that is not indexed");
                    }
                }
            });

            let BufferGeometryUtils = THREE.BufferGeometryUtils;
            meshData.forEach(m=>{
                endCount++;
                let mergedGeometry = BufferGeometryUtils.mergeBufferGeometries( m.geometries, false);
                let mesh = new THREE.Mesh(mergedGeometry, m.material);
                staticGroup.add(mesh);
            })

        } catch (err) {
            console.error("failed to build the static for:", obj);
            console.error(err);
            return obj;
        }
        console.log("Static - before:", beforeCount, "end:", endCount, "object:", obj);
        return staticGroup;
    }

    constructCollider(obj) {
        let geometries = [];
        this.ensureColliderObject();

        let mergedGeometry;

        // We traverse the nested geometries, and flatten them in the reference to the "obj".
        // we temporarily set the matrix of obj to identity, apply matrixWorld of each sub object but then
        // restore obj's matrix. In a typical case when this is called only when things are set up,
        // this method is called before adding "obj" to shape so obj.matrix is typically an identity anyway.

        let tmpMat = obj.matrix;
        obj.matrix = new THREE.Matrix4();
        try {
            obj.traverse(c =>{
                if(c.geometry){
                    let cloned = c.geometry.clone();
                    cloned.applyMatrix4(c.matrixWorld);
                    for( const key in cloned.attributes) {
                        if (key !== "position") {
                            cloned.deleteAttribute(key);
                        }
                    }
                    if (cloned.index) {
                        // this test may be dubious as some models can legitimately contain
                        // non-indexed buffered geometry.
                        geometries.push(cloned);
                    } else {
                        console.warn("skipping a geometry in the model that is not indexed");
                    }
                }
            });

            let BufferGeometryUtils = window.THREE.BufferGeometryUtils;
            mergedGeometry = BufferGeometryUtils.mergeBufferGeometries( geometries, false);
            mergedGeometry.boundsTree = new MeshBVH( mergedGeometry, { lazyGeneration: false } );
        } catch (err) {
            console.error("failed to build the BVH collider for:", obj);
            console.error(err);
            return;
        } finally {
            obj.matrix = tmpMat;
        }

        let collider = new THREE.Mesh(mergedGeometry);
        collider.material.wireframe = true;
        collider.material.opacity = 0.5;
        //collider.material.transparent = true;
        collider.matrixWorld = obj.matrixWorld.clone();
        collider.updateMatrixWorld(true);
        collider.visible = false;
        this.colliderObject.add(collider);

        /*
          let visualizer = new MeshBVHVisualizer( collider, 10 );
          visualizer.visible = true;

          this.shape.parent.add(visualizer)
        */
    }

    setupObj(obj, options) {
        if (options.dataScale) {
            obj.scale.set(...options.dataScale);
        } else {
            /*
            let size = new THREE.Vector3(0, 0, 0);
            new THREE.Box3().setFromObject(obj).getSize(size);
            let max = Math.max(size.x, size.y, size.z);
            let s = 4 / max;
            obj.scale.set(s, s, s);
            // this part of code is executed by all views at this moment
            if (!this.actor._cardData.dataScale) {
                this.say("dataScaleComputed", [s, s, s]);
            }
            */
        }
        if (options.dataTranslation) {
            obj.position.set(...options.dataTranslation);
        }
        if (options.dataRotation) {
            let d = (options.dataRotation.length === 3) ? q_euler(...options.dataRotation) : options.dataRotation;
            obj.quaternion.set(...d);
        }
    }

    setupAnimation(obj) {
        // There are a few ways to get here:
        // -  the card is recently created, and animation loop has not been started.
        // -  the card was here, and animation loop was on and showing different animations
        //    and a new 3D model was just loaded.
        // - a new model with an actor behavior that specifies animationClipIndex already.
        // For the second case, animationRunning may be true.
        if (!obj._croquetAnimation) {return;}

        let spec = obj._croquetAnimation;
        if (spec) {
            this.animationSpec = spec;
            this.tryStartAnimation();
        }
    }

    objectCreated() {}

    roundedCornerGeometry(width, height, depth, cornerRadius) {
        let x = height / 2;
        let y = width / 2;
        let z = depth / 2;
        let radius = cornerRadius === undefined ? 0 : cornerRadius;

        let shape = new THREE.Shape();
        shape.moveTo(-x, -y + radius);
        shape.lineTo(-x,  y - radius);
        shape.quadraticCurveTo(-x, y, -x + radius, y);
        shape.lineTo(x - radius, y);
        shape.quadraticCurveTo(x, y, x, y - radius);
        shape.lineTo(x, -y + radius);
        shape.quadraticCurveTo(x, -y, x - radius, -y);
        shape.lineTo(-x + radius, -y);
        shape.quadraticCurveTo( -x, -y, -x, -y + radius);

        let extrudePath = new THREE.LineCurve3(new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, -z));
        extrudePath.arcLengthDivisions = 3;
        let geometry = new THREE.ExtrudeGeometry(shape, {extrudePath});

        geometry.parameters.width = width;
        geometry.parameters.height = height;
        geometry.parameters.depth = depth;

        let normalizeUV = (uvArray, bb) => {
            let w = bb.max.x - bb.min.x;
            let h = bb.max.y - bb.min.y;
            if (w && h) {
                let wScale = 1;
                let hScale = 1;
                if (h > w) hScale = h / w;
                else if (w > h) wScale = w / h;
                for (let i = 0; i < uvArray.length; i += 2) {
                    uvArray[i  ] = uvArray[i  ] * wScale + 0.5;
                    uvArray[i+1] = uvArray[i+1] * hScale + 0.5; // eslint-disable-line
                }
            }
        };

        let newGeometry = toIndexed(geometry, THREE, true);

        let boundingBox = new THREE.Box3(
            new THREE.Vector3(-x, -y, -z),
            new THREE.Vector3( x,  y,  z));

        newGeometry.parameters = geometry.parameters;
        let uv = newGeometry.getAttribute('uv');
        normalizeUV(uv.array, boundingBox);

        return newGeometry;
    }

    makePlaneMaterial(depth, color, frameColor, fullBright) {
        if (this.material) {
            this.material.dispose();
        }
        let material;
        if (!fullBright) {
            material = new THREE.MeshPhongMaterial({color:color, side: THREE.FrontSide});
        } else {
            material = new THREE.MeshBasicMaterial({color:color, side: THREE.FrontSide, toneMapped: false});
        }

        if (depth > 0) {
            let second;
            second = new THREE.MeshPhongMaterial({color: frameColor, side: THREE.FrontSide});
            material = [material, second ];
        }

        this.material = material;
        if (Array.isArray(this.material)) {
            this.material.dispose = arrayDispose;
        }
        return material;
    }

    dataType(name) {
        if (name.startsWith("data:")) {return "dataUri";}
        // version+hash+key is 87 characters, plus the actual URL
        // so length > 87 should be a safe check for a name to be a dataId
        if (/^[a-z0-9-_]+$/i.test(name) && name.length > 87) {
            return "dataId"
        }

        /*
          dot or slash or colon are not valid base64 so we can assume
          that the other case is "url"

          if (name.startsWith("http://") ||
          name.startsWith("https://") ||
          name.startsWith(".") ||
          name.startsWith("/")) {return "url";}
        */

        return "url";
    }

    async getBuffer(name) {
        let assetManager = this.service("AssetManager").assetManager;
        let buffer = assetManager.getCache(name);
        if (buffer) { return Promise.resolve(buffer); }
        let dataType = this.dataType(name);

        if (!this.actor._cardData.loadSynchronously) {
            await this.session.view.readyToLoadPromise;
        }

        if (dataType === "url" || dataType === "dataUri") {
            return fetch(name)
                .then((resp) => {
                    if (!resp.ok) {
                        let e = {
                            message: `fetch failed: ${resp.status} ${resp.statusText}`,
                            path: name
                        };
                        throw e;
                    }
                    return resp.arrayBuffer();
                }).then((arrayBuffer) => new Uint8Array(arrayBuffer))
        } else if (dataType === "dataId") {
            let handle = Data.fromId(name);
            return Data.fetch(this.sessionId, handle);
        }
    }

    cardDataUpdated(data) {
        // it might be independently implemented in a behavior, and independently subscribed

        if (this.didPropertyChange(data, ["type", "dataLocation", "dataRotation", "dataScale"])) return this.updateShape();

        if (data.v.type !== "2d") {return;}
        let obj = this.shape.children.find((o) => o.name === "2d");
        if (!obj || !obj.children || obj.children.length === 0) {return;}
        obj = obj.children[0];
        if (this.didPropertyChange(data, ["depth", "width", "height", "color", "frameColor", "cornerRadius", "fullBright"])) {
            let {depth, width, height, color, frameColor, cornerRadius, fullBright} = data.v;

            depth = (depth !== undefined) ? depth : 0.05;
            width = (width !== undefined) ? width : 1;
            height = (height !== undefined) ? height : 1;
            color = color || 0xFFFFFF;
            frameColor = frameColor || 0x666666;
            cornerRadius = cornerRadius !== undefined ? cornerRadius : 0;
            fullBright = fullBright !== undefined ? fullBright : false;

            let material = this.makePlaneMaterial(depth, color, frameColor, fullBright);

            if (this.didPropertyChange(data, ["depth", "width", "height", "cornerRadius"])) {
                let geometry = this.roundedCornerGeometry(width, height, depth, cornerRadius)
                obj.geometry = geometry;
            }
            obj.material = material;
        }
    }

    // TODO: move this to utility function in Worldcore (kernel/src/Utilities.js)
    didPropertyChange({ o, v }, propertyName) {
        if (Array.isArray(propertyName)) {
            return propertyName.some((name) => o[name] !== v[name]);
        } else {
            return o[propertyName] !== v[propertyName];
        }
    }

    uv2xy(uv) {
        return this.actor.uv2xy(uv);
    }

    /*
    onPointerWheel(e) {
        let wheel = e.deltaY;
        let s = this.scale;
        let w = wheel < 0 ? -0.1 : 0.1;
        if (s[0] + w > 0.3) {
            this.scaleTo([s[0] + w, s[1] + w, s[2] + w], 100);
        }
    }
    */

    onPointerDoubleDown(pe) {
        if (!pe.targetId) {return;}
        let pose = this.getJumpToPose ? this.getJumpToPose() : null;
        if (pose) {
            pe.xyz = pose[0]; // world coordinates
            pe.offset = pose[1]; // distance from target
            pe.look = true;
        } else {
            // pe.offset = Constants.EYE_HEIGHT; // filled in by the receiving side
        }
        this.publish(pe.avatarId, "goThere", pe);
    }

    showControls(actorInfo) {
        this.say("showControls", actorInfo);
    }

    // compute and return the position and distance the avatar should jump to to see the card full screen
    getJumpToPose() {
        if(!this.isFlat) return null;
        let current = this.renderObject.localToWorld(new THREE.Vector3()).toArray(); // this is where the card is
        let renderer = this.service("ThreeRenderManager");
        let camera = renderer.camera;
        let caspect = camera.aspect;
        let cWidth = renderer.canvas.width;
        let cHeight = renderer.canvas.height;

        let base = (cHeight / 2) * Math.sqrt(3); // when fov is 60 deg; subject to change

        let temp = this.renderObject.matrix;
        let size = new THREE.Vector3(0, 0, 0);
        try {
            let scale = new THREE.Vector3(0, 0, 0);
            scale.setFromMatrixScale(temp);
            let mat4 = new THREE.Matrix4();
            mat4.makeScale(scale.x, scale.y, scale.z);
            this.renderObject.matrix = mat4;
            new THREE.Box3().setFromObject(this.renderObject).getSize(size);
        } finally {
            this.renderObject.matrix = temp;
        }
        let taspect = size.x / size.y;

        let d = taspect < caspect ? (size.y * base) / cHeight : (size.x * base) / cWidth;
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

    onHiddenSet(hidden) {
        this.shape.visible = !hidden.v;
        let renderer = this.service("ThreeRenderManager");
        renderer.dirtyLayer("pointer");
    }

    tryStartAnimation() {
        if (this.actor._cardData.animationClipIndex === undefined && this.animationSpec?.animations.length > 0) {
            this.say("setAnimationClipIndex", 0);
            // use the first animation clip as default. Some views may call this at the same time,
            // but that should be okay
        }
        this.runAnimation();
    }

    runAnimation() {
        let spec = this.animationSpec;
        if (!spec) {
            if (this.animationInterval) {
                clearInterval(this.animationInterval);
                this.animationInterval = null;
            }
            return;
        }

        if (!this.animationInterval) {
            this.animationInterval = setInterval(() => this.runAnimation(), 50)
        }

        let animationClipIndex = this.actor._cardData.animationClipIndex;
        if (animationClipIndex === undefined) {return;}
        if (animationClipIndex < 0) {return;}

        // if the animationClipIndex has been changed,
        // the new clip is started and the time is adjusted according to the model side
        // animation startTime.

        // logicalStartTime is on the logical time.
        // if it is the same as current this.actor._cardData.animationStartTime,
        // the ordinally flow of time is not disturbed so it goes business as usual.
        // if it is different from animationStartTime, the animation will use it as
        // the new "startTime" basis.

        let now = this.now();
        let modelStartTime = this.actor._cardData.animationStartTime;
        let { mixer, lastTime, lastAnimationClipIndex } = spec;

        if (animationClipIndex !== lastAnimationClipIndex) {
            mixer.stopAllAction();
            let clip = spec.animations[animationClipIndex];
            if (!clip) {return;}
            mixer.clipAction(clip).play();
            spec.lastAnimationClipIndex = animationClipIndex;
        }
        let newTime = (now - modelStartTime) / 1000;
        let delta = newTime - lastTime;

        mixer.update(delta);
        spec.lastTime = newTime;

    }

    selectEdit() {
        this.say("selectEdit", this.getBox(this.renderObject));
    }

    unselectEdit() {
        this.say("unselectEdit");
        delete this._plane;
    }

    doSelectEdit() {
        /*
        if (this.renderObject) {
            this.addWireBox(this.renderObject);
        }
        */
    }

    doUnselectEdit() {
        /*
        if (this.renderObject) {
            this.removeWireBox(this.renderObject);
        }*/
    }

    getBox(obj3d) { // compute the bounding box of the target object
        let tmpMat = new THREE.Matrix4();
        let currentMat = obj3d.matrix;
        let box;
        try {
            obj3d.matrix = tmpMat;
            box = new THREE.Box3().setFromObject(obj3d);
        } finally {
            obj3d.matrix = currentMat;
        }
        return [...box.min.toArray(), ...box.max.toArray()]
    }

    nop() {}

    getMyAvatar() {
        let playerManager = this.actor.service("PlayerManager");
        let myAvatar = playerManager.players.get(this.viewId);
        if (!myAvatar) {return undefined;}
        return GetPawn(myAvatar.id);
    }

    addWireBox(obj3d) {
        let tmpMat = new THREE.Matrix4();
        let currentMat = obj3d.matrix;
        let box;
        try {
            obj3d.matrix = tmpMat;
            box = new THREE.Box3().setFromObject(obj3d);
        } finally {
            obj3d.matrix = currentMat;
        }

        let min = box.min;
        let max = box.max;

        let x = max.x - min.x;
        let ax = (max.x + min.x) / 2;
        let y = max.y - min.y;
        let ay = (max.y + min.y) / 2;
        let z = max.z - min.z;
        let az = (max.z + min.z) / 2;

        let cylinder = (len, rotateSel, tx, ty, tz) => {
            let cyl = new THREE.CylinderGeometry(0.02, 0.02, len);
            if (rotateSel) {
                cyl[rotateSel](Math.PI / 2);
            }
            cyl.translate(tx, ty, tz);
            return cyl;
        };

        let c0 =  cylinder(x, "rotateZ", ax, max.y * 1.01, max.z * 1.01);
        let c1 =  cylinder(x, "rotateZ", ax, max.y * 1.01, min.z * 1.01);
        let c2 =  cylinder(x, "rotateZ", ax, min.y * 1.01, max.z * 1.01);
        let c3 =  cylinder(x, "rotateZ", ax, min.y * 1.01, min.z * 1.01);

        let c4 =  cylinder(y, null,      max.x * 1.01, ay, max.z * 1.01);
        let c5 =  cylinder(y, null,      max.x * 1.01, ay, min.z * 1.01);
        let c6 =  cylinder(y, null,      min.x * 1.01, ay, max.z * 1.01);
        let c7 =  cylinder(y, null,      min.x * 1.01, ay, min.z * 1.01);

        let c8 =  cylinder(z, "rotateX", max.x * 1.01, max.y * 1.01, az);
        let c9 =  cylinder(z, "rotateX", max.x * 1.01, min.y * 1.01, az);
        let c10 = cylinder(z, "rotateX", min.x * 1.01, max.y * 1.01, az);
        let c11 = cylinder(z, "rotateX", min.x * 1.01 , min.y * 1.01, az);

        let cylinders = [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11];

        let BufferGeometryUtils = THREE.BufferGeometryUtils;
        let mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(cylinders, false);

        let mat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
            depthWrite: false
        });

        let line = new THREE.Mesh(mergedGeometry, mat);
        line._wireline = true;
        line.renderOrder = 10000;
        obj3d.add(line);
    }

    removeWireBox(obj3d) {
        [...obj3d.children].forEach((c) => {
            if (c._wireline) {
                c.geometry.dispose();
                c.material.dispose();
                c.removeFromParent();
            }
        });
    }

    getAudioListener() {
        return this.getMyAvatar().getAudioListener();
    }

    /*
    showSelectEdit(obj3d) {
        this.service("ThreeRenderManager").addToOutline(obj3d);
        obj3d.traverse((obj)=>{
            if(obj.geometry){

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
                        m._oldOpacity = m.opacity;
                        m.opacity = 0.5;
                        m._oldTransparent = m.transparent;
                        m.transparent = true;
                        m.needsUpdate = true;
                    }
                })
            }
        });
    }

    showUnselectEdit(obj3d) {
        this.service("ThreeRenderManager").clearOutline(obj3d);
        let mat;
        obj3d.traverse((obj)=>{
            if(obj.type === '_lineHighlight') {
                // lines.push(obj);
            } else if(obj.geometry) {
                mat = (Array.isArray(obj.material)) ? obj.material : [obj.material];
                mat.dispose = arrayDispose;
                //console.log("removeWire, material",mat);
                mat.forEach(m=>{
                    if(m._oldColor) {
                        m.color = m._oldColor;
                        m.opacity = m._oldOpacity;
                        m.transparent = m._oldTransparent;
                        delete m._oldColor;
                        delete m._oldOpacity;
                        delete m._oldTransparent;
                        m.needsUpdate = true;
                    }
                });
            }
        });
    }*/

    saveCard(data) {
        if (data.viewId !== this.viewId) {return;}

        let cardsMap = this.actor.allChildrenMap();
        let saver = new WorldSaver(CardActor);
        let json = {};
        let cards = saver.collectData(cardsMap);
        delete cards[0].card.parent;
        json.cards = cards;

        let allModules = [];

        cards.forEach((spec) => {
            if (spec.card.behaviorModules) {
                allModules.push(...spec.card.behaviorModules);
            }
        });

        let modules = this.actor.behaviorManager.save(allModules)
        json.behaviorModules = modules;

        if (Constants.UserRapier) {
            json.useRapier = true;
        }

        let string = saver.stringify(json);
        let name = this.actor._name || "card";
        let result = {name, version: "1", data: JSON.parse(string)};

        let div = document.createElement("a");
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 4));
        div.setAttribute("href", dataStr);
        div.setAttribute("download", `${name}.vrse`);
        div.click();
    }
}

export class MicroverseAppManager extends ModelService {
    init(_options) {
        super.init("MicroverseAppManager");
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
        try {
            return this.constructor.classFromID(name);
        } catch (e) {}
        return null;
    }
    delete(_name) {
        // return this.$apps.delete(name);
    }
}

MicroverseAppManager.register("MicroverseAppManager");

function arrayDispose() {
    if (Array.isArray(this)) {
        this.forEach((e) => e.dispose());
    } else {
        this.dispose();
    }
}
