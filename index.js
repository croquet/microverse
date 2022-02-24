// Microverse
// Project Plan:
// https://docs.google.com/document/d/1Z1FsTAEQI699HhTXHURN5aOMEPLFQ1-BDXgFBkcyUGw/edit?usp=sharing

import {
    Constants, App, Data, THREE, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix,
    InputManager, PlayerManager, ThreeRenderManager,
    AM_Spatial, PM_Spatial, PM_ThreeVisible, toRad, q_euler, v3_add, v3_scale, v3_sqrMag, v3_normalize
} from "@croquet/worldcore";
import { myAvatarId, AvatarActor, AvatarPawn } from './src/DAvatar.js';
//import { LightActor } from './src/DLight.js';
import { KeyFocusManager, SyncedStateManager } from './src/text/text.js';
import { CardActor, VideoManager, DynaverseAppManager } from './src/DCard.js';
import { ExpanderModelManager, ExpanderViewManager } from './src/code.js';
import { DLight } from './src/DLight.js';
import { WorldSaver } from './src/worldSaver.js';
// apps -------------------------------------------
import { MultiBlaster } from './apps/multiblaster.js';
import { BouncingBall } from './apps/bouncingBall.js';
import { createChess } from './apps/chess.js';
import { PerlinActor } from './apps/perlin.js';
import { TextFieldActor } from './src/text/text.js';
import { BitcoinTracker, BitLogoCard, constructBitcoinTracker } from './apps/bitcoinTracker.js';
import { DBarGraphCard } from './src/DBar.js';
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

Constants.DefaultCards = [
    {
        card: {
            translation:[25, -90.5, -60],
            scale:[200, 200, 200],
            rotation: q_euler(0, Math.PI, 0),
            layers: ['walk'],
            type: "model",
            dataLocation: "./assets/3D/Refinery.glb.zip",
            singleSided: true,
            shadow: true,
            placeholder: true,
            placeholderSize: [40, 1, 40],
            placeholderColor: 0x808080,
            placeholderOffset: [0, -0.065, 0],
        }
    },
    {
        card: {
            type: "lighting",
            name: "Light",
            className: "DLight",
        }
    },
    {
        card: {
            className: "PerlinActor",
            translation:[ 10, -2.75, -14],
            rotation:[ 0, -0.7071068, 0, 0.7071068 ],
        }
    },
    {
        card: {
            className: "TextFieldActor",
            translation: [-4, -0.5, -6],
            rotation: q_euler(0, Math.PI / 2, 0),
            multiuser: true,
            depth: 0.05,
            type: "text",
            dataLocation: './assets/SVG/credit-card.svg',
            runs: [{text: "hello"}],
            isSticky: true,
            color: 0xf4e056,
            width: 1,
            height: 1,
            textScale: 0.0025
        }
    },
    {
        card: {
            translation: [-4, -0.5, -12],
            rotation: q_euler(0, Math.PI / 2, 0),
            type: "model",
            dataLocation: "./assets/avatars/generic/1.zip",
            shadow: true,
            singleSided: true,
        }
    },
    {
        card: {
            translation: [-4, -0.5, -18],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            type: "svg",
            dataLocation: './assets/SVG/credit-card.svg',
            textureType: "video",
            textureLocation: "./assets/videos/fromPCtoHMD.mp4",
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true
        }
    },
    {
        card: {
            translation: [-4, -0.5, -24],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            type: "svg",
            dataLocation: './assets/SVG/credit-card.svg',
            textureType: "image",
            textureLocation: './assets/images/Colony.png',
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true
        }
    },
    {
        card: {
            className: "MultiBlaster",
            translation: [-4, -0.5, -30],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            layers: ['pointer'],
            multiuser: true,
            type: "svg",
            dataLocation: './assets/SVG/square.svg',
            textureType: "canvas",
            width: 1024,
            height: 1024,
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true
        }
    },
    {
        card: {
            className: "BouncingBall",
            translation: [-4, -0.5, -36],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            layers: ['pointer'],
            multiuser: true,
            type: "svg",
            dataLocation: './assets/SVG/square.svg',
            textureType: "canvas",
            width: 1024,
            height: 1024,
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true,
        }
    },
    {
        card: {
            translation: [10, 0, 5],
            rotation: q_euler(0, -Math.PI / 2, 0),
            scale: [4, 4, 4],
            layers: ['pointer'],
            type: "code",
            runs: [{text: `
class Fly {
    setup() {
        if (this.flying) {return;}
        this.flying = true;
        this.fly();
        this.addEventListener("pointerDown", "toggle");
    }

    fly() {
        if (!this.flying) {return;}
        this.future(20).call("Fly", "fly");
        this.rotateTo(WorldCore.q_euler(0, this.now()/9000,0));
    }

    toggle() {
        this.flying = !this.flying;
        if (this.flying) {
           this.fly();
        }
    }
}`}],
            textScale: 0.001,
            width: 2,
            height: 2,
        },
        id: "Fly"
    },
    {
        card: {
            rotation: q_euler(0, 0, 0),
            offset: [8, 3, 0], // offset the flamingo model from the center
            type: "model",
            dataLocation: './assets/3D/Flamingo.glb.zip',
            actorCode: ["Fly"]
        }
    }
];

