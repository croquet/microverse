// Microverse
// TODO:
// https://docs.google.com/document/d/1Z1FsTAEQI699HhTXHURN5aOMEPLFQ1-BDXgFBkcyUGw/edit


import { App, THREE, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
         ThreeRenderManager, AM_Spatial, PM_Spatial, toRad} from "@croquet/worldcore";
import { DLayerManager, PM_ThreeVisibleLayer } from './src/DLayerManager.js';
import { AMVAvatar, PMVAvatar } from './src/MVAvatar.js';
import { D } from './src/DConstants.js';
import { GLTFLoader } from './src/three/examples/jsm/loaders/GLTFLoader.js';
import { TextPopupActor } from './src/popuptext.js';
import { PerlinActor } from './src/PerlinMixin.js';
import { Card } from './src/DCard.js';
import { TextureSurface, VideoSurface, DemoCanvasSurface } from './src/DSurface.js';
import { MultiBlaster } from './src/multiblaster.js';

import JSZip from "jszip";
//import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

const powerPlant = "./assets/refineryx.glb.zip";
const alice  = "./assets/avatars/alice.zip";
const cheshire = "./assets/avatars/cheshirecat.zip";
const hatter = "./assets/avatars/fixmadhatter.zip";
const hare = "./assets/avatars/marchhare.zip";
const queen = "./assets/avatars/queenofhearts.zip";
const rabbit = "./assets/avatars/newwhite.zip";

const a1 = "./assets/avatars/generic/1.zip";
const a2 = "./assets/avatars/generic/2.zip";
const a3 = "./assets/avatars/generic/3.zip";
const a4 = "./assets/avatars/generic/4.zip";
const a5 = "./assets/avatars/generic/5.zip";
const a6 = "./assets/avatars/generic/6.zip";

import skyFront from "./assets/sky/sh_ft.png";
import skyBack from "./assets/sky/sh_bk.png";
import skyRight from "./assets/sky/sh_rt.png";
import skyLeft from "./assets/sky/sh_lf.png";
import skyUp from "./assets/sky/sh_up.png";
import skyDown from "./assets/sky/sh_dn.png";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
console.log("%cJSZip.Version",  'color: #f00', JSZip.version);

async function loadGLB(zip, file, group, onComplete, position, scale, rotation, singleSide){
    await fetch(zip)
    .then(res => res.blob())
    .then(blob => {
        let jsz = new JSZip();
        jsz.loadAsync(blob, {createFolders: true}).then(function(zip){
            zip.file(file).async("ArrayBuffer").then(function(data) {
                (new GLTFLoader()).parse( data, null, function (gltf) {  
                    if(onComplete)onComplete(gltf, singleSide);
                    group.add( gltf.scene );
                    group.updateMatrixWorld ( true );
                    if(position)gltf.scene.position.set(...position);
                    if(scale)gltf.scene.scale.set(...scale);
                    if(rotation)gltf.scene.rotation.set(...rotation);
                    group.ready = true;
                    return group;
                });
            })
        })
    })
}

function addShadows(obj3d, singleSide) {
    obj3d.scene.traverse( n => {
        if(n.material){
            if(singleSide)n.material.side = THREE.FrontSide; //only render front side
            n.material.format = THREE.RGBAFormat; // fixes a bug in GLTF import
            n.castShadow = true;
            n.receiveShadow = true;
        }
    });
}

