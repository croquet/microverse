import {
    THREE, Actor, Pawn, ModelService,
    PM_ThreeVisible, mix, AM_Predictive, PM_Predictive,
    AM_Smoothed, PM_Smoothed, AM_PointerTarget, PM_PointerTarget,
    Data,
} from '@croquet/worldcore';
import { addShadows, normalizeSVG, addTexture } from './assetManager.js'
import { TextFieldActor } from './text/text.js';

export class DynaverseAppManager extends ModelService {
    init(options) {
        super.init("DynaverseAppManager");
        this.$apps = options.registry; // new Map() {[name]: cls}
    }

    set(name, cls) {
        this.$apps.set(name, cls);
    }
    get(name) {
        return this.$apps.get(name);
    }
    delete(name) {
        return this.$apps.delete(name);
    }
}

DynaverseAppManager.register("DynaverseAppManager");

//------------------------------------------------------
// Surface
// Base class for all surface classes.
// A smart texture added to a card.

export function surfaceFrom(options, card) {
    if (options.type === "text") {
        let surfaceOptions = {
            isSticky: options.isSticky || true,
            color: options.color || 0xf4e056,
            textWidth: options.textWidth || 500,
            textHeight: options.textHeight || 500,
            runs: options.runs || []
        };

        return TextFieldSurface.create({options: surfaceOptions});
    }

    if (options.type === "app") {
        let Cls = card.service("DynaverseAppManager").get(options.name);
        return Cls.create(options);
    }

    if (options.type === "model") {
        return ModelSurface.create(options);
    }

    if (options.type === "shape") {
        return ShapeSurface.create(options);
    }

    if (options.type === "lighting") {
        // we will have to redo this.
        let Cls = card.service("DynaverseAppManager").get(options.name);
        return Cls.create(options);
    }

    if (options.type === "code") {
        let surfaceOptions = {
            isSticky: false,
            color: 0xFFFFFF,
            textWidth: options.textWidth || 500,
            textHeight: options.textHeight || 500,
            isExternal: true,
        };
        return TextFieldSurface.create({options: surfaceOptions});
    }
}

export class Surface extends Actor {
    get pawn(){return SurfacePawn}
    init(options) {
        super.init(options);
    }
    
    uv2xy(uv){return [this.width * uv[0],this.height * (1 - uv[1])];}
    get width(){return this._width || 1024;}
    get height(){return this._height || 1024;}
    get fullBright(){return false;}

}

export class SurfacePawn extends Pawn {
    constructor(actor) {
        super(actor);
    }
    uv2xy(uv){return [this.actor.width * uv[0],this.actor.height * (1 - uv[1])];}

    getBuffer(name) {
        if (name.startsWith("http://") ||
            name.startsWith("https://") ||
            name.startsWith(".") ||
            name.startsWith("/")) {
            return fetch(name)
                .then((resp) => resp.arrayBuffer())
                .then((arrayBuffer) => new Uint8Array(arrayBuffer));
        } else {
            let handle = Data.fromId(name);
            return Data.fetch(this.sessionId, handle);
        }
    }
}
//------------------------------------------------------
// TextureSurface
// Simply loads and maps a texture to the surface.
// To do:
// Allow direct addition of texture instead of via URL.
// Manage loaded objects so that they can be recovered.

export class TextureSurface extends Surface {
    get pawn(){return TextureSurfacePawn}
}
TextureSurface.register('TextureSurface');

class TextureSurfacePawn extends SurfacePawn {
    constructor(actor){
        super(actor);
        this.texture = new THREE.TextureLoader().load(this.actor._url);
    }
}

//------------------------------------------------------
// VideoSurface
// Provides a surface that can play videos
// To do:
// This requires video/audio synchronization - TBD.

export class VideoSurface extends Surface {
}
VideoSurface.register('VideoSurface');

let videoStart = function () {
    let videos = [];
    let onClick = function(){
        videos.forEach((v)=>v.play());
        document.removeEventListener('click', onClick);
    }
    document.addEventListener("click", onClick);
    return function addVideo(video){
        videos.push(video)
    }
}();

class VideoSurfacePawn extends SurfacePawn {}

//------------------------------------------------------
// CanvasSurface
// Surface with an interactive canvas.
// DemoCanvasSurface below demonstrates how to use this.

export class CanvasSurface extends Surface {
    init(options) {
        super.init(options);
    }

    get pawn(){return CanvasSurfacePawn}
    get fullBright(){return true;}
}
CanvasSurface.register('CanvasSurface');

export class CanvasSurfacePawn extends SurfacePawn {
    constructor(actor) {
        super(actor);
        this.canvas = document.createElement('canvas');
        this.canvas.id = this._name || this.id;

        this.canvas.width = this.actor.width;
        this.canvas.height = this.actor.height;
        this.texture = new THREE.CanvasTexture(this.canvas);
    }
}

