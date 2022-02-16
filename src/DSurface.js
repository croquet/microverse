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

    sayDeck(message, vars){
        if(this._parent !== undefined)this.publish(this._parent.id, message, vars);
        else this.publish(this.id, message, vars);
    }
    
    listenDeck(message, method){
        if(this._parent !== undefined)this.subscribe(this._parent.id, message, method);
        else this.subscribe(this.id, message, method);
    }

    get width(){return this._width || 1024}
    get height(){return this._height || 1024}
    get fullBright(){return false;}
}
class SurfacePawn extends Pawn{
    constructor(...args){
        super(...args);
    }

    uv2xy(uv){return [this.actor.width*uv[0],this.actor.height*(1-uv[1])]}

    sayDeck(message, vars){
        if(this.actor._parent !== undefined)this.publish(this.actor._parent.id, message, vars);
        else this.publish(this.actor.id, message, vars);
    }
    
    listenDeck(message, method){
        if(this.actor._parent !== undefined)this.subscribe(this.actor._parent.id, message, method);
        else this.subscribe(this.actor.id, message, method);
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
    get fullBright(){return true;}
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
    init(options) {
        super.init(options);
    }

    get pawn(){return CanvasSurfacePawn}
    get fullBright(){return true;}
}
CanvasSurface.register('CanvasSurface');

export class CanvasSurfacePawn extends SurfacePawn{
    constructor(actor) {
        super(actor);
        this.canvas = document.createElement('canvas');
        this.canvas.id = this._name || this.id;

        this.canvas.width = this.actor.width;
        this.canvas.height = this.actor.height;
        this.texture = new THREE.CanvasTexture(this.canvas);
    }
}
