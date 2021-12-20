// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Collaboratve Card

import { AM_Events, PM_Events } from './DEvents.js';
import { THREE, Actor, Pawn, mix, AM_Spatial, PM_Spatial, viewRoot} from "@croquet/worldcore";
import { PM_ThreeVisibleLayer } from './DLayerManager.js';
import { D_CONSTANTS } from './DConstants.js';

const CardColor = 0x9999cc;  // light blue
const OverColor = 0xffff77;   // yellow
const DownColor = 0x88ff88; // green
const NoColor =0x000000; // black

export class Actor_Card extends mix(Actor).with(AM_Spatial, AM_Events){
    get pawn() {return Pawn_Card}
    init(...args) {
        this.visible = true;
        super.init(...args);
        this._translation = [0, 2, -10];
    }

    onPointerDown(p3d){
        this.say("doPointerDown", p3d)
    }
    onPointerUp(p3d){
        this.say("doPointerUp", p3d);
    }
    onPointerCancel(p3d){
        this.say("doPointerCancel", p3d);
    }    
    onPointerMove(p3d){
        this.say("doPointerMove", p3d);
    }
    onPointerEnter(p3d){
        this.say("doPointerEnter", p3d);
    }
    onPointerOver(p3d){
        this.say("doPointerOver", p3d);
    };
    onPointerLeave(p3d){
        this.say("doPointerLeave", p3d);
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
    showHide(){}
}

Actor_Card.register('Actor_Card');

class Pawn_Card extends mix(Pawn).with(PM_Spatial, PM_Events, PM_ThreeVisibleLayer, ){
    constructor(...args) {
        super(...args);
        this.constructCardBase();
    //    this.constructOutline();
        this.listen("doPointerDown", this.doPointerDown);
        this.listen("doPointerMove", this.doPointerMove)
        this.listen("doPointerUp", this.doPointerUp);
        this.listen("doPointerEnter", this.doPointerEnter);
        this.listen("doPointerOver", this.doPointerOver);
        this.listen("doPointerLeave", this.doPointerLeave);
        this.listen("doPointerWheel", this.doPointerWheel);
    }

    constructCardBase()
    {
       // this.color = new THREE.Color();
        this.cardGroup = new THREE.Group();
        this.cardBase = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.1, 2, 2, 1),
            new THREE.MeshStandardMaterial({color: CardColor}));
        this.cardBase.castShadow = true;
        this.cardBase.recieveShadow = true;
        this.cardGroup.add(this.cardBase);
        this.setRenderObject( this.cardGroup, D_CONSTANTS.EVENT_LAYER );
    }

    doPointerDown(p3d){ this.hilite(DownColor)}
    doPointerMove(p3d){}
    doPointerUp(p3d){this.hilite(NoColor)}
    doPointerCancel(p3d){}
    doPointerEnter(p3d){
        this.hilite(OverColor);
    }
    doPointerOver(p3d){}
    doPointerLeave(p3d){this.hilite(NoColor)}
    doPointerWheel(p3d){
/*        let s = this.cube.scale;
        let w = p3d.wheel < 0?-0.1:0.1;
        console.log(s)
        if(s.x+w >0.2){
            this.cube.scale.set(s.x+w, s.y+w, s.z+w);
            this.cube.updateMatrix();
        }
        */
    }
    hilite(color) { 
        this.cardBase.material.emissive = new THREE.Color(color);
    }
}

