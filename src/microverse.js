// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {
    Constants, App, ModelRoot, ViewRoot, StartWorldcore,
    InputManager, PlayerManager, q_euler} from "@croquet/worldcore-kernel";
import { THREE, ThreeRenderManager } from "./ThreeRender.js";
import { PhysicsManager } from "./physics.js";
import { AgoraChatManager } from "./agoraChat.js";
import {
    KeyFocusManager, SyncedStateManager,
    FontModelManager, FontViewManager } from "./text/text.js";
import { CardActor, VideoManager, MicroverseAppManager } from "./card.js";
import { AvatarActor, } from "./avatar.js";
import { frameName, sendToShell, addShellListener } from "./frame.js";

import { BehaviorModelManager, BehaviorViewManager, CodeLibrary, checkModule } from "./code.js";
import { TextFieldActor } from "./text/text.js";
import { PortalActor } from "./portal.js";
import { WorldSaver } from "./worldSaver.js";
import { startSettingsMenu, startShareMenu } from "./settingsMenu.js";

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
    "avatarEvents.js", "billboard.js", "elected.js", "menu.js", "pdfview.js", "propertySheet.js", "physics.js", "rapier.js", "scrollableArea.js", "singleUser.js", "stickyNote.js", "halfBodyAvatar.js", "gizmo.js"
];

let AA = true;

console.log("%cTHREE.REVISION:", "color: #f00", THREE.REVISION);

async function getAntialias() {
    // turn off antialiasing for mobile and safari
    // Safari has exhibited a number of problems when using antialiasing. It is also extremely slow rendering webgl. This is likely on purpose by Apple.
    // Firefox seems to be dissolving in front of our eyes as well. It is also much slower.
    // mobile devices are usually slower, so we don't want to run those with antialias either. Modern iPads are very fast but see the previous line.

    let urlOption = new URL(window.location).searchParams.get("AA");
    if (urlOption) {
        if (urlOption === "true") {
            console.log(`antialias is true, urlOption AA is set`);
            return true;
        } else {
            console.log(`antialias is false, urlOption AA is unset`);
            return false;
        }
    }
    let aa = true;
    const isSafari = navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");
    if (isSafari) aa = false;
    const isFirefox = navigator.userAgent.includes("Firefox");
    if (isFirefox) aa = false;
    const isMobile = !!("ontouchstart" in window);
    if (isMobile) aa = false;

    try {
        const supported = await navigator.xr.isSessionSupported("immersive-vr");
        if (supported) {aa = supported;}
    } catch (_) { /* ignore */ }

    console.log(`antialias is ${aa}, mobile: ${isMobile}, browser: ${isFirefox ? "Firefox" : isSafari ? "Safari" : "Other Browser"}`);
    return aa;
}

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);