// these are defined outside of the Worldcore objects, otherwise, they will need to be recreated when the app goes to sleep and restarts again.
let maxAvatars = 12;
let i = 0;
const avatars = []; for(i=0; i<maxAvatars;i++) avatars[i]=new THREE.Group; 
const genericAvatars = [a1,a2,a3,a4,a5,a6]; 
for(i=0; i<6;i++){
    let a = genericAvatars[i]; 
    loadGLB(a, (i+1)+".glb", avatars[i], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
}
if(maxAvatars>6){
    loadGLB(alice, "alice.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    loadGLB(rabbit, "newwhite.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    loadGLB(hatter, "fixmadhatter.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    loadGLB(hare, "march.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    loadGLB(queen, "queenofhearts.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    loadGLB(cheshire, "cheshirecat.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
}

const plant = new THREE.Group();
loadGLB(powerPlant, "refineryx.glb", plant, addShadows, [-152, -3, -228], [2,2,2], [0,0,0], false);

class Avatar extends AMVAvatar{
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
    }

    get pawn() {return AvatarPawn}
}

Avatar.register('Avatar');

class AvatarPawn extends PMVAvatar {

    constructVisual(){
        this.setupAvatar(avatars[this.avatarIndex%avatars.length]);
    }

    setupAvatar(a){// create the avatar (cloned from above) 
        if(a.ready){
            a=this.avatar = a.clone();
            a.traverse( n => {if(n.material)n.material = n.material.clone();});
            this.layer = D.AVATAR;
            this.setRenderObject(a);  // note the extension 
        }else this.future(1000).setupAvatar(a);
    }
}

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisibleLayer) {
    constructor(...args) {
        super(...args);

        this.layer = D.WALK;
        this.setRenderObject( plant );
        this.future(3000).publish(this.sessionId, "popup", {translation: [0, 0, -10]});
    }
}

class MyPlayerManager extends PlayerManager {
    createPlayer(options) {
        options.index = this.count;
        options.lookYaw = toRad(45);
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return Avatar.create(options);
    }
}

MyPlayerManager.register("MyPlayerManager");

class MyModelRoot extends ModelRoot {
    static modelServices() {
        return [MyPlayerManager];
    }
    init(...args) {
        super.init(...args);
        this.level = LevelActor.create();
        this.perlin = PerlinActor.create(
            {translation:[ 4, -2.75, -14],
            rotation:[ 0, -0.7071068, 0, 0.7071068 ]}
        );

        let tSurface = TextureSurface.create({url: './assets/images/Kay.jpg'});
        let chessLightSurface = TextureSurface.create({url: './assets/images/light-wood.jpg'});
        let chessDarkSurface = TextureSurface.create({url: './assets/images/dark-wood.jpg'});
        let vSurface = VideoSurface.create({url:'./assets/videos/fromPCtoHMD.mp4'});
        let cSurface = DemoCanvasSurface.create({name: 'DemoCanvasSurface'});
        let gSurface = MultiBlaster.create({name:'MultiBlaster'});

        let svgCards = ['CroquetSymbol_CMYK_NoShadow.svg', 'square.svg', 'chess-board-solid.svg', 'chess-board-solid.svg', 'credit-card.svg', 
        'square.svg', 'square-full.svg', 'circle.svg', 'compass.svg', 'frown.svg', 'cog.svg'];
        let surfaces = [tSurface, cSurface, chessLightSurface, chessDarkSurface, vSurface, gSurface, tSurface, vSurface, cSurface, tSurface];
        for(let i =0; i<8; i++)
        Card.create(
            {
                cardShape: './assets/SVG/'+svgCards[i],
                cardSurface: surfaces[i],
                cardFullBright: surfaces[i]===vSurface || surfaces[i]===cSurface || surfaces[i]===gSurface,
                cardDepth: 0.1,
                cardBevel:0.02,
                cardColor:i>0?[1,1,1]:undefined, // white
                translation:[-2.5,0,-6*(i+1)],
                scale: [4,4,4],
                cardInstall: true
            }
        );
        this.popup = TextPopupActor.create();
        this.popup.set({translation: [-5, 0, -5]});
    }
}

MyModelRoot.register("MyModelRoot");

class MyViewRoot extends ViewRoot {
    static viewServices() {
        return [InputManager, {service: ThreeRenderManager, options:{antialias:true}}, DLayerManager];
    }
    constructor(model){
        super(model);
        const TRM = this.service("ThreeRenderManager");
        const scene = TRM.scene;

        this.background = scene.background = new THREE.CubeTextureLoader().load([skyFront, skyBack, skyUp, skyDown, skyRight, skyLeft]);
        const ambient = new THREE.AmbientLight( 0xffffff, 0.25 );
        scene.lightLayer.add(ambient);

        const sun = this.sun = new THREE.DirectionalLight( 0xffe0b5, 1 );
        sun.position.set(-200, 800, 100);

        //Set up shadow properties for the light
        sun.castShadow = true;
        sun.shadow.camera.near = 0.5; // default
        sun.shadow.camera.far = 1000; // default
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.zoom = 0.125;
        sun.shadow.bias = -0.0001;
        var side = 15;
        sun.shadow.camera.top = side;
        sun.shadow.camera.bottom = -side;
        sun.shadow.camera.left = side;
        sun.shadow.camera.right = -side;
        scene.lightLayer.add(sun);

        this.moon = new THREE.DirectionalLight( 0x6cbbff, 0.12 );
        this.moon.position.set(200, 100, -100);
        scene.lightLayer.add(this.moon);

        const hemiLight = this.hemiLight = 
            new THREE.HemisphereLight(0xffeeb1, 0xc7ccff, 0.25);
        scene.lightLayer.add(hemiLight);

        const renderer = window.renderer = this.service("ThreeRenderManager").renderer;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;
        renderer.shadowMap.enabled = true;
    }

    destroy() {
        super.destroy();
        this.background.dispose();
        this.sun.dispose();
        this.hemiLight.dispose();
    }
}

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.microverse',
    apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
    name: App.autoSession(),
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    tps:60,
    eventRateLimit: 60,
});


console.log( [
' ',
'  ________  ____  ____  __  ____________ ',
' / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/',
'/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   ',
'\\___/_/|_|\\____/\\___\\_\\____/___/ /_/',  
'  ',
].join( '\n' ) );
