// Microverse
// Project Plan:
// https://docs.google.com/document/d/1Z1FsTAEQI699HhTXHURN5aOMEPLFQ1-BDXgFBkcyUGw/edit?usp=sharing

import {
    App, Data, THREE, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix,
    InputManager, PlayerManager, ThreeRenderManager,
    AM_Spatial, PM_Spatial, PM_ThreeVisible, toRad
} from "@croquet/worldcore";
import { PM_LayerTarget } from './src/DLayerManager.js';
import { AvatarActor, AvatarPawn } from './src/DAvatar.js';
import { LightActor } from './src/DLight.js';
import { loadGLB, addShadows } from '/src/LoadGLB.js';
import { TextFieldActor, KeyFocusManager } from './src/text/text.js';
import { PerlinActor } from './src/PerlinMixin.js';
import { CardActor } from './src/DCard.js';
import { TextureSurface, VideoSurface, DemoCanvasSurface } from './src/DSurface.js';
import { MultiBlaster } from './src/multiblaster.js';
import { createChess } from './src/chess.js';
import { BitcoinTracker, BitcoinTrackerView } from './src/extdata.js';

import JSZip from 'jszip';
import * as fflate from 'fflate';
import {AssetManager} from "./src/wcAssetManager.js";
import {loadThreeJSLib} from "./src/ThreeJSLibLoader.js";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
//import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

// these are defined outside of the Worldcore objects, otherwise, they will need to be recreated when the app goes to sleep and restarts again.

const avatars = [];
let plant;

function loadBasicModels() {
    let maxAvatars = 12;
    let i = 0;
    for (i = 0; i < maxAvatars; i++) avatars[i] = new THREE.Group();
    for (i = 0; i < 6; i++) {
        loadGLB(`./assets/avatars/generic/${i + 1}.zip`, avatars[i], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    }
    if (maxAvatars > 6) {
        loadGLB("./assets/avatars/alice.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/newwhite.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/fixmadhatter.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/marchhare.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/queenofhearts.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/cheshirecat.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    }

    plant = new THREE.Group();
    loadGLB("./assets/refineryx.glb.zip", plant, addShadows, [-152, -3, -228], [2,2,2], [0,0,0], false);

};

function loadLoaders() {
    let libs = [
        "loaders/OBJLoader.js",
        "loaders/MTLLoader.js",
        "loaders/GLTFLoader.js",
        "loaders/FBXLoader.js",
        "loaders/DRACOLoader.js",
    ];

    window.JSZip = JSZip;
    window.fflate = fflate;

    return Promise.all(libs.map((file) => {
        return loadThreeJSLib(file, THREE);
    }));
}

loadLoaders().then(loadBasicModels);

class MyAvatar extends AvatarActor {
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
    }

    get pawn() {return MyAvatarPawn;}
}

MyAvatar.register('MyAvatar');

class MyAvatarPawn extends AvatarPawn {

    constructVisual() {
        this.setupAvatar(avatars[this.avatarIndex % avatars.length]);
    }

    setupAvatar(a) {// create the avatar (cloned from above)
        if (a.ready) {
            a = this.avatar = a.clone();
            a.traverse(n => {
                if (n.material) {
                    n.material = n.material.clone();
                }
            });
            this.layers = ['avatar'];
            this.setRenderObject(a);  // note the extension
        } else {
            this.future(1000).setupAvatar(a);
        }
    }
}

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn;}
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_LayerTarget) {
    constructor(...args) {
        super(...args);

        this.layers = ['walk'];
        this.setRenderObject(plant);
    }
}

