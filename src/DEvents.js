// Copyright 2022 by Croquet Corporation. All Rights Reserved.
//
// Collaborative event manager for PCs and Mobile.
// Actor_Events and the Pawn_Events are designed to be used together to extend an 
// event-based actor/pawn pair. 
//
// The PM_AvatarEvents is used to generate events, usually by extending an avatar.

import { RegisterMixin, THREE } from "@croquet/worldcore";

import { D_CONSTANTS } from './DConstants.js';

export const Actor_Events = superclass => class extends superclass {
    init(...args) {
        super.init(...args);
        this.listen("pointerDown", this.onPointerDown);
        this.listen("pointerUp", this.onPointerUp);
        this.listen("pointerCancel", this.onPointerCancel);
        this.listen("pointerMove", this.onPointerMove);
        this.listen("pointerEnter", this.onPointerEnter);
        this.listen("pointerOver", this.onPointerOver);
        this.listen("pointerLeave", this.onPointerLeave);
    }

    // extended class has responsibility to redefine these functions.
    onPointerDown(p3d){}
    onPointerUp(p3d){}
    onPointerCancel(p3d){}    
    onPointerMove(p3d){}
    onPointerEnter(p3d){}
    onPointerOver(p3d){}
    onPointerLeave(p3d){}
}
RegisterMixin(Actor_Events);

export const Pawn_Events = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        console.log("P_Events !!!!!!", this.isMyPlayerPawn)

        if(this.isMyPlayerPawn) this.setupEvents();
        this.xy = {x:0, y:0}; // reuse this
    }

    pointerDown(p3d){this.say("pointerDown", p3d)}
    pointerUp(p3d){this.say("pointerUp", p3d)}
    pointerMove(p3d){this.say("pointerMove", p3d)}
    pointerCancel(p3d){this.say("pointerCancel", p3d)}
    pointerEnter(p3d){this.say("pointerEnter", p3)}
    pointerOver(p3d){this.say("pointerOver", p3d)}
    pointerLeave(p3d){this.say("pointerLeave", p3d)}

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
        this.subscribe("input", "pointerDown", this.pointerDown);
        this.subscribe("input", "pointerUp", this.pointerUp);
        this.subscribe("input", "pointerCancel", this.pointerCancel);
        this.subscribe("input", "pointerMove", this.pointerMove);
        this.subscribe("input", "wheel", this.pointerWheel);
        this.pointercaster = new THREE.Raycaster();
        this.xy = {x:0, y:0}; // reuse this
        document.addEventListener('keypress', this.keyAction); // should use input but that is broken
    }

    pointerDown(e){
        if(this.updatePointer(e)){
            this.downTarget = this.target;
            if(this.overTarget)this.overTarget.say("pointerLeave");
            this.overTarget = null;
            this.downTarget.say("pointerDown", this.pointer3D);
        }
        this.target = null;
    }
    pointerUp(e){
        if(this.downTarget){
            this.downTarget.say("pointerUp", this.pointer3D);
            this.downTarget = null;
        }
        this.pointerMove(e); // check for pointerOver
    }
    pointerMove(e){
        this.updatePointer(e);
        if(this.downTarget){this.downTarget.say("pointerMove", this.pointer3D)}
        else if(this.overTarget !== this.target){
            if(this.overTarget){
                this.overTarget.say("pointerLeave");
                this.overTarget = null;
            }
            if(this.target){
                this.overTarget=this.target;
                this.overTarget.say("pointerEnter", this.pointer3D);
            }
        }else if(this.overTarget){
            this.overTarget.say("pointerOver", this.pointer3D);
        }
        this.target = null;
    }
    pointerCancel(e){ // if the user gets locked up for some period or leaves with a pointer state
        if(this.downTarget) this.downTarget.say("pointerCancel");
        if(this.overTarget) this.overTarget.say("pointerLeave");
        this.target = null;
    }

    pointerWheel(e){
    }

    updatePointer(e){
        this.xy.x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        this.xy.y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;

        this.pointercaster.setFromCamera( this.xy, this.camera );
        const intersects = this.pointercaster.intersectObjects( this.scene.eventLayer.children, true );
        if( intersects.length>0){
           // console.log(intersects[0])
            this.target = this.getTarget(intersects[0].object);
            if(this.target){
                this.pointer3D.e = e; // keep the original event
                this.pointer3D.playerId = this.actor.playerId;
                this.pointer3D.button = e.button;
                //console.log(this.pointer3D);
                return true;
            }
        } 
        return false; // nothing to see here...
    }

    getTarget( o3d ){ // find the Worldcore Pawn associated with this object.
        if( o3d )return o3d.userData || this.getTarget( o3d.parent );
        else return null;
    }
}

