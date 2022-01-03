// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Collaborative Card
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { AM_Events, PM_Events } from './DEvents.js';
import { THREE, Actor, Pawn, mix, AM_Spatial, PM_Spatial, viewRoot} from "@croquet/worldcore";
import { PM_ThreeVisibleLayer } from './DLayerManager.js';
import { D } from './DConstants.js';
import { myAvatar } from './MVAvatar.js';
import { loadSVG } from './SVGimporter.js';
const CardColor = 0x9999cc;  // light blue
const OverColor = 0xffff77;   // yellow
const DownColor = 0x88ff88; // green
const NoColor = 0x000000; // black

const timeOutDown = 5000; // if no user action after down event, then cancel
const timeOutOver = 10000; // if no user action after enter event, then cancel
let counter = 0;

export class Actor_Card extends mix(Actor).with(AM_Spatial, AM_Events){
    get pawn() {return Pawn_Card}
    init(...args) {
        this.visible = true;
        super.init(...args);

        // managing multiple users
        this._downUsers = new Map(); 
        this._overUsers = new Map();
        this.future(1000).timeOutEvent();
    }

    get parent() { return this._parent; }

    addCard(c) {
        let cardId = c.id?c.id:c;
        if (!this.children) this.children = new Set();
        this.children.add(cardId);
        this.say("addChild", cardId);
    }

    removeCard(c) { 
        let cardId = c.id?c.id:c;
        if (this.children) this.children.delete(cardId);
        this.say("removeChild", cardId);
    }

    // check if user hasn't moved if pointer is down or over
    // cancel event if no action ins some period of time
    timeOutEvent(){
        let n = this.now();
        let userId;
        if(this._downUsers.size>0){
            userId = this._downUsers.keys().next().value;
            if(n-this._downUsers.get(userId)>timeOutDown){
                this._downUsers.delete(userId);
                this.onPointerDownCancel()
            }
        }
        if(this._overUsers.size>0){
            userId = this._overUsers.keys().next().value;
            if(n-this._overUsers.get(userId)>timeOutOver){
                this._overUsers.delete(userId);
                this.onPointerOverCancel()
            }   
        }     
        this.future(1000).timeOutEvent();
    }

    multiUser(){ return true; }

    onPointerDown(p3d){
        if(this.multiUser() || this._downUsers.size === 0 ){
            this._downUsers.set(p3d.playerId, this.now());
            this.say("doPointerDown", p3d);
        }
    }
    onPointerUp(p3d){
        if(this._downUsers.has(p3d.playerId)){
            this._downUsers.delete(p3d.playerId);
            this.say("doPointerUp", p3d);
        }
    }
    onPointerMove(p3d){
        if(this._downUsers.has(p3d.playerId)){
            this._downUsers.set(p3d.playerId, this.now())// update the _downUser
            this.say("doPointerMove", p3d);
        }
    }
    onPointerDownCancel(pId){
        this.say("doPointerDownCancel", pId);
    }    
    onPointerEnter(p3d){
        if(this.multiUser() || this._overUsers.size === 0 ){
            this._overUsers.set(p3d.playerId, this.now());
            this.say("doPointerEnter", p3d);
        }
    }
    onPointerOver(p3d){
        if(this._overUsers.has(p3d.playerId)){
            this._overUsers.set(p3d.playerId, this.now())// update the _overUser
            this.say("doPointerOver", p3d);
        }
    }
    onPointerLeave(p3d){
        if(this._overUsers.has(p3d.playerId)){
            this._overUsers.delete(p3d.playerId);
            this.say("doPointerLeave", p3d);
        }
    }    
    onPointerOverCancel(pId){
        this.say("doPointerLeave", pId);
    }   

    onPointerWheel(p3d){
        let s = this.scale;
        let w = p3d.wheel < 0?-0.1:0.1;
        if(s[0]+w >0.3){
            this._scale = [s[0]+w, s[1]+w, s[2]+w];
            this.scaleChanged();
        }
        //this.say("doPointerWheel", p3d);
    }
    onKeyDown(e){
        console.log(e)
    }
    onKeyUp(e){
        console.log(e)
    }
    showHide(){}
}

Actor_Card.register('Actor_Card');