class MyPlayerManager extends PlayerManager {
    init(name) {
        super.init(name);
        this.avatarCount = 0;
    }
    createPlayer(options) {
        options.index = this.avatarCount;
        this.avatarCount++;
        console.log("MyPlayerManager", this.avatarCount);
        options.lookYaw = toRad(45);
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return MyAvatar.create(options);
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
        this.lights = LightActor.create();
        this.perlin = PerlinActor.create(
            {translation:[ 10, -2.75, -14],
             rotation:[ 0, -0.7071068, 0, 0.7071068 ]}
        );

        let tSurface = TextureSurface.create({url: './assets/images/Kay.jpg'});
        let t2Surface = TextureSurface.create({url: './assets/images/Colony.png'});
       
        let vSurface = VideoSurface.create({url:'./assets/videos/fromPCtoHMD.mp4'});
        let v2Surface = VideoSurface.create({url:'./assets/videos/Colony.mp4'});
        
        let cSurface = DemoCanvasSurface.create({name: 'DemoCanvasSurface'});
        let gSurface = MultiBlaster.create({name:'MultiBlaster'});

        let svgCards = [
            'credit-card.svg', 'square.svg', 'credit-card.svg', 
            'square.svg', 'square-full.svg', 'circle.svg', 'compass.svg', 'credit-card.svg', 'cog.svg'];
        let surfaces = [tSurface, cSurface, vSurface, gSurface, v2Surface, vSurface, cSurface, t2Surface];

        for (let i = 0; i < 8; i++) {
            CardActor.create({
                cardShapeURL: `./assets/SVG/${svgCards[i]}`,
                cardSurface: surfaces[i],
                cardFullBright: surfaces[i] === vSurface || surfaces[i] === cSurface || surfaces[i] === gSurface,
                cardDepth: 0.1,
                cardBevel:0.02,
                cardColor:[1,1,1], // white
                translation:[0,-0.5, -6 * (i + 1)],
                scale: [4,4,4],
                cardInstall: true
            });
        }

        CardActor.create({
            cardFullBright: true,
            cardDepth: 0.1,
            cardBevel:0.02,
            cardColor:[1,1,1], // white
            translation:[5, 0.5, -1],
            text: "Croquet is awesome",
            cardInstall: true
        });
        
        CardActor.create({
            cardFullBright: true,
            cardDepth: 0.1,
            cardBevel:0.02,
            cardColor:[1,1,1], // white
            translation:[3, 0.5, -2],
            model3d: "./assets/avatars/alice.zip",
            modelType: "glb",
            cardInstall: true
        });
        
        //   createChess([8, -2.5, -30], [6,6,6]);

        this.bitcoinTracker = BitcoinTracker.create();

        this.subscribe(this.id, "fileUploaded", "fileUploaded");
    }

    fileUploaded(data) {
        let {dataId, fileName, type} = data;
        // this.assets.set(dataId, dataId, type);
        console.log(dataId, fileName, type);

        CardActor.create({
            cardDepth: 0.1,
            cardBevel:0.02,
            cardColor:[1,1,1], // white
            translation:[0, 0, -6 * (0 + 1)],
            scale: [1,1,1],
            model3d: dataId,
            modelType: type,
            cardInstall: true
        });
        this.publish(this.id, "fileLoadRequested", data);
    }
    
}

MyModelRoot.register("MyModelRoot");

class MyViewRoot extends ViewRoot {
    static viewServices() {
        return [
            InputManager,
            {service: ThreeRenderManager, options:{antialias:true}},
            AssetManager,
            KeyFocusManager
        ];
    }
    constructor(model) {
        super(model);
        const renderer = window.renderer = this.service("ThreeRenderManager").renderer;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;

        this.bitcoin = new BitcoinTrackerView(model.bitcoinTracker);
        console.log("ThreeRenderManager", this.service("ThreeRenderManager"))

        this.assetManager = this.service("AssetManager");
        window.assetManager = this.assetManager.assetManager;

        this.assetManager.assetManager.setupHandlersOn(window, (buffer, fileName, type) => {
            return Data.store(this.sessionId, buffer, true).then((handle) => {
                let dataId = Data.toId(handle);
                this.publish(this.model.id, "fileUploaded", {dataId, fileName, type});
            });
        });
    }

    destroy(){
        this.bitcoin.dispose();
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

console.log(` 
  ________  ____  ____  __  ____________ 
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