//------------------------------------------------------
// TextSurface
// Collaborative text editor as a surface

export class TextFieldSurface extends mix(Surface).with(AM_Smoothed) {
    init(options) {
        super.init(options);
        let surfaceOptions = options.options;
        this.textActor = TextFieldActor.create({
            parent: this,
            isSticky: true,
            textWidth: surfaceOptions.textWidth,
            textHeight: surfaceOptions.textHeight,
            runs: surfaceOptions.runs || []
        });
    }

    get pawn(){return TextFieldSurfacePawn}
    get fullBright(){return true;}
}
TextFieldSurface.register('TextFieldSurface');

export class TextFieldSurfacePawn extends mix(SurfacePawn).with(PM_Smoothed) {
}

//------------------------------------------------------
// ModelSurface
// 3D object as a surface

export class ModelSurface extends mix(Surface).with(AM_Predictive) {
    init(options) {
        super.init(options);
        this.creationTime = this.now();
    }

    get pawn(){return ModelSurfacePawn}
}
ModelSurface.register('ModelSurface');

export class ModelSurfacePawn extends mix(SurfacePawn).with(PM_Predictive, PM_ThreeVisible) {
    constructor(actor) {
        super(actor);
        this.construct3D();
        if (actor._layers) {
            this.addToLayers(...actor._layers);
        }
        this.surface3d = new THREE.Group();
        this.setRenderObject(this.surface3d);
    }

    construct3D() {
        let model3d = this.actor._model3d;
        let modelType = this.actor._modelType;
        if (!model3d) {return;}
        let assetManager = this.service("AssetManager").assetManager;

        this.getBuffer(model3d).then((buffer) => {
            assetManager.load(buffer, modelType, THREE).then((obj) => {
                obj.updateMatrixWorld(true);
                addShadows(obj, this.actor._shadow, this.actor._singleSided, THREE);
                if (this.actor._scale) {
                    obj.scale.set(...this.actor._scale);
                } else {
                    let size = new THREE.Vector3(0, 0, 0);
                    new THREE.Box3().setFromObject(obj).getSize(size);
                    let max = Math.max(size.x, size.y, size.z);
                    let s = 4 / max;
                    obj.scale.set(s, s, s);
                }
                if (this.actor._translation) {
                    obj.position.set(...this.actor._translation);
                }
                if (this.actor._rotation) {
                    obj.rotation.set(...this.actor._rotation);
                }
                if (obj._croquetAnimation) {
                    const spec = obj._croquetAnimation;
                    spec.startTime = this.actor.creationTime;
                    this.animationSpec = spec;
                    this.future(500).runAnimation();
                }
                this.surface3d.add(obj);
            });
        });
    }
}
        
//------------------------------------------------------
// ShapeSurface
// An SVG shape that may be extruded

export class ShapeSurface extends mix(Surface).with(AM_Predictive) {
    init(options) {
        super.init(options);
    }

    get pawn(){return ShapeSurfacePawn}
    get fullBright(){return true;}
}
ShapeSurface.register('ShapeSurface');

export class ShapeSurfacePawn extends mix(SurfacePawn).with(PM_Predictive, PM_ThreeVisible) {
    constructor(actor) {
        super(actor);
        this.surface3d = new THREE.Group();
        this.setRenderObject(this.surface3d);

        if (actor._layers) {
            this.addToLayers(...actor._layers);
        }
        
        if (actor._textureType === "video") {
            this.video = document.createElement('video');
            this.video.src = this.actor._textureURL;
            this.video.loop = true;
            videoStart(this.video);
            //this.video.play();
            this.texture = new THREE.VideoTexture(this.video);
        } else if (actor._textureType === "canvas") {
            this.canvas = document.createElement('canvas');
            this.canvas.id = this._name || this.id;

            this.canvas.width = this.actor._width;
            this.canvas.height = this.actor._height;
            this.texture = new THREE.CanvasTexture(this.canvas);
        } else if (actor._textureType === "texture") {
            this.texture = new THREE.TextureLoader().load(this.actor._textureURL);
        }

        let loadOptions = {
            texture: this.texture,
            color: actor._color,
            frameColor: actor._frameColor,
            fullBright: actor._fullBright,
            depth: actor._depth,
        };
        let assetManager = this.service("AssetManager").assetManager;
        this.getBuffer(this.actor._shapeURL).then((buffer) => {
            return assetManager.load(buffer, "svg", THREE, loadOptions);
        }).then((obj) => {
            normalizeSVG(obj, this.actor._depth, this.actor._shadow, THREE);
            this.aspect = obj.aspect;
            obj.scale.set(1, 1, 1);
            if (this.texture) addTexture(this.texture, obj);
            if (this.actor._offset) {
                obj.position.set(...this.actor._offset);
            }
            this.surface3d.add(obj);
        });
    }
}
