import { THREE, Actor, Pawn } from "@croquet/worldcore";
export class Surface extends Actor{
    get pawn(){return SurfacePawn}
    init(...args) {
        super.init(...args);
    }
}

class SurfacePawn extends Pawn{
    constructor(...args){
        super(...args);
    }
}

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

const SPEED = 10;   
export class CanvasSurface extends Surface{
    init(...args) {
        super.init(...args);
        this.width = this._width || 1024;
        this.height = this._height || 1024;
        this.position = [512,512];
        this.velocity = this.randomVelocity();
        this.radius = 50;
        this.listen("set", this.setPosition);
        this.future(100).bounce();
    }
    get pawn(){return CanvasSurfacePawn}

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
        this.updatePosition(px,py);
        this.future(50).bounce();
    }

    updatePosition(px, py){
        this.position[0]=px;
        this.position[1]=py;
        this.say("updatePosition", this.position);
    }

    setPosition(uv){
        this.updatePosition(this.width*uv[0], this.height*(1-uv[1]));
    }
}
CanvasSurface.register('CanvasSurface');

class CanvasSurfacePawn extends SurfacePawn{
    constructor(...args){
        super(...args);
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.actor.width;
        this.canvas.height = this.actor.height;
        this.canvas.style.zIndex=2000;
        this.texture = new THREE.CanvasTexture(this.canvas);
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