// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {
    Constants, App, THREE, ModelRoot, ViewRoot, StartWorldcore,
    InputManager, PlayerManager, ThreeRenderManager} from "@croquet/worldcore";
import { AvatarManager, AvatarActor, } from './src/DAvatar.js';
import {
    KeyFocusManager, SyncedStateManager,
    FontModelManager, FontViewManager } from './src/text/text.js';
import { CardActor, VideoManager, DynaverseAppManager } from './src/DCard.js';
import { ExpanderModelManager, ExpanderViewManager } from './src/code.js';
import { DLight } from './src/DLight.js';
import { TextFieldActor } from './src/text/text.js';
import { WorldSaver } from './src/worldSaver.js';
// apps -------------------------------------------
import { MultiBlaster } from './apps/multiblaster.js';
import { BouncingBall, BouncingLogo } from './apps/bouncingBall.js';
import { PerlinActor } from './apps/perlin.js';
import { BitcoinTracker, BitLogoCard } from './apps/bitcoinTracker.js';
import { DBarGraphCard } from './src/DBar.js';

import JSZip from 'jszip';
import * as fflate from 'fflate';
import {AssetManager} from "./src/wcAssetManager.js";
import {loadThreeJSLib} from "./src/ThreeJSLibLoader.js";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);

function loadLoaders() {
    return loadThreeJSLib("postprocessing/Pass.js", THREE)
        .then(loadThreeJSLib("shaders/CopyShader.js", THREE))
        .then(()=>{
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

/*
class MyAvatar extends AvatarActor {
    get pawn() {return MyAvatarPawn;}
}

MyAvatar.register('MyAvatar');

class MyAvatarPawn extends AvatarPawn {
    destroy() {
        console.log("Am I getting here?")
        super.destroy();
    }
}
*/

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
        return AvatarActor.create(options);
    }
}

MyPlayerManager.register("MyPlayerManager");

class MyModelRoot extends ModelRoot {
    static modelServices() {
        return [
            MyPlayerManager,
            DynaverseAppManager,
            ExpanderModelManager,
            FontModelManager,
        ];
    }
    init(options, persistentData) {
        super.init(options);

        let appManager = this.service("DynaverseAppManager");
        appManager.add(BitcoinTracker);
        appManager.add(DBarGraphCard);
        appManager.add(BitLogoCard);
        appManager.add(MultiBlaster);
        appManager.add(BouncingBall);
        appManager.add(BouncingLogo);
        appManager.add(PerlinActor);
        appManager.add(DLight);
        appManager.add(TextFieldActor);

        this.ensurePersistenceProps();
        this.subscribe(this.sessionId, "triggerPersist", "triggerPersist");

        if (persistentData) {
            this.loadPersistentData(persistentData);
            return;
        }

        this.loadExpanders(Constants.Library.actorExpanders, Constants.Library.pawnExpanders, "1");
        this.load(Constants.DefaultCards, "1");
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

            this.loadExpanders(json.actorExpanders, json.pawnExpanders, version);
            if (json.cards) {
                this.load(json.cards, version);
            }
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

    loadExpanders(actorExpanders, pawnExpanders, version) {
        if (version === "1") {
            let expanderManager = this.service("ExpanderModelManager");
            let array = [];
            for (let [k, v] of actorExpanders) {
                array.push({action: "add", type: "actorExpanders", name: k, content: v});
            }
            for (let [k, v] of pawnExpanders) {
                array.push({action: "add", type: "pawnExpanders", name: k, content: v});
            }
            expanderManager.loadAllCode(array);
        }
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
}

MyModelRoot.register("MyModelRoot");

class MyViewRoot extends ViewRoot {
    static viewServices() {
        return [
            InputManager,
            {service: ThreeRenderManager, options:{useBVH: true, antialias:true}},
            AssetManager,
            KeyFocusManager,
            FontViewManager,
            SyncedStateManager,
            VideoManager,
            ExpanderViewManager,
            AvatarManager
        ];
    }
    constructor(model) {
        super(model);
        const threeRenderManager = this.service("ThreeRenderManager");
        const renderer = threeRenderManager.renderer;

        this.service("FontViewManager").setModel(model.service("FontModelManager"));

        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
        console.log("ThreeRenderManager", threeRenderManager);

    }
}

export function startWorld(moreOptions) {
    let options = {...{
        appId: 'io.croquet.microverse',
        apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
        name: App.autoSession(),
        password: App.autoPassword(),
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 30,
        eventRateLimit: 60,
    }, ...moreOptions};

    App.makeWidgetDock();
    return loadLoaders().then(()=>{
        StartWorldcore(options);
    });
}
