// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {
    Constants, App, ModelRoot, ViewRoot, StartWorldcore,
    InputManager, PlayerManager, q_euler} from "@croquet/worldcore-kernel";
import { THREE, ThreeRenderManager } from "./ThreeRender.js";
import { PhysicsManager } from "./physics.js";
import {
    KeyFocusManager, SyncedStateManager,
    FontModelManager, FontViewManager } from "./text/text.js";
import { CardActor, VideoManager, MicroverseAppManager } from "./card.js";
import { AvatarActor, } from "./avatar.js";
import { frameName } from "./frame.js";

import { BehaviorModelManager, BehaviorViewManager, CodeLibrary, checkModule } from "./code.js";
import { TextFieldActor } from "./text/text.js";
import { PortalActor } from "./portal.js";
import { WorldSaver } from "./worldSaver.js";
// apps -------------------------------------------
import { MultiBlaster } from '../apps/multiblaster.js';

import JSZip from 'jszip';
import * as fflate from 'fflate';
import {AssetManager} from "./wcAssetManager.js";
// import {loadThreeJSLib} from "./ThreeJSLibLoader.js";
//import {loadThreeLibs} from "../three/threeLibsLoader.js";

const defaultAvatarNames = [
    "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
];

const defaultSystemBehaviorDirectory = "behaviors/croquet";
const defaultSystemBehaviorModules = [
    "avatarEvents.js", "billboard.js", "elected.js", "menu.js", "pdfview.js", "propertySheet.js", "rapier.js", "physics.js", "scrollableArea.js", "singleUser.js", "stickyNote.js", "halfBodyAvatar.js"
];

// turn off antialiasing for mobile and safari
// Safari has exhibited a number of problems when using antialiasing. It is also extremely slow rendering webgl. This is likely on purpose by Apple.
// Firefox seems to be dissolving in front of our eyes as well. It is also much slower.
// mobile devices are usually slower, so we don't want to run those with antialias either. Modern iPads are very fast but see the previous line.
let AA = true;
const isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
if (isSafari) AA = false;
const isFirefox = navigator.userAgent.includes('Firefox');
if (isFirefox) AA = false;
const isMobile = !!("ontouchstart" in window);
if (isMobile) AA = false;
console.log("antialias is: ", AA, 'mobile:', isMobile, 'browser:', isFirefox ? "Firefox" : isSafari ? "Safari" : "Other Browser");

console.log("%cTHREE.REVISION:", "color: #f00", THREE.REVISION);

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
    window.THREE = THREE;
    return Promise.resolve(THREE);
    //return loadThreeLibs(THREE);
}

function basenames() {
    let url = window.location.origin + window.location.pathname;
    let match = /([^/]+)\.html$/.exec(url);
    let basename = new URL(window.location).searchParams.get("world");

    if (!basename) {
        basename = (!match || match[1] === "index") ? "default" : match[1];
    }

    let baseurl;
    if (match) {
        baseurl = url.slice(0, match.index);
    } else {
        let slash = url.lastIndexOf("/");
        baseurl = url.slice(0, slash + 1);
    }

    return {baseurl, basename};
}

