// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Collaborative Card Object
// Also works with DSurface as a smart 2D object
// This needs to be redone to use Worldcore. 

import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { THREE, PM_ThreeVisible, Actor, Pawn, mix, AM_Predictive, PM_Predictive, AM_PointerTarget, PM_ThreePointerTarget} from "@croquet/worldcore";
import { D } from './DConstants.js';
import { loadSVG, boundingBox, extent3D, center3D } from './LoadSVG.js';
import { loadGLB, addShadows } from '/src/LoadGLB.js'

const { Vector3 } = THREE;

const CardColor = 0x9999cc;  // light blue
const OverColor = 0x181808; //0xffff77;   // yellow
const DownColor = 0x081808; // green
const NoColor = 0x000000; // black

const timeOutDown = 5000; // if no user action after down event, then cancel
const timeOutOver = 10000; // if no user action after enter event, then cancel
let counter = 0;

//------------------------------------------------------------------------------------------
//-- CardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget) {

    get pawn() { return CardPawn; }

    onPointerWheel(p3d){
        let s = this.scale;
        let w = p3d.wheel < 0?-0.1:0.1;
        if(s[0]+w >0.3){
            this._scale = [s[0]+w, s[1]+w, s[2]+w];
            this.scaleChanged();
        }
    }
}
CardActor.register('CardActor');

//------------------------------------------------------------------------------------------
//-- CardPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardPawn extends mix(Pawn).with(PM_Predictive, PM_ThreeVisible, PM_ThreePointerTarget) {
    constructor(...args) {
        super(...args);
        this.layers=['pointer'];
        this.constructCard();
    }

    constructCard()
    {
        this.layers = ['pointer'];
        this.card3D = new THREE.Group();
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
        }
        if(this.actor._card3DURL){
            console.log(this.actor._card3DURL, this.card3D)
            loadGLB(this.actor._card3DURL, this.card3D, this.actor._cardShadow?addShadows:null, this.actor._cardTranslation, this.actor._cardScale, this.actor._cardRotation, true);
        }
        if(this.actor.children){
            this.actor.children.forEach(cardId=>this.addCard(cardId));
        }
        this.setRenderObject( this.card3D );
    //    this.addToWorld();
    }

    addToWorld(){
        // this part is to place in the scene
        this.cardHolder = new THREE.Group();
        this.cardHolder.add(this.card3D);
        this.setRenderObject( this.cardHolder );
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

    onPointerWheel(e){
        console.log("XonPointerWeel")
        this.say("onPointerWheel", e);
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
            this.card3D.traverse(obj=>{if(obj.material)obj.material.emissive=c;});
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
            .onStart( function() {
                qStart.copy(target.quaternion);
            } )
            .onUpdate( function() {
                target.quaternion.slerpQuaternions( qStart, qEnd, time.t );    
                target.updateMatrixWorld();
            } )
            .onComplete( function() {
                target.quaternion.copy( qEnd ); // so it is exact  
                target.updateMatrixWorld();
                scope.isTweening = false;
                if(onComplete)onComplete();
            } )
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
    getJumpToPose(){
        let rval = [];
        rval[0] = this.card3D.localToWorld(new Vector3()).toArray(); // this is where the card is
        let camera = this.service("ThreeRenderManager").camera;
        let fov = camera.fov;
        let caspect = camera.aspect;
        let taspect = this.aspect;
        let d, w, h, s = this.scale[0];
        if(taspect<1){
            w = taspect*s;
            h = s;
        }else{
            w = s;
            h = s/taspect;
        }

        d = (h/2)/Math.tan( Math.PI*fov/360); // compute distance from card assuming vertical 

        if(caspect <= taspect) d*= (taspect/caspect); // use width to fit instead
        rval[1]=d; // avatar distance from card

       return rval;
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
        }
        else this.object3D.getWorldDirection(norm);
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
}