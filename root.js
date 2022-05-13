// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {
    Constants, App, THREE, ModelRoot, ViewRoot, StartWorldcore,
    InputManager, PlayerManager, ThreeRenderManager, RapierPhysicsManager, q_euler} from "@croquet/worldcore";
import {
    KeyFocusManager, SyncedStateManager,
    FontModelManager, FontViewManager } from './src/text/text.js';
import { CardActor, VideoManager, DynaverseAppManager } from './src/DCard.js';
import { AvatarActor, } from './src/avatar.js';

import { BehaviorModelManager, BehaviorViewManager, CodeLibrary } from "./src/code.js";
//import { DLight } from './src/DLight.js';
import { TextFieldActor } from './src/text/text.js';
import { PortalActor } from './src/portal.js';
import { WorldSaver } from './src/worldSaver.js';
// apps -------------------------------------------
import { MultiBlaster } from './apps/multiblaster.js';
import { BouncingBall, BouncingLogo } from './apps/bouncingBall.js';

import JSZip from 'jszip';
import * as fflate from 'fflate';
import {AssetManager} from "./src/wcAssetManager.js";
// import {loadThreeJSLib} from "./src/ThreeJSLibLoader.js";
import {loadThreeLibs} from "./three/threeLibsLoader.js";

let isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);

/*
function loadLoaders() {
    return loadThreeJSLib("postprocessing/Pass.js", THREE)
        .then(() => loadThreeJSLib("shaders/CopyShader.js", THREE))
        .then(() => loadThreeJSLib("csm/CSMFrustum.js", THREE))
        .then(() => loadThreeJSLib("csm/CSMShader.js", THREE))
        .then(()=>{
            let libs = [
                "loaders/OBJLoader.js",
                "loaders/MTLLoader.js",
                "loaders/GLTFLoader.js",
                "loaders/FBXLoader.js",
                "loaders/DRACOLoader.js",
                "loaders/SVGLoader.js",
                "loaders/EXRLoader.js",
                "utils/BufferGeometryUtils.js",
                "csm/CSM.js"
            ];

            window.JSZip = JSZip;
            window.fflate = fflate;

            return Promise.all(libs.map((file) => {
                return loadThreeJSLib(file, THREE);
            }));
        });
}
*/

function loadLoaders() {
    window.JSZip = JSZip;
    window.fflate = fflate;
    return loadThreeLibs(THREE);
}

export function basenames() {
    let pathname = window.location.pathname;
    let match = /([^/]+)\.html$/.exec(pathname);
    let basename = new URL(window.location).searchParams.get("world");

    if (!basename) {
        basename = (!match || match[1] === "index") ? "default" : match[1];
    }

    let basedir;
    if (match) {
        basedir = pathname.slice(0, match.index);
    } else {
        let slash = pathname.lastIndexOf("/");
        basedir = pathname.slice(0, slash + 1);
    }

    return {basedir, basename};
}

function loadInitialBehaviors(paths, directory) {
    let library = Constants.Library || new CodeLibrary();
    Constants.Library = library;
    if (!paths || !directory) {return;}
    let {basedir, _pathname} = basenames();

    if (!directory) {
        throw new Error("directory argument has to be specified. It is a name for a sub directory name under the ./behaviors directory.");
    }
    let isSystem = directory === Constants.SystemBehaviorDirectory;
    let promises = paths.map((path) => {
        if (!isSystem) {
            let code = `import('${basedir}${directory}/${path}')`;
            return eval(code).then((module) => {
                let rest = directory.slice("behaviors/".length);
                return [`${rest}/${path}`, module];
            })
        } else {
            return import(`./behaviors/${directory.split("/")[1]}/${path}`).then((module) => {
                return [`${directory.split("/")[1]}/${path}`, module];
            })
        }
    });

    return Promise.all(promises).then((array) => {
        array.forEach((pair) => {
            let [path, module] = pair;
            let dot = path.lastIndexOf(".");
            let fileName = path.slice(0, dot);
            library.add(module.default, fileName, isSystem);
        });
        return true;
    });
}

class MyPlayerManager extends PlayerManager {
    init(name) {
        super.init(name);
        this.avatarCount = 0;

        this.presentationMode = null; // or the viewId of the leader
        this.followers = new Set();

        this.subscribe("playerManager", "create", this.playerCreated);
        this.subscribe("playerManager", "destroy", this.playerDestroyed);
        this.subscribe("playerManager", "enter", this.playerEnteredWorld);
        this.subscribe("playerManager", "leave", this.playerLeftWorld);
    }