let that;
class Pawn_Card extends mix(Pawn).with(PM_Spatial, PM_Events, PM_ThreeVisibleLayer, ){
    constructor(...args) {
        super(...args);
        that=this;
        this.constructCard();
        this.listen("doPointerDown", this.doPointerDown);
        this.listen("doPointerMove", this.doPointerMove)
        this.listen("doPointerUp", this.doPointerUp);
        this.listen("doPointerDownCancel", this.doPointerUp);
        this.listen("doPointerEnter", this.doPointerEnter);
        this.listen("doPointerOver", this.doPointerOver);
        this.listen("doPointerLeave", this.doPointerLeave);
        this.listen("doPointerOverCancel", this.doPointerLeave);
        this.listen("doPointerWheel", this.doPointerWheel);
        this.listen("addCard", this.addCard);
    }


    constructCard()
    {
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
        loadSVG('./assets/SVG/Vespa-logo.svg', this.card3D, this.normalize);
        this.layer = D.EVENT;
        if(this.actor._cardInstall) this.addToWorld();
    }

    normalize(group){
        let ext = that.extent3D(group);
        let cen = that.center3D(group);
console.log("normalize", ext, cen)
        let mx = Math.max(ext.x, ext.y);
        if(mx>0){ 
            that.card3D.position.set(-cen.x, -cen.y, -cen.z);
            let sc = 1/mx;
            group.scale.set(sc,sc,sc);
            group.matrixWorldNeedsUpdate = true;
            group.updateMatrixWorld(true);
        }
    }

    boundingBox(obj, bigBox,depth) { 
        // this needs to recursively merge the bounding box of all of the objects it contains.
        // computes the boundingBox in LOCAL coordinates.  if there's a parent, temporarily
        // remove from the parent and reset position and orientation.
        // the boundingBox reflects the extent after application of the current scale setting.

        if(!bigBox){ bigBox = new THREE.Box3(); depth = 0}
//console.log('depth:', depth, "children: ", obj.children.length)
        if(obj.material){ //means it is a visible thing
            obj.updateMatrixWorld();
            obj.geometry.computeBoundingBox();
//console.log("depth", depth, "boundingBox", obj.geometry.boundingBox)
            const box = obj.geometry.boundingBox;
            //console.log(box, obj.matrixWorld)
            box.applyMatrix4(obj.matrixWorld);
            bigBox.union(box);
        }
        if(obj.children){obj.children.forEach(child=>that.boundingBox(child, bigBox, depth+1))}

        return bigBox;
    }

    extent3D(obj) {
        let rVec = new THREE.Vector3();
        let bb = this.boundingBox(obj);
//console.log("extent3D", bb)
        if(bb){
            rVec.copy(bb.max);
            rVec.sub(bb.min);
        }
        return rVec;
    }

    center3D(obj) {
        let rVec = new THREE.Vector3();
        let bb = this.boundingBox(obj);
//console.log("center3D", bb)
        if (bb) {
          rVec.copy(bb.max);
          rVec.add(bb.min);
          rVec.multiplyScalar(0.5);
         }
        return rVec;
    }

    addCard(){}
    removeCard(){}

    addToWorld(){
        // this part is to place in the scene
        this.cardHolder = new THREE.Group();
        this.cardHolder.add(this.card3D);
        this.setRenderObject( this.cardHolder );
    }

    doPointerDown(p3d){ this.hilite(DownColor)}

    doPointerMove(p3d){}
    
    doPointerUp(p3d){
        if(p3d && p3d.sameTarget)console.log("Do something");
        else console.log("Don't do anything");
        this.hilite(NoColor);
    }
    doPointerCancel(p3d){}
    doPointerEnter(p3d){
        if(myAvatar.actor.playerId === p3d.playerId)
            this.tween(this.card3D, new THREE.Quaternion(...p3d.rotation));
        this.hilite(OverColor);
    }
    doPointerOver(p3d){}
    doPointerLeave(p3d){this.hilite(NoColor)}
    doPointerWheel(p3d){

    }
    hilite(color) { 
        viewRoot.outlinePass.selectedObjects = [this.card3D];
       // this.card3D.material.emissive = new THREE.Color(color);
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