function loadInitialBehaviors(paths, directory) {
    let library = Constants.Library || new CodeLibrary();
    Constants.Library = library;
    if (!paths || !directory) {return;}
    let {baseurl, _pathname} = basenames();

    if (!directory) {
        throw new Error("directory argument has to be specified. It is a name for a sub directory name under the ./behaviors directory.");
    }
    let isSystem = directory === Constants.SystemBehaviorDirectory;
    let promises = paths.map((path) => {
        if (!isSystem) {
            let code = `import('${baseurl}${directory}/${path}')`;
            return eval(code).then((module) => {
                let rest = directory.slice("behaviors".length);
                if (rest[0] === "/") {rest = rest.slice(1);}
                return [`${rest === "" ? "" : (rest + "/")}${path}`, module];
            })
        } else {
            let modulePath = `${directory.split("/")[1]}/${path}`;
            let code = `import('${baseurl}behaviors/${modulePath}')`;
            return eval(code).then((module) => {
                return [modulePath, module];
            })
        }
    });

    return Promise.all(promises).then((array) => {
        array.forEach((pair) => {
            let [path, module] = pair;
            let dot = path.lastIndexOf(".");
            let fileName = path.slice(0, dot);

            checkModule(module); // may throw an error
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

    get presenter() { return this.players.get(this.presentationMode); }

    createPlayer(playerOptions) {
        // when we have a better user management,
        // options will be compatible with a card spec
        // until then, we check the AvatarNames variable, and if it is a short name
        // (as it is) it'd fall back to use the short string as a stem of the model file name.
        // if it is an object, we use it as the card spec.

        // when an avatar is created to hold the through-portal camera in a secondary
        // world, it is initialised according to the next entry in the rota of default
        // names/shapes (but remains invisible).  if the user comes through into this
        // world, at that point the avatar is updated to the name and shape that the
        // user had in the previous world (see AvatarPawn.frameTypeChanged).

        let index = this.avatarCount % Constants.AvatarNames.length;
        this.avatarCount++;
        let avatarSpec = Constants.AvatarNames[index];
        console.log(frameName(), "MyPlayerManager", this.avatarCount);
        let options = {...playerOptions, ...{noSave: true, type: "3d", singleSided: true}};

        if (typeof avatarSpec === "string") {
            options = {...options, ...{
                name: avatarSpec,
                dataScale: [0.3, 0.3, 0.3],
                dataRotation: q_euler(0, Math.PI, 0),
                dataTranslation: [0, -0.4, 0],
                dataLocation: `./assets/avatars/${avatarSpec}.zip`,
            }};
        } else {
            options = {...options, ...avatarSpec};
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

    startPresentation(playerId, presenterToken = null) {
        // sent by AvatarActor.comeToMe or this.continuePresenting (triggered by a
        // presenter arriving from another world).  in either case it may turn out
        // that some other presenter has beaten them to it. if so, the arriving
        // presenter and their followers will be left to their own devices.
        if (this.presentationMode && this.presentationMode !== playerId) return;

        this.presentationMode = playerId;

        // examining the current inWorld players, decide who will join this
        // presentation.  if a token was provided, only those players carrying the same
        // token are signed up (which will include the presenter, and any follower that
        // showed up here before the presenter).  only the presenter needs to keep
        // that token, to catch potential late followers.
        // if no token, grab everyone (and delete any token they might have, while we're
        // about it).
        for (const player of this.playersInWorld()) {
            if (presenterToken && player.presenterToken !== presenterToken) continue;
            if (!presenterToken || player.playerId !== playerId) delete player.presenterToken;
            this.followers.add(player.playerId);
        }

        this.publish("playerManager", "presentationStarted");
        this.publish("playerManager", "playerCountChanged");
    }

    addFollower(playerId) {
        this.followers.add(playerId);
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

    continuePresenting(presenter, presenterToken) {
        // a presenter came into this world through a portal carrying a token.  if there
        // is not already a presentation in progress we make them the presenter, and make
        // all followers carrying the same token follow them.  note that followers may
        // enter before or after the presenter.
        if (!this.presentationMode) {
            console.log(frameName(), "continuePresenting", presenter.id, presenterToken);
            presenter.presenterToken = presenterToken; // we keep this for as long as we're presenting
            this.startPresentation(presenter.playerId, presenterToken);
        } else {
            console.log(frameName(), "continuePresenting rejected due to presentation in progress");
        }
    }

    continueFollowing(follower, presenterToken) {
        // a follower came into this world through a portal carrying a token, hoping
        // to follow the presenter with the same token.  the follower may be entering
        // before or after the presenter.  if the expected presenter isn't presenting,
        // the follower will just wait; even if someone else is presenting now, it's
        // conceivable - albeit unlikely - that the current presentation will end in
        // time for the expected presenter to take over.
        if (this.presentationMode && this.presenter.presenterToken === presenterToken) {
            console.log(frameName(), "continueFollowing", this.presenter.id, presenterToken);
            this.followers.add(follower.playerId);
            follower.presentationStarted();
            this.publish("playerManager", "playerCountChanged");
        } else {
            follower.presenterToken = presenterToken;
            console.log(frameName(), "continueFollowing: expected presenter not presenting", presenterToken);
        }
    }

    playerEnteredWorld(player) {
        console.log(frameName(), "playerEnteredWorld", player);
        this.publish("playerManager", "playerCountChanged");
    }

    playerLeftWorld(player) {
        console.log(frameName(), "playerLeftWorld", player);
        if (player.playerId === this.presentationMode) {
            this.stopPresentation();
        }
        delete player.presenterToken;
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
            MicroverseAppManager,
            BehaviorModelManager,
            FontModelManager,
            PhysicsManager,
        ];
    }

    init(options, persistentData) {
        super.init(options);
        let appManager = this.service("MicroverseAppManager");
        appManager.add(MultiBlaster);
        appManager.add(TextFieldActor);
        appManager.add(PortalActor);

        this.ensurePersistenceProps();
        this.subscribe(this.sessionId, "triggerPersist", "triggerPersist");
        this.subscribe(this.id, "loadStart", "loadStart");
        this.subscribe(this.id, "loadOne", "loadOne");
        this.subscribe(this.id, "loadDone", "loadDone");

        if (persistentData) {
            console.log("loading persistent data");
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
        let {key, asScene, pose} = data;
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
            this.loadFromFile(savedData, asScene, pose);
        }
    }

    loadFromFile({ _name, version, data }, asScene, pose) {
        try {
            let saver = new WorldSaver(CardActor);
            let json = saver.parse(data);

            let nameMap = this.loadBehaviorModules(json.behaviorModules, version);
            if (json.cards) {
                let result = this.load({array: json.cards, nameMap: asScene ? null : nameMap}, version);
                if (pose) {
                    result.forEach((card) => {
                        if (!card.parent) {
                            card._translation = pose.translation;
                            card._rotation = pose.rotation;
                        }
                    });
                }
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
            {service: ThreeRenderManager, options:{useBVH: true, antialias:AA}},
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
        renderer.toneMappingExposure = 2.5;

        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
    }
}

function deleteParameter(url, key) {
    const urlObj = new URL(url, location.href);
    urlObj.searchParams.delete(key);
    return urlObj.toString();
}

function startWorld(appParameters, world) {
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
        options: {world},
        // developer can override defaults
        ...appParameters,
        // except for the 'microverse' flag
        // which identifies microverse sessions for billing
        flags: ["microverse"],
    };

    // remove portal parameter from url for QR code
    App.sessionURL = deleteParameter(App.sessionURL, "portal");

    return loadLoaders()
        .then(() => {
            return loadInitialBehaviors(Constants.SystemBehaviorModules, Constants.SystemBehaviorDirectory);
        }).then(() => {
            return loadInitialBehaviors(Constants.UserBehaviorModules, Constants.UserBehaviorDirectory);
        }).then(() => {
            return StartWorldcore(sessionParameters);
        }).then(() => {
            let {baseurl} = basenames();
            return fetch(`${baseurl}meta/version.txt`);
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

export async function startMicroverse() {
    let {baseurl, basename} = basenames();

    if (!basename.endsWith(".vrse")) {
        // eval to hide import from webpack
        const worldModule = await eval(`import("${baseurl}worlds/${basename}.js")`);
        // use bit-identical math for constant initialization
        ModelRoot.evaluate(() => worldModule.init(Constants));
        if (!Constants.SystemBehaviorModules) {
            Constants.SystemBehaviorDirectory = defaultSystemBehaviorDirectory;
            Constants.SystemBehaviorModules = defaultSystemBehaviorModules;
        }
    } else {
        const response = await fetch(basename);
        if (!response.ok) throw Error(`world not found: ${basename}`);
        const text = await response.text();
        const json = new WorldSaver().parse(text);
        Constants.AvatarNames = defaultAvatarNames;
        Constants.SystemBehaviorDirectory = defaultSystemBehaviorDirectory;
        Constants.SystemBehaviorModules = defaultSystemBehaviorModules;
        Constants.BehaviorModules = json.data.behaviormodules;
        Constants.DefaultCards = json.data.cards;
        Constants.Library = new CodeLibrary();
        Constants.Library.addModules(json.data.behaviorModules);
    }
    let apiKeysModule;
    try {
        // use eval to hide import from webpack
        apiKeysModule = await eval(`import('${baseurl}apiKey.js')`);
        const { apiKey, appId } = apiKeysModule.default;
        if (typeof apiKey !== "string") throw Error("apiKey.js: apiKey must be a string");
        if (typeof appId !== "string") throw Error("apiKey.js: appId must be a string");
        if (!apiKey.match(/^[_a-z0-9]+$/i)) throw Error(`invalid apiKey: "${apiKey}"`);
        if (!appId.match(/^[-_.a-z0-9]+$/i)) throw Error(`invalid appId: "${appId}"`);
    } catch (error) {
        if (error.name === "TypeError") {
            // apiKey.js not found, use local dev key
            console.warn("apiKey.js not found, using default key for local development. Please create a valid apiKey.js (see croquet.io/keys)");
            apiKeysModule = {
                default: {
                    apiKey: "1kBmNnh69v93i5tOpj7bqqaJxjD3HJEucxd7egi7H",
                    appId: "io.croquet.microverse.localdevdefault",
                }
            };
        } else {
            console.log(error);
            throw Error("Please make sure that you have created a valid apiKey.js (see croquet.io/keys)");
        }
    };
    // Default parameters are filled in the body of startWorld. You can override them.
    startWorld(apiKeysModule.default, basename);
}
