// Microverse
// Project Plan:
// https://docs.google.com/document/d/1Z1FsTAEQI699HhTXHURN5aOMEPLFQ1-BDXgFBkcyUGw/edit?usp=sharing

import {
    App, Data, THREE, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix,
    InputManager, PlayerManager, ThreeRenderManager,
    AM_Spatial, PM_Spatial, PM_ThreeVisible, toRad, q_euler, v3_add, v3_scale, v3_sqrMag, v3_normalize
} from "@croquet/worldcore";
import { myAvatarId, AvatarActor, AvatarPawn } from './src/DAvatar.js';
import { LightActor } from './src/DLight.js';
import { loadGLB, addShadows } from '/src/LoadGLB.js';
import { KeyFocusManager, SyncedStateManager } from './src/text/text.js';
import { DCardActor } from './src/DCard.js';
import { TextureSurface, VideoSurface } from './src/DSurface.js';
// apps -------------------------------------------
import { MultiBlaster } from './apps/multiblaster.js';
import { SimpleCanvasSurface } from './apps/simpleCanvasSurface.js';
import { createChess } from './apps/chess.js';
import { PerlinActor } from './apps/perlin.js';
import { constructBitcoin } from './apps/bitcoinTracker.js';

import JSZip from 'jszip';
import * as fflate from 'fflate';
import {AssetManager} from "./src/wcAssetManager.js";
import {loadThreeJSLib} from "./src/ThreeJSLibLoader.js";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
//import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

// these are defined outside of the Worldcore objects, otherwise, they will need to be recreated when the app goes to sleep and restarts again.

const avatars = [];

function loadBasicModels() {
    let maxAvatars = 6;
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

const tackOffset = 0.1;

class MyAvatar extends AvatarActor {
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
        this.listen("addSticky", this.addSticky);
    }

    get pawn() {return MyAvatarPawn;}

    addSticky(pe) {
        let tackPoint = v3_add(pe.xyz, v3_scale(pe.normal, tackOffset));
        let normal = [...pe.normal]; // clear up and down
        normal[1] = 0;
        let nsq = v3_sqrMag(normal);
        let rotPoint;
        if(nsq > 0.0001){
            normal = v3_normalize(normal);
            let theta = Math.atan2(normal[0], normal[2]);
            rotPoint = q_euler(0, theta, 0);
        } else {
            rotPoint = this.rotation;
            tackPoint[1] += 2;
        }

        DCardActor.create({
            // cardShapeURL: `./assets/SVG/credit-card.svg`,
            cardFullBright: true,
            cardDepth: 0.1,
            cardBevel:0.02,
            cardColor:[1, 1, 1], // white
            translation: tackPoint,
            rotation: rotPoint,
            text: "",
            textWidth: 600,
            textHeight: 600
        });
    }
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
            this.addToLayers('avatar');
            this.setRenderObject(a);  // note the extension
        } else {
            this.future(1000).setupAvatar(a);
        }
    }

    shiftDouble(pe) {
        this.say("addSticky", pe);
    }
}

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn;}
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
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


        DCardActor.create({
            translation:[-152, -3, -228],
            cardScale:[2,2,2],
           // translation:[0, 15, 0],
            //scale: [20,20,20],
            layers: ['walk'],
            model3d: "./assets/refineryx.glb.zip",
            modelType: "glb",
        });

        let tSurface = TextureSurface.create({url: './assets/images/Kay.jpg'});
        let t2Surface = TextureSurface.create({url: './assets/images/Colony.png'});
       
        let vSurface = VideoSurface.create({url:'./assets/videos/fromPCtoHMD.mp4'});
        let v2Surface = VideoSurface.create({url:'./assets/videos/Colony.mp4'});
        
        let cSurface = SimpleCanvasSurface.create({name: 'SimpleCanvasSurface'});
        let gSurface = MultiBlaster.create({name:'MultiBlaster'});

        let svgCards = [
            'credit-card.svg', 'square.svg', 'credit-card.svg', 
            'square.svg', 'square-full.svg', 'circle.svg', 'BitcoinSign.svg', 'rectangle.svg', 'cog.svg'];
        let surfaces = [tSurface, cSurface, vSurface, gSurface, v2Surface, vSurface, cSurface];

        for (let i = 0; i < 6; i++) {
            DCardActor.create({
                cardShapeURL: `./assets/SVG/${svgCards[i]}`,
                cardSurface: surfaces[i],
                cardFullBright: surfaces[i].fullBright,
                cardDepth: 0.1,
                cardBevel:0.02,
                cardColor:[1,1,1], // white
                translation:[-4,-0.5, -6 * (i + 1)],
                rotation: q_euler(0, Math.PI / 2, 0),
                scale: [4,4,4],
            });
        }

        DCardActor.create({
            cardFullBright: true,
            cardDepth: 0.1,
            cardBevel:0.02,
            cardColor:[1,1,1], // white
            translation:[5, 0.5, -1],
            text: "Croquet is awesome",
            textWidth: 600,
            textHeight: 600
        });
// demonstrates how to create an object

        //   constructChess([8, -2.5, -30], [6,6,6]);
        this.perlin = PerlinActor.create(
            {translation:[ 10, -2.75, -14],
             rotation:[ 0, -0.7071068, 0, 0.7071068 ]}
        );
        constructBitcoin([-4,-0.5, -6 * 7], q_euler(0,Math.PI/2,0), 4);
        this.subscribe(this.id, "fileUploaded", "fileUploaded");
    }

    fileUploaded(data) {
        let {dataId, fileName, type, avatarId} = data;
        // this.assets.set(dataId, dataId, type);
        console.log(dataId, fileName, type, avatarId);
        let avatar = this.service('ActorManager').get(avatarId);
        
        let n = avatar.lookNormal;
        let t = avatar.translation;
        let r = avatar.rotation;
        console.log("drop here", n, t, r);
        let p = v3_add(v3_scale(n, 6),t);

        DCardActor.create({
            //cardDepth: 0.1,
            //cardBevel:0.02,
            //cardColor:[1,1,1], // white
            translation: p,
            rotation: r,
            //scale: [1,1,1],
            model3d: dataId,
            modelType: type,
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
            KeyFocusManager,
            SyncedStateManager
        ];
    }
    constructor(model) {
        super(model);
        const renderer = this.service("ThreeRenderManager").renderer;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
        console.log("ThreeRenderManager", this.service("ThreeRenderManager"))

        this.assetManager = this.service("AssetManager");
        window.assetManager = this.assetManager.assetManager;

        this.assetManager.assetManager.setupHandlersOn(window, (buffer, fileName, type) => {
            return Data.store(this.sessionId, buffer, true).then((handle) => {
                let dataId = Data.toId(handle);
                let avatarId = myAvatarId;
                this.publish(this.model.id, "fileUploaded", {dataId, fileName, type, avatarId});
            });
        });
    }
}

App.makeWidgetDock();
loadLoaders().then(loadBasicModels).then(() => {
    StartWorldcore({
        appId: 'io.croquet.microverse',
        apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
        name: App.autoSession(),
        password: App.autoPassword(),
        model: MyModelRoot,
        view: MyViewRoot,
        tps:60,
        eventRateLimit: 60,
    });
});

console.log(` 
  ________  ____  ____  __  ____________ 
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
