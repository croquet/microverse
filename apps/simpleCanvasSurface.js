import { CanvasSurface, CanvasSurfacePawn} from "../src/DSurface.js";

//------------------------------------------------------
// SimpleCanvasSurface
// A very simple demonstration of how to create a Surface application.

const SPEED = 10;   
export class SimpleCanvasSurface extends CanvasSurface{
    init(...args) {
        super.init(...args);
        this.position = [512,512];
        this.velocity = this.randomVelocity();
        this.radius = 50;
        this.listen("set", this.setPosition);
        this.future(100).bounce();
    }
    get pawn(){return SimpleCanvasSurfacePawn}
    
    randomVelocity() {
        const r = this.random() * 2 * Math.PI;
        return [Math.cos(r) * SPEED, Math.sin(r) * SPEED];
    }

    bounce(){
        let px = this.position[0], py=this.position[1];
        px+=this.velocity[0];
        py+=this.velocity[1];
        let dx = 0, dy = 0;
        if(px<this.radius)dx = 1;
        else if (px>this.width-this.radius) dx = -1;
        if(py<this.radius)dy=1; 
        else if(py>this.height-this.radius)dy = -1;
        if(dx||dy){
            this.velocity=this.randomVelocity();
            if(dx)this.velocity[0]=Math.abs(this.velocity[0])*dx;
            if(dy)this.velocity[1]=Math.abs(this.velocity[1])*dy;
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
SimpleCanvasSurface.register('SimpleCanvasSurface');

export class SimpleCanvasSurfacePawn extends CanvasSurfacePawn{
    constructor(...args){
        super(...args);
        this.updatePosition(this.actor.position);
        // var body = document.getElementsByTagName("body")[0];
        // body.appendChild(this.canvas);
        this.listen("updatePosition", this.updatePosition);
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
}
