// Copyright 2022 by Croquet Corporation. All Rights Reserved.
//
// Collaborative event manager for PCs and Mobile.
// Actor_Events and the Pawn_Events are designed to be used together to be 
// mixedin in to an event-based actor/pawn pair. 
//
// The PM_AvatarEvents is used to generate events, usually by extending an avatar.

import { RegisterMixin, THREE } from "@croquet/worldcore";

export const AM_Events = superclass => class extends superclass {
    init(...args) {
        super.init(...args);
        this.listen("_PointerDown", this.onPointerDown);
        this.listen("_PointerUp", this.onPointerUp);
        this.listen("_PointerCancel", this.onPointerCancel);
        this.listen("_PointerMove", this.onPointerMove);
        this.listen("_PointerEnter", this.onPointerEnter);
        this.listen("_PointerOver", this.onPointerOver);
        this.listen("_PointerLeave", this.onPointerLeave);
        this.listen("_PointerWheel", this.onPointerWheel);
    }

    // extended class has responsibility to redefine these functions.
    onPointerDown(p3d){}
    onPointerUp(p3d){}
    onPointerCancel(p3d){}    
    onPointerMove(p3d){}
    onPointerEnter(p3d){}
    onPointerOver(p3d){}
    onPointerLeave(p3d){}
    onPointerWheel(e){}
}
RegisterMixin(AM_Events);

export const PM_Events = superclass => class extends superclass {
    // the pawn can override these functions if it needs it executed immediately
    _pointerDown(p3d){this.say("_PointerDown", p3d)}
    _pointerUp(p3d){this.say("_PointerUp", p3d)}
    _pointerMove(p3d){this.say("_PointerMove", p3d)}
    _pointerCancel(p3d){this.say("_PointerCancel", p3d)}
    _pointerEnter(p3d){this.say("_PointerEnter", p3d)}
    _pointerOver(p3d){this.say("_PointerOver", p3d)}
    _pointerLeave(p3d){this.say("_PointerLeave", p3d)}
    _pointerWheel(p3d){this.say("_PointerWheel", p3d);}

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

export const PM_AvatarEvents = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        if(this.isMyPlayerPawn) this.setupEvents();
    }

    // Event Management 
    setupEvents(){
        this.subscribe("input", "pointerDown", this._pointerDown);
        this.subscribe("input", "pointerUp", this._pointerUp);
        this.subscribe("input", "pointerCancel", this._pointerCancel);
        this.subscribe("input", "pointerMove", this._pointerMove);
        this.subscribe("input", "wheel", this._pointerWheel);
        this._pointercaster = new THREE.Raycaster();
        this.xy = {x:0, y:0}; // reuse this
        this._pointer3D = {};
        //document.addEventListener('keypress', this._keyAction); // should use input but that is broken
    }

    _pointerDown(e){
        if(this._updatePointer(e)){
            this.downTarget = this.target;
            if(this.overTarget)this.overTarget._pointerLeave();
            this.overTarget = null;
            this.downTarget._pointerDown(this._pointer3D);
        }
        this.target = null;
    }
    _pointerUp(e){
        if(this.downTarget){
            this.downTarget._pointerUp(this._pointer3D);
            this.downTarget = null;
        }
        this._pointerMove(e); // check for pointerOver
    }
    _pointerMove(e){
        this._updatePointer(e);
        if(this.downTarget){this.downTarget._pointerMove(this._pointer3D)}
        else if(this.overTarget !== this.target){
            if(this.overTarget){
                this.overTarget._pointerLeave();
                this.overTarget = null;
            }
            if(this.target){
                this.overTarget=this.target;
                this.overTarget._pointerEnter(this._pointer3D);
            }
        }else if(this.overTarget){
            this.overTarget._pointerOver(this._pointer3D);
        }
        this.target = null;
    }
    _pointerCancel(e){ // if the user gets locked up for some period or leaves with a pointer state
        if(this.downTarget) this.downTarget._pointerCancel();
        this.downTarget = null;
        if(this.overTarget) this.overTarget._pointerLeave();
        this.overTarget = null;
        this.target = null;
    }

    _pointerWheel(e){
        this._updatePointer(this.lastE);
        if(this.target){
            this._pointer3D.wheel = e;
            this.target._pointerWheel(this._pointer3D);
            this._pointer3D.wheel = undefined; // clear it 
        }else if(this.iPointerWheel)this.iPointerWheel(e); // avatar can use it
    }

    _updatePointer(e){
        this.lastE=e;
        this.xy.x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        this.xy.y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        this._pointercaster.setFromCamera( this.xy, this.camera );
        const intersects = this._pointercaster.intersectObjects( this.scene.eventLayer.children, true );
        if( intersects.length>0){
           // console.log(intersects[0])
            let idata = intersects[0];
            this.target = this.getTarget(idata.object);
            if(this.target){
                this._pointer3D.e = e; // keep the original event
                this._pointer3D.playerId = this.actor.playerId;
                this._pointer3D.rotation = this.actor.rotation;
                this._pointer3D.translation = this.actor.translation;
                this._pointer3D.button = e.button;
                this._pointer3D.distance = idata.distance;
                this._pointer3D.point = idata.point.toArray();
                this._pointer3D.uv = idata.uv.toArray();

                //console.log(this._pointer3D);
                return true;
            }
        } 
        return false; // nothing to see here...
    }

    getTarget( o3d ){ // find the Worldcore Pawn associated with this object.
        if( o3d )return o3d.userData.target || this.getTarget( o3d.parent );
        else return null;
    }
}

