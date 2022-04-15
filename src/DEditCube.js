// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Collaboratve Pointer Event Test Object

import { Actor_Events, Pawn_Events } from './DEvents.js';
import { THREE, Actor, Pawn, mix, AM_Spatial, PM_Spatial, viewRoot} from "@croquet/worldcore";
import { PM_ThreeVisibleLayer } from './DLayerManager.js';
import { D_CONSTANTS } from './DConstants.js';

const CubeColor = 0x9999cc;  // light blue
const OverColor = 0xffff77;   // yellow
const DownColor = 0x88ff88; // green
const NoColor =0x000000; // black

export class AM_EditCube extends mix(Actor).with(AM_Spatial, Actor_Events){
    get pawn() {return PM_EditCube}
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

AM_EditCube.register('AM_EditCube');

class PM_EditCube extends mix(Pawn).with(PM_Spatial, Pawn_Events, PM_ThreeVisibleLayer, ){
    constructor(...args) {
        super(...args);
        this.constructCube();
    //    this.constructOutline();
        this.listen("doPointerDown", this.doPointerDown);
        this.listen("doPointerMove", this.doPointerMove)
        this.listen("doPointerUp", this.doPointerUp);
        this.listen("doPointerEnter", this.doPointerEnter);
        this.listen("doPointerOver", this.doPointerOver);
        this.listen("doPointerLeave", this.doPointerLeave);
        this.listen("doPointerWheel", this.doPointerWheel);
    }

    constructCube()
    {
       // this.color = new THREE.Color();
        this.cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 2, 2, 2),
            new THREE.MeshStandardMaterial({color: CubeColor}));
        console.log(this.actor)
        //this.cube.position.set()
        this.setRenderObject( this.cube, D_CONSTANTS.EVENT_LAYER );
    }

    doPointerDown(p3d){ this.hilite(DownColor)}
    doPointerMove(p3d){}
    doPointerUp(p3d){this.hilite(NoColor)}
    doPointerCancel(p3d){}
    doPointerEnter(p3d){this.hilite(OverColor)}
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
        this.cube.material.emissive = new THREE.Color(color);
    }
}

