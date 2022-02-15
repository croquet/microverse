// Microverse
// Project Plan:
// https://docs.google.com/document/d/1Z1FsTAEQI699HhTXHURN5aOMEPLFQ1-BDXgFBkcyUGw/edit?usp=sharing

import {
    Constants, App, Data, THREE, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix,
    InputManager, PlayerManager, ThreeRenderManager,
    AM_Spatial, PM_Spatial, PM_ThreeVisible, toRad, q_euler, v3_add, v3_scale, v3_sqrMag, v3_normalize
} from "@croquet/worldcore";
import { myAvatarId, AvatarActor, AvatarPawn } from './src/DAvatar.js';
import { LightActor } from './src/DLight.js';
import { KeyFocusManager, SyncedStateManager } from './src/text/text.js';
import { DCardActor } from './src/DCard.js';
import { TextureSurface, VideoSurface } from './src/DSurface.js';
// apps -------------------------------------------
import { MultiBlaster } from './apps/multiblaster.js';
import { SimpleCanvasSurface } from './apps/simpleCanvasSurface.js';
import { createChess } from './apps/chess.js';
import { PerlinActor } from './apps/perlin.js';
import { constructBitcoin } from './apps/bitcoinTracker.js';
import { constructFlamingo } from './apps/flamingo.js';
import JSZip from 'jszip';
import * as fflate from 'fflate';
import {AssetManager} from "./src/wcAssetManager.js";
import {loadThreeJSLib} from "./src/ThreeJSLibLoader.js";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
//import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

Constants.MaxAvatars = 6;
Constants.AvatarNames = [
    "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
    "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
];

function loadLoaders() {
    let libs = [
        "loaders/OBJLoader.js",
        "loaders/MTLLoader.js",
        "loaders/GLTFLoader.js",
        "loaders/FBXLoader.js",
        "loaders/DRACOLoader.js",
        "loaders/SVGLoader.js",
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
    }

    get pawn() {return MyAvatarPawn;}
}

MyAvatar.register('MyAvatar');

class MyAvatarPawn extends AvatarPawn {
    constructVisual() {
        this.setupAvatar(this.getAvatarModel(this.avatarIndex % Constants.MaxAvatars));
    }

    shiftDouble(pe) {
        this.say("addSticky", pe);
    }

    destroy(){
        console.log("Am I getting here?")
        super.destroy();
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
    init(options, persistentData) {
        super.init(options);
        this.lights = LightActor.create();
        DCardActor.create({
            translation: [0, 0, -5],
            options: {
                type: "text",
                runs: [{text: "hello"}]
            }
        });

        DCardActor.create({
            translation: [1, 0, -3],
            options: {
                type: "model",
                model3d: "./assets/avatars/generic/1.zip",
                modelType: "glb",
                shadow: true,
                singleSided: true,
            }
        });

        DCardActor.create({
            translation: [-1, -5, -30],
            options: {
                type: "shape",
                textureType: "video",
                textureURL: "./assets/videos/fromPCtoHMD.mp4",
                shapeURL: './assets/SVG/credit-card.svg',
                frameColor: 0x666666,
                color: 0xffffff,
                depth: 0.05,
                fullBright: true
            }
        });

        DCardActor.create({
            translation: [-10, -5, -31],
            options: {
                type: "shape",
                textureType: "canvas",
                width: 400,
                height: 400,
                shapeURL: './assets/SVG/credit-card.svg',
                frameColor: 0x666666,
                color: 0xffffff,
                depth: 0.05,
                fullBright: true
            }
        });
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
loadLoaders().then(() => {
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
