// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Collaborative Card Object
// Also works with DSurface as a smart 2D object
// This needs to be redone to use Worldcore. 

import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { THREE, PM_ThreeVisible, Actor, Pawn, mix, AM_Predictive, PM_Predictive, AM_PointerTarget, PM_PointerTarget, Data, GetPawn} from "@croquet/worldcore";
import { D } from './DConstants.js';
import { loadSVG, boundingBox, extent3D, center3D } from './LoadSVG.js';
import { loadGLB, addShadows } from '/src/LoadGLB.js'
import { TextFieldActor } from './text/text.js';

const { Vector3 } = THREE;

const CardColor = 0x9999cc;  // light blue
const OverColor = 0x181808; //0xffff77;   // yellow
const DownColor = 0x081808; // green
const NoColor = 0x000000; // black

const timeOutDown = 5000; // if no user action after down event, then cancel
const timeOutOver = 10000; // if no user action after enter event, then cancel
let counter = 0;

//------------------------------------------------------------------------------------------
//-- DCardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class DCardActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget) {
    init(options) {
        super.init(options);
        this._layers = ['pointer'];
        if (options.model3d) {
            this.creationTime = this.now();
        }

        if (this._text !== undefined) {
            this.textActor = TextFieldActor.create({
                parent: this,
                isSticky: true,
                textWidth: options.textWidth,
                textHeight: options.textHeight
            });
            this.textActor.loadAndReset([{text: this._text}]);
        }
    }

    get pawn() { return DCardPawn; }
    get layers() { return this._layers; }
    get surface(){return this._cardSurface}
}
DCardActor.register('DCardActor');

//------------------------------------------------------------------------------------------
//-- DCardPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class DCardPawn extends mix(Pawn).with(PM_Predictive, PM_ThreeVisible, PM_PointerTarget) {
    constructor(...args) {
        super(...args);
        this.addToLayers(...this.actor.layers);
        this.constructCard();
    }

    constructCard() {
        this.card3D = new THREE.Group();

        if (this.actor._model3d && this.actor._modelType) {
            this.construct3D();
        }

        /*
       // this.color = new THREE.Color();
        this.card3D = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.1, 2, 2, 1),
            new THREE.MeshStandardMaterial({color: CardColor}));
        this.card3D.castShadow = true;
        this.card3D.recieveShadow = true;
        this.cardSphere = new THREE.Mesh(new THREE.SphereGeometry(0.1,32,16), 
            new THREE.MeshStandardMaterial({color: CardColor}));
        this.cardSphere.position.z = 0.15;
        this.card3D.add(this.cardSphere);        
        */

        let texture;
        if(this.actor.surface){
            this.surface = this.service("PawnManager").get(this.actor.surface.id);
            texture = this.surface.texture;
        }
        if(this.actor._cardShapeURL){
            loadSVG(this, this.actor._cardShapeURL, texture, this.actor._cardColor, this.actor._cardFullBright, this.actor._cardRotation, this.actor._cardShadow);
            this.isFlat = true;
        }
        this.setRenderObject( this.card3D );
    }

    construct3D() {
        if (!this.actor._model3d || !this.actor._modelType) {return;}
        let assetManager = this.service("AssetManager").assetManager;

        let getBuffer = () => {
            if (this.actor._model3d.startsWith("http") ||
                this.actor._model3d.startsWith(".") ||
                this.actor._model3d.startsWith("/")) {
                return fetch(this.actor._model3d).then((resp) => {
                    return resp.arrayBuffer();
                }).then((arrayBuffer) => {
                    return new Uint8Array(arrayBuffer);
                });
            } else {
                let handle = Data.fromId(this.actor._model3d);
                return Data.fetch(this.sessionId, handle);
            }
        };
            
        getBuffer().then((buffer) => {
            assetManager.load(buffer, this.actor._modelType, THREE).then((obj) => {
                this.card3D.add(obj);

                obj.updateMatrixWorld(true);
                obj.ready = true;

                addShadows({scene: obj}, true);

                let size = new Vector3(0, 0, 0);
                new THREE.Box3().setFromObject(obj).getSize(size);
                let max = Math.max(size.x, size.y, size.z);
                let s = 4 / max;
                obj.scale.set(s, s, s);

                if (this.actor._cardTranslation) {
                    obj.translation.set(...this.actor._cardTranslation);
                }
                if (this.actor._cardScale) {
                    obj.scale.set(...this.actor._cardScale);
                }
                if (this.actor._cardRotation) {
                    obj.rotation.set(...this.actor._cardRotation);
                }
                    
                if (obj._croquetAnimation) {
                    const spec = obj._croquetAnimation;
                    spec.startTime = this.actor.creationTime;
                    this.animationSpec = spec;
                    this.future(500).runAnimation();
                }
            });
        });
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
    //    this.tween(this.card3D, new THREE.Quaternion(...p3d.rotation));
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
        //this.tween(this.card3D, new THREE.Quaternion(...p3d.rotation));
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
    /*
    // communication from the Card_Actor
    doPointerDown(p3d){this.hilite(DownColor)}

    doPointerMove(p3d){}
    
    doPointerUp(p3d){
        if(p3d && p3d.sameTarget)console.log("Do something");
        else console.log("Don't do anything");
        this.hilite(NoColor);
    }
    doPointerCancel(p3d){}
    doPointerEnter(p3d){
       // if(myAvatar.actor.playerId === p3d.playerId)
       //     this.tween(this.card3D, new THREE.Quaternion(...p3d.rotation));
        this.hilite(OverColor);
    }
    doPointerOver(p3d){}
    doPointerLeave(p3d){this.hilite(NoColor)}
    doPointerWheel(p3d){

    }
    */
    hilite(color) { 
        //viewRoot.outlinePass.selectedObjects = [this.card3D];
        if(!this.actor._cardFullBright){
            let c = new THREE.Color(color);
            this.card3D.traverse(obj=>{if(obj.material)obj.material.emissive = c;});
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
        let current = this.card3D.localToWorld(new Vector3()).toArray(); // this is where the card is
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
}