    createPlayer(options) {
        let index = this.avatarCount % Constants.AvatarNames.length;
        this.avatarCount++;
        console.log("MyPlayerManager", this.avatarCount);
        options.noSave = true;
        options.type = "3d";
        options.name = Constants.AvatarNames[index];
        options.singleSided = true;
        options.dataScale = [0.3, 0.3, 0.3];
        options.dataRotation = q_euler(0, Math.PI, 0);
        let dataLocation = options.name;

        // compatibility when we wrote AvatarNames with shorter names.
        if (!name.endsWith(".zip") && name.length < 40) {
            dataLocation = `./assets/avatars/${options.name}.zip`;
        }
        options.dataLocation = dataLocation;

        let behaviorManager = this.service("BehaviorModelManager");

         if (behaviorManager && behaviorManager.modules.get("AvatarEventHandler")) {
            options.behaviorModules = ["AvatarEventHandler"];
        }
        
        return AvatarActor.create(options);
    }

    destroyPlayer(player) {
        if (player.inWorld) player.set({inWorld: false});
        super.destroyPlayer(player);
    }

    playerInWorldChanged(player) {
        if (player.inWorld) {
            this.publish("playerManager", "enter", player);
        } else {
            this.publish("playerManager", "leave", player);
        }
    }

    playersInWorld() {
        return [...this.players.values()].filter((player) => player.inWorld);
    }

    startPresentation(playerId) {
        if (this.presentationMode && this.presentationMode !== playerId) {
            return; // somebody is already presenting
        }

        this.presentationMode = playerId;

        this.playersInWorld().forEach((player) => {
            this.followers.add(player.playerId);
        });
        this.publish("playerManager", "presentationStarted", playerId);
        this.publish("playerManager", "playerCountChanged");
    }

    stopPresentation() {
        this.presentationMode = null;
        this.publish("playerManager", "presentationStopped");
        this.publish("playerManager", "playerCountChanged");
        this.followers.clear();
    }

    leavePresentation(playerId) {
        if (this.presentationMode === playerId) {return;}
        this.followers.delete(playerId);
        this.publish("playerManager", "playerCountChanged");
    }

    playerEnteredWorld(player) {
        console.log(this.sessionId, "playerEnteredWorld", player);
        if (this.presentationMode) {
            this.followers.add(player.playerId);
            player.presentationStarted(this.presentationMode);
        }
        this.publish("playerManager", "playerCountChanged");
    }

    playerLeftWorld(player) {
        console.log(this.sessionId, "playerLeftWorld", player);
        if (player.playerId === this.presentationMode) {
            this.stopPresentation();
        }
        this.followers.delete(player.playerId);
        this.publish("playerManager", "playerCountChanged");
    }

    playerCreated(_player) {
        this.publish("playerManager", "playerCountChanged");
    }

    playerDestroyed(_player) {
        this.publish("playerManager", "playerCountChanged");
    }
}

MyPlayerManager.register("MyPlayerManager");

class MyModelRoot extends ModelRoot {
    static modelServices() {
        return [
            MyPlayerManager,
            DynaverseAppManager,
            BehaviorModelManager,
            FontModelManager,
            ...(Constants.UseRapier ? [{service: RapierPhysicsManager, options: {useCollisionEventQueue: true}}] : [])
        ];
    }
    init(options, persistentData) {
        super.init(options);

        let appManager = this.service("DynaverseAppManager");
        appManager.add(MultiBlaster);
        appManager.add(BouncingBall);
        appManager.add(BouncingLogo);
        appManager.add(TextFieldActor);
        appManager.add(PortalActor);

        this.ensurePersistenceProps();
        this.subscribe(this.sessionId, "triggerPersist", "triggerPersist");
        this.subscribe(this.id, "loadStart", "loadStart");
        this.subscribe(this.id, "loadOne", "loadOne");
        this.subscribe(this.id, "loadDone", "loadDone");

        if (persistentData) {
            this.loadPersistentData(persistentData);
            return;
        }

        this.loadBehaviorModules(Constants.Library.modules, "1");
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
            let json = saver.parse(JSON.stringify(data));

            //maybe we need to delete all DefaultUserBehaviors at this point.

            let lib = Constants.Library;
            let systemModules = new Map();

            for (let [k, v] of lib.modules) {
                if (v.systemModule) {
                    systemModules.set(k, v);
                }
            }

            this.loadBehaviorModules(systemModules, version);

            this.loadBehaviorModules(json.behaviorModules, version);
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
        let func = () => this.saveData();
        this.persistSession(func);
    }