function loadLoaders() {
    window.JSZip = JSZip;
    window.fflate = fflate;
    window.THREE = THREE;
    return Promise.resolve(THREE);
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
        this.subscribe("playerManager", "details", this.playerDetails);
        this.subscribe("playerManager", "destroy", this.playerDestroyed);
        this.subscribe("playerManager", "enter", this.playerEnteredWorld);
        this.subscribe("playerManager", "leave", this.playerLeftWorld);
    }

    get presenter() { return this.players.get(this.presentationMode); }

    createPlayer(playerOptions) {
        // invoked by PlayerManager.onJoin.

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

        // this method does not need to call super.createPlayer, which has null
        // behaviour.  once the player is created and returned, onJoin will publish
        // "playerManager:create", which we handle here with playerCreated.

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
                type: "initial", // this is "initial" here to not show the avatar that may be changed
            }};
        } else {
            options = {...options, ...avatarSpec, avatarType: "custom"};
        }
        return AvatarActor.create(options);
    }

    playerDetails({ playerId, details }) {
        // any object can publish a "playerManager:details" event specifying
        // a player id and some new property values for that player.  for example,
        // this is how the AgoraChatManager informs everyone when its local view
        // has joined or left the chat.
        const player = this.players.get(playerId);
        if (!player) return;

        player.setAndPublish(details); // will publish a "playerManager:detailsUpdated" event
    }

    destroyPlayer(player) {
        // although the player itself is about to be removed and doesn't care,
        // setting its inWorld to false will trigger event subscribers that do -
        // for example, this manager's own playerLeftWorld
        if (player.inWorld) player.setAndPublish({ inWorld: false });
        super.destroyPlayer(player);
    }

    playerInWorldChanged(player) {
        // invoked directly from AvatarActor.inWorldSet when someone has toggled
        // the inWorld property of an AvatarActor.  this can happen either directly
        // in the model domain (such as from destroyPlayer above) or from the
        // AvatarPawn, with a say("_set", <props>).
        // this method then publishes a player enter or leave event, based on the
        // value of inWorld.  one subscriber to those events is this MyPlayerManager
        // itself: the playerEnteredWorld and playerLeftWorld methods below do
        // appropriate housekeeping for the change of state.  any view that needs to
        // note arrival and departure of avatars in the world is also free to subscribe.

        // being in or out of world is a distinct layer from the
        // view-join and view-exit events that signal connection and
        // disconnection in a Croquet session.  the latter are subscribed to in
        // the Worldcore PlayerManager - this manager's superclass - and handled
        // by invoking createPlayer and destroyPlayer on the manager. the event
        // "playerManager:create" is published after createPlayer has completed;
        // "playerManager:destroy" is published as part of destroyPlayer, before
        // invocation of player.destroy() - mainly handled in Actor - that does
        // the cleanup.

        // in summary:
        //   to respond to players having been created or about to be destroyed,
        //   subscribe to
        //     playerManager:create
        //     playerManager:destroy
        //   to respond to players having entered or left this world, subscribe to
        //     playerManager:enter
        //     playerManager:leave

        // NB: if a tab goes dormant and is then revived, the model state that will
        // be constructed on that revival depends on the state of the session...
        //   (a) if there are other users in the session:
        //       the model will process the destruction of the tab's previous avatar
        //       and creation of a new one, which means that the avatar pawn's
        //       constructor will find that the actor does not yet have the inWorld
        //       property.  the pawn will publish the dormantAvatarSpec it recorded on
        //       going dormant (see avatar.js), which will transfer all saved properties
        //       (position, nickname, 3d model pointer etc) to the new actor.
        //   (b) if there are no other users in the session:
        //       the model will process the re-creation of the old avatar as if
        //       it has never been seen before (or load it from snapshot, if one was
        //       taken after the avatar's creation).  the avatar pawn's constructor
        //       in the primary frame will find that the actor *does* already have the
        //       inWorld flag.  it will use dormantAvatarSpec to impose the avatar's
        //       saved properties, as above.
        //
        // the avatar pawn constructor is the place where we get to ensure that
        // avatar properties that must *not* be preserved across dormancy - for now,
        // this means inChat - are explicitly reset.

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
        if (player._inChat) player.setAndPublish({ inChat: false });
        this.publish("playerManager", "playerCountChanged");
    }

    playerCreated(_player) {
        // console.log(frameName(), "playerCreated", player);
        this.publish("playerManager", "playerCountChanged");
    }

    playerDestroyed(_player) {
        // console.log(frameName(), "playerDestroyed", player);
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
        this.subscribe(this.sessionId, "addBroadcaster", "addBroadcaster");
        this.subscribe(this.id, "loadStart", "loadStart");
        this.subscribe(this.id, "loadOne", "loadOne");
        this.subscribe(this.id, "loadDone", "loadDone");
        this.subscribe(this.id, "removeAll", "removeAll");

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

    addBroadcaster(viewId) {
        let manager = this.service("PlayerManager");
        let player = manager.player(viewId);
        if (player) player.broadcaster = true;
        if (!this.broadcastMode) {
            this.broadcastMode = true;
            this.publish(this.sessionId, "broadcastModeEnabled");
        }
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

    removeAll() {
        /*
        let actors = this.service("ActorManager").actors;
        let avatarBehaviors = new Set();
        for (let [_k, actor] of actors) {
            if (actor.playerId) {
                if (actor.behaviorModules) {
                    avatarBehaviors.add(...actor.behaviorModules);
                }
                continue;
            }
            actor.destroy();
        }

        let manager = this.service("BehaviorModelManager");

        let modules = manager.moduleDefs;

        let newModuleDefs = [];

        for (let [_k, v] of modules) {
            if (avatarBehaviors.has(v.externalName)) {
                newModuleDefs.push(v);
            }
        }

        manager.cleanUp();
        manager.loadLibraries(newModuleDefs);
        */
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

// Broadcast mode is to support larger audiences. It disables sending
// reflector messages for mere spectators. Broadcasters are still able
// to send reflector messages.
// This should be a method of MyViewRoot but we can't access "this"
// until after the super() call in the constructor.
// We need it this early because otherwise messages would be
// sent during construction of some views
function setupBroadcastMode(model) {
    const searchParams = new URLSearchParams(window.location.search);
    const broadcasting = searchParams.get("broadcastMode") === "true";
    if (model.broadcastMode && !broadcasting) {
        // HACK need a proper way to enable viewOnly mode
        model.__realm.vm.controller.sessionSpec.viewOnly = true;
    }
    return broadcasting;
}

class MyViewRoot extends ViewRoot {
    static viewServices() {
        const services = [
            InputManager,
            {service: ThreeRenderManager, options:{useBVH: true, antialias: AA}},
            AssetManager,
            KeyFocusManager,
            FontViewManager,
            SyncedStateManager,
            VideoManager,
            BehaviorViewManager,
        ];
        if (window.settingsMenuConfiguration?.voice) services.push(AgoraChatManager);
        return services;
    }

    constructor(model) {
        const broadcasting = setupBroadcastMode(model);
        super(model);
        const threeRenderManager = this.service("ThreeRenderManager");
        const renderer = threeRenderManager.renderer;
        window.scene = threeRenderManager.scene;

        this.service("FontViewManager").setModel(model.service("FontModelManager"));

        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2.5;

        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
        this.setAnimationLoop(this.session);
        if (broadcasting) this.publish(this.sessionId, "addBroadcaster", this.viewId);
    }

    detach() {
        console.log("ViewRoot detached");
        super.detach();
    }

    setAnimationLoop(session) {
        // manual stepping management happens here.
        const threeRenderManager = this.service("ThreeRenderManager");
        const renderer = threeRenderManager.renderer;
        let step = (time, xrFrame) => {
            if (xrFrame) {
                session.step(time);
            }
        };
        renderer.setAnimationLoop(step);
        /*
          // we do not need this "backup" ticking (as far as I can tell).
        let basicStep = (time) => {
            console.log("basicStep", time);
            window.requestAnimationFrame(basicStep);
            session.step(time);
        };
        basicStep(Date.now());
        */
    }
}

function deleteParameter(url, key) {
    const urlObj = new URL(url, location.href);
    urlObj.searchParams.delete(key);
    return urlObj.toString();
}

let resolveConfiguration = null;

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

    // remove portal and broadcast parameters from url for QR code
    App.sessionURL = deleteParameter(App.sessionURL, "portal");
    App.sessionURL = deleteParameter(App.sessionURL, "broadcastMode");

    return loadLoaders()
        .then(() => {
            return loadInitialBehaviors(Constants.SystemBehaviorModules, Constants.SystemBehaviorDirectory);
        }).then(() => {
            return loadInitialBehaviors(Constants.UserBehaviorModules, Constants.UserBehaviorDirectory);
        }).then(() => {
            return StartWorldcore(sessionParameters);
        }).then((session) => {
            session.view.setAnimationLoop(session);
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

function isRunningLocalNetwork() {
    let hostname = window.location.hostname;

    let local_patterns = [
        /^localhost$/,
        /^.*\.local$/,
        /^.*\.ngrok.io$/,
        // 10.0.0.0 - 10.255.255.255
        /^(::ffff:)?10(?:\.\d{1,3}){3}$/,
        // 127.0.0.0 - 127.255.255.255
        /^(::ffff:)?127(?:\.\d{1,3}){3}$/,
        // 169.254.1.0 - 169.254.254.255
        /^(::f{4}:)?169\.254\.([1-9]|1?\d\d|2[0-4]\d|25[0-4])\.\d{1,3}$/,
        // 172.16.0.0 - 172.31.255.255
        /^(::ffff:)?(172\.1[6-9]|172\.2\d|172\.3[01])(?:\.\d{1,3}){2}$/,
        // 192.168.0.0 - 192.168.255.255
        /^(::ffff:)?192\.168(?:\.\d{1,3}){2}$/,
        // fc00::/7
        /^f[cd][\da-f]{2}(::1$|:[\da-f]{1,4}){1,7}$/,
        // fe80::/10
        /^fe[89ab][\da-f](::1$|:[\da-f]{1,4}){1,7}$/,
        // ::1
        /^::1$/,
    ];

    for (let i = 0; i < local_patterns.length; i++) {
        if (local_patterns[i].test(hostname)) {return true;}
    }

    return false;
}

export function startMicroverse() {
    let setButtons = (display) => {
        ["usersComeHereBtn", "homeBtn", "worldMenuBtn"].forEach((n) => {
            let btn = document.querySelector("#" + n);
            if (btn) {
                btn.style.display = display;
            }
        });
    };

    sendToShell("hud", {joystick: false, fullscreen: false});
    setButtons("none");

    const configPromise = new Promise(resolve => resolveConfiguration = resolve)
        .then(localConfig => {
            window.settingsMenuConfiguration = { ...localConfig };
            return !localConfig.showSettings || localConfig.userHasSet
                ? false // as if user has run dialog with no changes
                : new Promise(resolve => startSettingsMenu(true, resolve));
        });
    sendToShell("send-configuration");

    return configPromise.then(changed => {
        if (changed) sendToShell("update-configuration", { localConfig: window.settingsMenuConfiguration });
        sendToShell("hud", {joystick: true, fullscreen: true});
        setButtons("flex");
        return getAntialias();
    }).then((aa) => {
        AA = aa;
        launchMicroverse();
    });
}

async function launchMicroverse() {
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
    let local = isRunningLocalNetwork();
    let apiKeysFile = local ? "apiKey-dev.js" : "apiKey.js";

    try {
        // use eval to hide import from webpack
        apiKeysModule = await eval(`import('${baseurl}${apiKeysFile}')`);

        const { apiKey, appId } = apiKeysModule.default;
        if (typeof apiKey !== "string") throw Error(`${apiKeysFile}: apiKey must be a string`);
        if (typeof appId !== "string") throw Error(`${apiKeysFile}: appId must be a string`);
        if (!apiKey.match(/^[_a-z0-9]+$/i)) throw Error(`${apiKeysFile}: invalid apiKey: "${apiKey}"`);
        if (!appId.match(/^[-_.a-z0-9]+$/i)) throw Error(`${apiKeysFile}: invalid appId: "${appId}"`);
    } catch (error) {
        if (error.name === "TypeError" && local) {
            // apiKey-dev.js not found, use default dev key
            console.warn(`${apiKeysFile} not found, using default key for local development. Please create a valid apiKey-dev.js for local development, and apiKey.js for deployment (see croquet.io/keys)`);
            apiKeysModule = {
                default: {
                    apiKey: "1kBmNnh69v93i5tOpj7bqqaJxjD3HJEucxd7egi7H",
                    appId: "io.croquet.microverse.localdevdefault",
                }
            };
        } else {
            console.error(error);
            throw Error("Please make sure that you have created a valid apiKey-dev.js for local development, and apiKey.js for deployment (see croquet.io/keys)");
        }
    };
    // Default parameters are filled in the body of startWorld. You can override them.
    startWorld(apiKeysModule.default, basename);
}

const shellListener = (command, data) => {
    // console.log(`${frameId} received: ${JSON.stringify(data)}`);
    if (command === "local-configuration") {
        const { localConfig } = data;
        console.log("microverse received local-configuration", localConfig);
        if (resolveConfiguration) {
            resolveConfiguration(localConfig);
            resolveConfiguration = null;
        }
    }
};
addShellListener(shellListener);
