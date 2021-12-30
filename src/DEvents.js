// Copyright 2022 by Croquet Corporation. All Rights Reserved.
//
// Collaborative event manager for PCs and Mobile.
// Actor_Events and the Pawn_Events are designed to be used together to be 
// mixedin in to an event-based actor/pawn pair. 
//
//
// TO DO:
// Need a way to minimize messages. Only replicate events if the model/view actually need it.
// Time out if a user is in the middle of some event sequence and drops out. 
// - PointerDown - send PointerCancel instead of PointerUp.
// - PointerEnter/PointerOver - send PointerLeave.
// - KeyDown - send KeyCancel instead of KeyUp.

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
        this.listen("_KeyDown", this.onKeyDown);
        this.listen("_KeyUp", this.onKeyUp);
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
    onKeyDown(e){}
    onKeyUp(e){}
}
RegisterMixin(AM_Events);

export const PM_Events = superclass => class extends superclass {
    // the pawn can override these functions if it needs it executed immediately
    wantsPointerEvents(){return true; }
    wantsPointerOverEvents(){return true; }
    wantsKeyEvents(){return true; }
    _pointerDown(p3d){ this.say("_PointerDown", p3d) }
    _pointerUp(p3d){ this.say("_PointerUp", p3d) }
    _pointerMove(p3d){ this.say("_PointerMove", p3d) }
    _pointerCancel(p3d){ this.say("_PointerCancel", p3d) }
    _pointerEnter(p3d){ this.say("_PointerEnter", p3d) }
    _pointerOver(p3d){ this.say("_PointerOver", p3d) }
    _pointerLeave(p3d){ this.say("_PointerLeave", p3d) }
    _pointerWheel(p3d){ this.say("_PointerWheel", p3d); }
    _keyDown(e){ this.say("_KeyDown", e); }
    _keyUp(e){ this.say("_KeyUp", e); }
    handlesKeyEvents(){return true; }
}

//-----------------------------------------------------------------------------------
// PM_AvatarEvents
// Mixin to the avatar to add event management
//
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
        this.subscribe("input", "keyDown", this._keyDown);
        this.subscribe("input", "keyUp", this._keyUp);
        this._pointercaster = new THREE.Raycaster();
        this.xy = {x:0, y:0}; // reuse this
        this._pointer3D = {};
        this._ray3D = {};
        //document.addEventListener('keypress', this._keyAction); // should use input but that is broken
    }

    _pointerDown(e){
        if(this._updatePointer(e)){
            this.downTarget = this.target;
            if(this.overTarget)this.overTarget._pointerLeave(this._pointer3D);
            this.overTarget = null;
            this.downTarget._pointerDown(this._pointer3D);
            if(this.downTarget.handlesKeyEvents()){this.focusTarget = this.downTarget; }
        }
    }
    _pointerUp(e){
        if(this.downTarget){
            this._updatePointer(e); // we need to know if the pointerUp occurred ON the object
            this._pointer3D.sameTarget = this.downTarget === this.target; // pointerUp on target?
            this.downTarget._pointerUp(this._pointer3D);
            this.downTarget = null;
        }
        //this._pointerMove(e); // check for pointerOver
    }
    _pointerMove(e){
        this._updatePointer(e);
        if(this.downTarget){
            this._pointer3D.sameTarget = this.downTarget === this.target;
            this.downTarget._pointerMove(this._pointer3D);
        }
        else if(this.overTarget !== this.target){
            if(this.overTarget){
                this.overTarget._pointerLeave(this._pointer3D);
                this.overTarget = null;
            }
            if(this.target){
                this.overTarget=this.target;
                this.overTarget._pointerEnter(this._pointer3D);
            }
        }else if(this.overTarget){
            this.overTarget._pointerOver(this._pointer3D);
        }
    }
    _pointerCancel(e){ // if the user gets locked up for some period or leaves with a pointer state
        if(this.downTarget) this.downTarget._pointerCancel();
        this.downTarget = null;
        if(this.overTarget) this.overTarget._pointerLeave();
        this.overTarget = null;
    }

    _pointerWheel(e){
        this._updatePointer(this.lastE);
        if(this.target){
            this._pointer3D.wheel = e;
            this.target._pointerWheel(this._pointer3D);
            this._pointer3D.wheel = undefined; // clear it 
        }else if(this.iPointerWheel)this.iPointerWheel(e); // avatar can use it
    }

    _keyDown(e){
        if(this.focusTarget)this.focusTarget._keyDown(e);
    }

    _keyUp(e){
        if(this.focusTarget)this.focusTarget._keyUp(e);
    }

    _updatePointer(e){
        this.lastE=e;
        this.target = null;
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
                // avatar info
                this._pointer3D.playerId = this.actor.playerId;
                this._pointer3D.rotation = this.actor.rotation;
                this._pointer3D.translation = this.actor.translation; 
                this._pointer3D.button = e.button; // which button is pressed
                this._pointer3D.distance = idata.distance; // how far away are we from the avatar start
                this._pointer3D.point = idata.point.toArray(); // where on the target are we selecting?
                this._pointer3D.uv = idata.uv.toArray(); // where on the 2D face of the target are we selecting?
                this._pointer3D.rayDirection = this._pointercaster.ray.direction.toArray(); 
                return true;
            }
        } else { //update the pointer - we will use this to update the avatar in some way
            this._ray3D.direction = this._pointercaster.ray.direction.toArray();
        }
        return false; // nothing to see here...
    }

    getTarget( o3d ){ // find the Worldcore Pawn associated with this object.
        if( o3d )return o3d.userData.target || this.getTarget( o3d.parent );
        else return null;
    }
}

