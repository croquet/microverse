import { THREE, Actor, Pawn } from "@croquet/worldcore";

//------------------------------------------------------
// Surface
// Base class for all surface classes.
// A smart texture added to a card.

export class Surface extends Actor{
    get pawn(){return SurfacePawn}
    init(...args) {
        super.init(...args);
    }
    uv2xy(uv){return [this.width*uv[0],this.height*(1-uv[1])]}
}
class SurfacePawn extends Pawn{
    constructor(...args){
        super(...args);
    }
}
//------------------------------------------------------
// TextureSurface
// Simply loads and maps a texture to the surface.
// To do:
// Allow direct addition of texture instead of via URL.
// Manage loaded objects so that they can be recovered.

export class TextureSurface extends Surface{
    get pawn(){return TextureSurfacePawn}
}
TextureSurface.register('TextureSurface');

class TextureSurfacePawn extends SurfacePawn{
    constructor(...args){
        super(...args);
        this.texture = new THREE.TextureLoader().load(this.actor._url);
    }
}

//------------------------------------------------------
// VideoSurface
// Provides a surface that can play videos
// To do:
// This requires video/audio synchronization - TBD.

export class VideoSurface extends Surface{
    // this needs to synchronize the video
    get pawn(){return VideoSurfacePawn}
}
VideoSurface.register('VideoSurface');

let videoStart = function (){
    let videos=[];
    let onClick = function(){
        videos.forEach((v)=>v.play());
        document.removeEventListener('click', onClick);
    }
    document.addEventListener("click", onClick);
    return function addVideo(video){
        videos.push(video)
    }
}();

class VideoSurfacePawn extends SurfacePawn{
    constructor(...args){
        super(...args);
        this.video = document.createElement('video');
        this.video.src = this.actor._url;
        this.video.loop = true;
        videoStart(this.video);
        //this.video.play();
        this.texture = new THREE.VideoTexture(this.video);

    }
}

//------------------------------------------------------
// CanvasSurface
// Surface with an interactive canvas.
// DemoCanvasSurface below demonstrates how to use this.

export class CanvasSurface extends Surface{
    init(...args) {
        super.init(...args);
        console.log(this)
        this.width = this._width || 1024;
        this.height = this._height || 1024;
    }
    get pawn(){return CanvasSurfacePawn}
}
CanvasSurface.register('CanvasSurface');

export class CanvasSurfacePawn extends SurfacePawn{
    constructor(...args){
        super(...args);
        console.log(this);
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute("id", this._name);

        this.canvas.width = this.actor.width;
        this.canvas.height = this.actor.height;
        this.canvas.style.zIndex=2000;
        this.texture = new THREE.CanvasTexture(this.canvas);
    }
}

//------------------------------------------------------
// DemoCanvasSurface
// A very simple demonstration of how to create a Surface application.

const SPEED = 10;   
export class DemoCanvasSurface extends CanvasSurface{
    init(...args) {
        super.init(...args);
        this.position = [512,512];
        this.velocity = this.randomVelocity();
        this.radius = 50;
        this.listen("set", this.setPosition);
        this.future(100).bounce();
    }
    get pawn(){return DemoCanvasSurfacePawn}
    
    randomVelocity() {
        const r = this.random() * 2 * Math.PI;
        return [Math.cos(r) * SPEED, Math.sin(r) * SPEED];
    }

    bounce(){
        let px = this.position[0], py=this.position[1];
        px+=this.velocity[0];
        py+=this.velocity[1];
        if(px<this.radius || 
            px>this.width-this.radius ||
            py<this.radius || 
            py>this.height-this.radius)this.velocity=this.randomVelocity();
        if(px<0)px=this.radius;
        if(px>this.width)px=this.width-this.radius;
        if(py<0)py=this.radius;
        if(py>this.height)py=this.height-this.radius;
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
DemoCanvasSurface.register('DemoCanvasSurface');

export class DemoCanvasSurfacePawn extends CanvasSurfacePawn{
    constructor(...args){
        super(...args);
        this.updatePosition(this.actor.position);
        var body = document.getElementsByTagName("body")[0];
        body.appendChild(this.canvas);
        this.listen("updatePosition", this.updatePosition);
    }

    clear(){
        let ctx = this.canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFFFF';
        ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );
    }

    updatePosition(pos){
        this.clear();
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