let apps = new Map();

function loadLoaders() {
    return loadThreeJSLib("postprocessing/Pass.js", THREE).then
    (loadThreeJSLib("shaders/CopyShader.js", THREE)).then
    (()=>{
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
    });
}

function shortId(id) {
    let index = id.lastIndexOf("/");
    if (index < 0) {return id;}
    return id.slice(index + 1);
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

        TextFieldActor.create({
            className: "TextFieldActor",
            translation: tackPoint,
            rotation: rotPoint,
            multiusexor: true,
            type: "text",
            depth: 0.05,
            isSticky: true,
            color: 0xf4e056,
            frameColor: 0x666666,
            runs: [],
            width: 1,
            height: 1,
            textScale: 0.004
        });
        this.publish(this.sessionId, "triggerPersist");
    }
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
        // options.lookYaw = toRad(45); for testing
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return MyAvatar.create(options);
    }
}

MyPlayerManager.register("MyPlayerManager");

class MyModelRoot extends ModelRoot {
    static modelServices() {
        return [
            MyPlayerManager,
            {service: DynaverseAppManager, options: {registry: apps}},
            ExpanderModelManager
        ];
    }
    init(options, persistentData) {
        super.init(options);

        this.ensurePersistenceProps();
        this.subscribe(this.sessionId, "triggerPersist", "triggerPersist");

        this.subscribe(this.id, "fileUploaded", "fileUploaded");

        let appManager = this.service("DynaverseAppManager");
        appManager.add(BitcoinTracker);
        appManager.add(DBarGraphCard);
        appManager.add(BitLogoCard);
        appManager.add(MultiBlaster);
        appManager.add(BouncingBall);
        appManager.add(PerlinActor);
        appManager.add(DLight);
        appManager.add(TextFieldActor);

        if (persistentData) {
            this.loadPersistentData(persistentData);
            return;
        }

        this.load(Constants.DefaultCards, "1");
        this.load(constructBitcoinTracker(), "1");
    }

    ensurePersistenceProps() {
        if (!this.persistPeriod) {
            let period = 1 * 60 * 1000;
            this.persistPeriod = period;
        }
        if (this.lastPersistTime === undefined) {
            this.lastPersistTime = 0;
        }

        if (this.persistRequested === undefined) {
            this.persistRequested = false;
        }
    }

    loadPersistentData({ _name, version, data }) {
        try {
            delete this.loadingPersistentDataErrored;
            this.loadingPersistentData = true;

            let saver = new WorldSaver(CardActor);
            let json = saver.parse(data);
            this.load(json, version);
        } catch (error) {
            console.error("error in loading persistent data", error);
            this.loadingPersistentDataErrored = true;
        } finally {
            delete this.loadingPersistentData;
        }
    }

    savePersistentData() {
        if (this.loadingPersistentData) {return;}
        if (this.loadingPersistentDataErrored) {return;}
        this.lastPersistTime = this.now();
        let func = () => {
            let name = this.sessionName || "Unknown";
            let saver = new WorldSaver(CardActor);
            let json = saver.save(this);
            return {name, version: "1", data: saver.stringify(json)};
        };
        this.persistSession(func);
    }
    

    load(array, version) {
        if (version === "1") {
            return CardActor.load(array, this, version);
        }
    }

    triggerPersist() {
        let now = this.now();
        let diff = now - this.lastPersistTime;
        let period = this.persistPeriod;
        if (diff < period) {
            if (!this.persistRequested) {
                this.persistRequested = true;
                this.future(period - diff).triggerPersist();
            }
            //console.log("persist not ready");
            return;
        }
        this.lastPersistTime = now;
        this.persistRequested = false;
        this.savePersistentData();
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

        CardActor.create({
            translation: p,
            rotation: r,
            type: "model",
            dataLocation: dataId,
            fileName,
            modelType: type,
            shadow: true,
            singleSided: true
        });
        this.publish(this.id, "fileLoadRequested", data);
        this.publish(this.sessionId, "triggerPersist");
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
            SyncedStateManager,
            VideoManager,
            ExpanderViewManager
        ];
    }
    constructor(model) {
        super(model);
        const threeRenderManager = this.service("ThreeRenderManager");
        const renderer = threeRenderManager.renderer;

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
loadLoaders().then(()=>{
    StartWorldcore({
        appId: 'io.croquet.microverse',
        apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
        name: App.autoSession(),
        password: App.autoPassword(),
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 30,
        eventRateLimit: 60,
    });
});

console.log(` 
  ________  ____  ____  __  ____________ 
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