    saveData() {
        let name = this.sessionName || "Unknown";
        let saver = new WorldSaver(CardActor);
        let json = saver.save(this);
        let string = saver.stringify(json);
        return {name, version: "1", data: JSON.parse(string)};
    }

    loadBehaviorModules(moduleDefs, version) {
        // the persistent data should never contain a system behavior
        if (version === "1") {
            let behaviorManager = this.service("BehaviorModelManager");
            return behaviorManager.loadLibraries([...moduleDefs.values()]);
        }
        return null;
    }

    load(cards, version) {
        if (version === "1") {
            return CardActor.load(cards, this, version);
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

    loadStart(key) {
        this.loadKey = key;
        this.loadBuffer = [];
    }

    loadOne(data) {
        let {key, buf} = data;
        if (key !== this.loadKey) {return;}
        this.loadBuffer.push(buf);
    }

    loadDone(data) {
        let {key, asScene} = data;
        if (key !== this.loadKey) {return;}

        let array = this.loadBuffer;
        this.loadBuffer = [];
        this.loadKey = null;

        if (!array) {
            console.log("inconsistent message");
            return;
        }

        let len = array.reduce((acc, cur) => acc + cur.length, 0);
        let all = new Uint8Array(len);
        let ind = 0;
        for (let i = 0; i < array.length; i++) {
            all.set(array[i], ind);
            ind += array[i].length;
        }

        let result = new TextDecoder("utf-8").decode(all);
        let savedData = JSON.parse(result);
        if (savedData.version === "1") {
            let string = JSON.stringify(savedData.data);
            savedData.data = string;
            this.loadFromFile(savedData, asScene);
        }
    }

    loadFromFile({ _name, version, data }, asScene) {
        try {
            let saver = new WorldSaver(CardActor);
            let json = saver.parse(data);

            let nameMap = this.loadBehaviorModules(json.behaviorModules, version);
            if (json.cards) {
                this.load({array: json.cards, nameMap: asScene ? null : nameMap}, version);
            }
        } catch (error) {
            console.error("error in loading persistent data", error);
        }
    }
}

MyModelRoot.register("MyModelRoot");

class MyViewRoot extends ViewRoot {
    static viewServices() {
        return [
            InputManager,
            {service: ThreeRenderManager, options:{useBVH: true, antialias:!isSafari}},
            AssetManager,
            KeyFocusManager,
            FontViewManager,
            SyncedStateManager,
            VideoManager,
            BehaviorViewManager,
        ];
    }
    constructor(model) {
        super(model);
        const threeRenderManager = this.service("ThreeRenderManager");
        const renderer = threeRenderManager.renderer;
        window.scene = threeRenderManager.scene;

        this.service("FontViewManager").setModel(model.service("FontModelManager"));

        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
    }
}

export function startWorld(appParameters) {
    // appParameters are loaded from apiKey.js (see index.js)
    // and typically provide apiKey and appId
    let sessionParameters = {
        // microverse defaults
        name: appParameters.name || App.autoSession(),
        password: appParameters.password || App.autoPassword(),
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 30,
        eventRateLimit: 60,
        // developer can override defaults
        ...appParameters,
        // except for the 'microverse' flag
        // which identifies microverse sessions for billing
        flags: ["microverse"],
    };

    return loadLoaders()
        .then(() => {
            return loadInitialBehaviors(Constants.SystemBehaviorModules, Constants.SystemBehaviorDirectory);
        }).then(() => {
            return loadInitialBehaviors(Constants.UserBehaviorModules, Constants.UserBehaviorDirectory);
        }).then(() => {
            return StartWorldcore(sessionParameters);
        }).then(() => {
            let {basedir} = basenames();
            return fetch(`${basedir}meta/version.txt`);
        }).then((response) => {
            if (`${response.status}`.startsWith("2")) {
                return response.text();
            }
            return "(version not found)";
        }).then((text) => {
            console.log(`
Croquet Microverse
${text}
https://croquet.io`.trim());
        });
}
