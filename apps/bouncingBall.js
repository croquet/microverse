// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { CardActor, CardPawn} from "../src/DCard.js";

//------------------------------------------------------
// BouncingBall
// A very simple demonstration of how to create a Surface application.

const SPEED = 10;   
export class BouncingBall extends CardActor {
    init(options) {
        super.init(options);
        this.position = [512,512];
        this.ballVelocity = this.randomVelocity();
        this.radius = 50;
        this.listen("set", this.setPosition);
        this.future(100).bounce();
    }
    get pawn(){return BouncingBallPawn;}

    randomVelocity() {
        const r = this.random() * 2 * Math.PI;
        return [Math.cos(r) * SPEED, Math.sin(r) * SPEED];
    }

    bounce(){
        let px = this.position[0], py=this.position[1];
        let vel = this.ballVelocity;
        px+=vel[0];
        py+=vel[1];
        let dx = 0, dy = 0;
        if(px<this.radius)dx = 1;
        else if (px>this.width-this.radius) dx = -1;
        if(py<this.radius)dy=1; 
        else if(py>this.height-this.radius)dy = -1;
        if(dx||dy){
            this.ballVelocity=this.randomVelocity();
            if(dx)this.ballVelocity[0]=Math.abs(this.ballVelocity[0])*dx;
            if(dy)this.ballVelocity[1]=Math.abs(this.ballVelocity[1])*dy;
        }
        this.updatePosition([px,py]);
        this.future(50).bounce();
    }

    updatePosition(p){
        this.position[0]=p[0];
        this.position[1]=p[1];
        this.say("updatePosition", this.position);
    }

    setPosition(uv){
        let p = this.uv2xy(uv);
        this.updatePosition(p);
    }
}
BouncingBall.register('BouncingBall');

export class BouncingBallPawn extends CardPawn {
    constructor(options) {
        super(options);
        this.updatePosition(this.actor.position);
        this.listen("updatePosition", this.updatePosition);
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerMove", "onPointerMove");    
    }

    clear(fill){
        let ctx = this.canvas.getContext('2d');
        ctx.fillStyle = fill;
        ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );
    }

    updatePosition(pos){
        this.clear('#FFFFFF');
        let ctx = this.canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], this.actor.radius, 0, Math.PI*2, true);
        ctx.fill();
        this.texture.needsUpdate=true;
    }

    onPointerDown(p3d){
        this.say("set", p3d.uv);
    }

    onPointerMove(p3d) {
        this.say("set", p3d.uv);
    }
}
