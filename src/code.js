// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import * as WorldcoreExports from "@croquet/worldcore-kernel";
const {ViewService, ModelService, GetPawn, Model, Constants} = WorldcoreExports;

import * as WorldcoreThreeExports from "./ThreeRender.js";
import * as WorldcoreRapierExports from "./physics.js";

//console.log(WorldcoreRapierExports);

let isProxy = Symbol("isProxy");
function newProxy(object, handler, module, behavior) {
    if (object[isProxy]) {
        return object;
    }
    return new Proxy(object, {
        get(target, property) {
            if (property === isProxy) {return true;}
            if (property === "_target") {return object;}
            if (property === "_behavior") {return behavior;}
            if (handler && handler.hasOwnProperty(property)) {
                return new Proxy(handler[property], {
                    apply: function(_target, thisArg, argumentList) {
                        return handler[property].apply(thisArg, argumentList);
                    }
                });
            }
            return target[property];
        },
    });
}

/* AM_Code: A mixin to support Live programming */

export const AM_Code = superclass => class extends superclass {
    init(options) {
        super.init(options);
        this.scriptListeners = new Map();
        this.behaviorManager = this.service("BehaviorModelManager");
        if (options.behaviorModules) {
            options.behaviorModules.forEach((name) => { /* name: Bar */
                let module = this.behaviorManager.modules.get(name);
                if (!module) {
                    console.error(`unknown module ${name} is specified`);
                    return;
                }
                let {actorBehaviors, pawnBehaviors} = module;
                if (actorBehaviors) {
                    for (let behavior of actorBehaviors.values()) {
                        this.behaviorManager.modelUse(this, behavior);
                    }
                }
                if (pawnBehaviors) {
                    for (let behavior of pawnBehaviors.values()) {
                        this.behaviorManager.viewUse(this, behavior);
                    }
                }
            });
        }
    }

    destroy() {
        if (this[isProxy]) {
            return this._target.destroy();
        }
        if (this._behaviorModules) {
            this._behaviorModules.forEach((name) => { /* name: Bar */
                let module = this.behaviorManager.modules.get(name);
                if (!module) {
                    console.error(`unknown module ${name} is being torn down`);
                    return;
                }
                let {actorBehaviors, pawnBehaviors} = module;
                if (actorBehaviors) {
                    for (let behavior of actorBehaviors.values()) {
                        this.behaviorManager.modelUnuse(this, behavior);
                    };
                }
                if (pawnBehaviors) {
                    for (let behavior of pawnBehaviors.values()) {
                        this.behaviorManager.viewUnuse(this, behavior);
                    };
                }
            });
        }
        super.destroy();
    }

    future(time) {
        if (!this[isProxy]) {return super.future(time);}
        let behaviorName = this._behavior.$behaviorName;
        let moduleName = this._behavior.module.name;
        return this.futureWithBehavior(time, moduleName, behaviorName);
    }

    // In order to enable a future call in the regular syntax:
    //    this.future(100).aBehaviorMethod()
    // the future call creates a proxy that remembers the calling behavior by name
    // and "aBehaviorMethod is looked up from the behavior.

    // A special case is needed when the method name is "call", therefore it expects
    // explicit specification of behavior.

    futureWithBehavior(time, moduleName, behaviorName) {
        let superFuture = (sel, args) => super.future(time, sel, ...args);
        let behaviorManager = this.behaviorManager;
        let basicCall = this.call;

        return new Proxy(this, {
            get(_target, property) {
                let behavior = behaviorManager.lookup(moduleName, behaviorName);

                let func = property === "call" ? basicCall : behavior.$behavior[property];
                let fullName = property === "call" ?  "call" : `${moduleName}$${behaviorName}.${property}`;
                if (typeof func === "function") {
                    const methodProxy = new Proxy(func, {
                        apply(_method, _this, args) {
                            return superFuture(fullName, args);
                        }
                    });
                    return methodProxy;
                }
                throw Error("Tried to call " + property + "() on future of " + behaviorName + " which is not a function");
            }
        });
    }

    // call a behavior method. behaviorName is either ModuleName$BehaviorName or BehaviorName.
    // If former, the current (calling) module's name is used.
    call(behaviorName, name, ...values) {
        let moduleName;
        let split = behaviorName.split("$");
        if (split.length > 1) {
            moduleName = split[0];
            behaviorName = split[1];
        }
        if (!moduleName && this[isProxy]) {
            moduleName = this._behavior.module.externalName;
        }

        let behavior = this.behaviorManager.lookup(moduleName, behaviorName);
        if (!behavior) {
            throw new Error(`epxander named ${behaviorName} not found`);
        }

        return behavior.invoke(this[isProxy] ? this._target : this, name, ...values);
    }

    listen(eventName, listener) {
        return this.scriptSubscribe(this.id, eventName, listener);
    }

    subscribe(scope, eventName, listener) {
        return this.scriptSubscribe(scope, eventName, listener);
    }

    // setup() of a behavior, and typically a subscribe call in it, gets called multiple times
    // in its life cycle because of live programming feature. This wrapper for subscribe records
    // the current set of subscription.
    //
    // canonical value of listener is a string that represents the name of a method.
    // So double registration is not a problem.
    scriptSubscribe(scope, eventName, listener) {
        // listener can be:
        // this.func
        // name for a base object method
        // name for an expander method
        // string with "." for this module, a behavior and method name
        // // string with "$" and "." for external name of module, a behavior name, method name

        if (typeof listener === "function" && !this[isProxy]) {
            return super.subscribe(scope, eventName, listener);
        }

        if (typeof listener === "function") {
            listener = listener.name;
        }

        let behaviorName;
        let moduleName;

        let dollar = listener.indexOf("$");

        if (dollar >= 1) {
            moduleName = listener.slice(0, dollar);
            listener = listener.slice(dollar + 1);
        }

        let dot = listener.indexOf(".");
        if (dot >= 1) {
            behaviorName = listener.slice(0, dot);
            listener = listener.slice(dot + 1);
        }

        let behavior = this._behavior;

        if (!moduleName && behavior) {
            moduleName = behavior.module.externalName;
        }

        if (!behaviorName && behavior) {
            behaviorName = behavior.$behaviorName;
        }

        let fullMethodName;
        if (!behaviorName) {
            fullMethodName = listener;
        } else {
            fullMethodName = `${moduleName}${moduleName ? "$" : ""}${behaviorName}${behaviorName ? "." : ""}${listener}`;
        }

        let listenerKey = `${scope}:${eventName}${fullMethodName}`;
        let had = this.scriptListeners && this.scriptListeners.get(listenerKey);
        if (had) {return;}

        // this check is needed when subscribe is called from constructors of superclasses.
        // That is, this.scriptListeners is only initialized after super constructor returns.
        if (this.scriptListeners) {
            this.scriptListeners.set(listenerKey, fullMethodName);
        }
        super.subscribe(scope, eventName, fullMethodName);
    }

    // this method adds an action to the code editor.
    // Probably better be split into a separate mixin.
    // also, in system edit
    codeAccepted(data) {
        let match = /^class[\s]+([\S]+)/.exec(data.text.trim());
        if (!match) {
            console.log("code does not begin with the keyword class and name");
            return;
        }

        let behaviorModule = this._cardData.behaviorModule;
        let [moduleName, behaviorName] = behaviorModule.split(".");
        let name = match[1];
        if (name !== behaviorName) {
            throw new Error("changing the behavior name not supported");
        }

        let current = this.behaviorManager.moduleDefs.get(moduleName);

        if (!current) {
            throw new Error("module no longer exists");
        }

        let copy = {
            name: current.name, systemModule: current.systemModule,
            location: current.location,
            actorBehaviors: new Map([...current.actorBehaviors]),
            pawnBehaviors: new Map([...current.pawnBehaviors]),
        };

        let currentBehavior = copy.actorBehaviors.get(behaviorName);
        if (currentBehavior) {
            if (copy.actorBehaviors.get(behaviorName) === data.text) {
                return;
            }
            copy.actorBehaviors.set(behaviorName, data.text);
        } else {
            currentBehavior = copy.pawnBehaviors.get(behaviorName);
            if (currentBehavior) {
                if (copy.pawnBehaviors.get(behaviorName) === data.text) {
                    return;
                }
                copy.pawnBehaviors.set(behaviorName, data.text);
            }
        }

        console.log("codeAccepted");
        this.behaviorManager.loadLibraries([copy]);
    }

    createCard(options) {
        // this is only here because we don't want to export isProxy Symbol.
        if (options.parent) {
            if (options.parent[isProxy]) {
                options = {...options, parent: options.parent._target};
            }
        }

        // oh, boy
        let rcvr = this[isProxy] ? this._target : this;

        let card = rcvr.constructor.load([{card: options}], this.wellKnownModel("ModelRoot"), "1")[0];
        this.publish(this.sessionId, "triggerPersist");
        return card;
    }

    queryCards(options, requestor) {
        let actorManager = this.service("ActorManager");
        let cards = [...actorManager.actors].filter((a) => a[1].isCard).map(a => a[1]);
        if (!options) {return cards;}
        if (options.moduleName && options.methodName) {
            cards = cards.filter((c) => requestor.call(options.moduleName, options.methodName, c));
        } else if (options.methodName) {
            cards = cards.filter((c) => requestor[options.methodName].call(requestor, c));
        }
        return cards;
    }
}

/* AM_Code: A mixin to support Live programming */

export const PM_Code = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        this.scriptListeners = new Map();
        let behaviorManager = this.actor.behaviorManager;

        this.subscribe(actor.id, "callSetup", "callSetup");
        this.subscribe(actor.id, "callTeardown", "callTeardown");

        if (actor._behaviorModules) {
            actor._behaviorModules.forEach((moduleName) => { /* name: Bar */
                let module = behaviorManager.modules.get(moduleName);
                let {pawnBehaviors} = module || {};
                if (pawnBehaviors) {
                    for (let behavior of pawnBehaviors.values()) {
                        if (behavior) {
                            behavior.ensureBehavior();
                        }
                        // future(0) is used so that setup() is called after
                        // all behaviors specified are installed.
                        if (behavior.$behavior.setup) {
                            this.future(0).callSetup(`${module.externalName}$${behavior.$behaviorName}`);
                        }
                    };
                }
            });
        }
    }

    actorCall(behaviorName, name, ...values) {
        let actor = this.actor;
        let moduleName = this._behavior.module.externalName;
        return actor.call(`${moduleName}$${behaviorName}`, name, ...values);
    }

    // call a behavior method. behaviorName is either ModuleName$BehaviorName or BehaviorName.
    // If former, the current (calling) module's name is used.
    call(behaviorName, name, ...values) {
        let moduleName;
        let split = behaviorName.split("$");
        if (split.length > 1) {
            moduleName = split[0];
            behaviorName = split[1];
        }

        if (!moduleName && this[isProxy]) {
            moduleName = this._behavior.module.externalName;
        }

        let behavior = this.actor.behaviorManager.lookup(moduleName, behaviorName);
        if (!behavior) {
            throw new Error(`epxander named ${behaviorName} not found`);
        }

        return behavior.invoke(this[isProxy] ? this._target : this, name, ...values);
    }

    destroy() {
        // destroy in the super chain requires that the receiver is the original pawn, not a proxy.
        if (this[isProxy]) {
            return this._target.destroy();
        }
        if (this.actor._behaviorModules) {
            this.actor._behaviorModules.forEach((name) => { /* name: Bar */
                let module = this.actor.behaviorManager.modules.get(name);
                if (!module) {
                    console.error(`unknown module ${name} is specified`);
                }
                let {pawnBehaviors} = module;
                if (pawnBehaviors) {
                    for (let behavior of pawnBehaviors.values()) {
                        if (behavior.$behavior.teardown) {
                            this.call(`${behavior.module.name}$${behavior.$behaviorName}`, "teardown");
                        }
                    };
                }
            });
        }
        super.destroy();
    }

    callSetup(name) {
        return this.call(name, "setup");
    }

    callTeardown(name) {
        return this.call(name, "teardown");
    }

    scriptListen(subscription, listener) {
        return this.scriptSubscribe(this.actor.id, subscription, listener);
    }

    subscribe(scope, subscription, listener) {
        return this.scriptSubscribe(scope, subscription, listener);
    }

    // setup() of a behavior, and typically a subscribe call in it, gets called multiple times
    // in its life cycle because of live programming feature. This wrapper for subscribe records
    // the current set of subscription.
    //
    // canonical form of listner is a function.
    // We try to remove and replace the existing subscription if the "same" handler is registered.
    scriptSubscribe(scope, subscription, listener) {
        // listener can be:
        // this.func for a method in the calling behavior
        // name for a base object method
        // name for a behavior method
        // string with "." for this module, a behavior and method name
        // // string with "$" and "." for external name of module, a behavior name, method name

        if (typeof listener === "function" && !this[isProxy]) {
            return super.subscribe(scope, subscription, listener);
        }

        let eventName;
        let handling;
        if (typeof subscription === "string") {
            eventName = subscription;
        } else {
            eventName = subscription.event;
            handling = subscription.handling;
        }

        let behaviorName;
        let moduleName;

        if (typeof listener === "function") {
            listener = listener.name;
        }

        let dollar = listener.indexOf("$");

        if (dollar >= 1) {
            moduleName = listener.slice(0, dollar);
            listener = listener.slice(dollar + 1);
        }

        let dot = listener.indexOf(".");
        if (dot >= 1) {
            behaviorName = listener.slice(0, dot);
            listener = listener.slice(dot + 1);
        }

        let behavior = this._behavior;

        if (!moduleName && behavior) {
            moduleName = behavior.module.externalName;
        }

        if (!behaviorName && behavior) {
            behaviorName = behavior.$behaviorName;
        }

        let fullMethodName;

        if (!behaviorName) {
            fullMethodName = listener;
        } else {
            fullMethodName = `${moduleName}${moduleName ? "$" : ""}${behaviorName}${behaviorName ? "." : ""}${listener}`;
        }

        let listenerKey = `${scope}:${eventName}${fullMethodName}`;

        let had = this.scriptListeners && this.scriptListeners.get(listenerKey);
        if (had) {
            this.unsubscribe(scope, eventName, fullMethodName);
        }

        if (this.scriptListeners) {
            this.scriptListeners.set(listenerKey, fullMethodName);
        }

        if (fullMethodName.indexOf(".") >= 1) {
            let split = fullMethodName.split(".");
            let func = (data) => this.call(split[0], split[1], data);
            return super.subscribe(scope, eventName, func);
        }
        if (handling) {
            super.subscribe(scope, {event: eventName, handling}, fullMethodName);
        } else {
            super.subscribe(scope, eventName, fullMethodName);
        }
    }

    update(time, delta) {
        super.update(time, delta);
        if (this.updateRequests) {
            this.updateRequests.forEach((u) => {
                // [behaviorName, methodName]
                this.call(...u, time, delta);
            });
        }
    }

    addUpdateRequest(array) {
        if (!this.updateRequests) {this.updateRequests = [];}
        let index = this.updateRequests.findIndex((o) => o[0] === array[0] && o[1] === array[1]);

        if (index >= 0) {return;}
        this.updateRequests.push(array);
    }

    removeUpdateRequest(array) {
        let index = this.updateRequests.findIndex((o) => o[0] === array[0] && o[1] === array[1]);
        if (index < 0) {return;}
        this.updateRequests.splice(index, 1);
    }
}

// The class that represents a behavior.
// A behavior is like a class, and does not hold any state.
// so there is one instance of ScriptBehavior for each defined behavior.

class ScriptingBehavior extends Model {
    static okayToIgnore() { return [ "$behavior", "$behaviorName" ]; }

    init(options) {
        this.systemBehavior = !!options.systemBehavior;
        this.module = options.module;
        this.name = options.name;
        this.type = options.type;
    }

    setCode(string) {
        if (!string) {
            console.log("code is empty for ", this);
            return;
        }

        let theSame = this.code === string;

        this.code = string;

        let trimmed = string.trim();
        let source;
        if (trimmed.length === 0) {return;}
        if (/^class[ \t]/.test(trimmed)) {
            source = trimmed;
        }

        let code = `return (${source})`;
        let cls;
        try {
            const Microverse = {...WorldcoreExports, ...WorldcoreThreeExports, ...WorldcoreRapierExports};
            cls = new Function("Worldcore", "Microverse", code)(Microverse, Microverse);
        } catch(error) {
            console.log("error occured while compiling:", source, error);
            try {
                eval(source);
            } finally {
            }
        }

        if (typeof cls !== "function") {
            return;
        }

        this.$behavior = cls.prototype;
        this.$behaviorName = cls.name;

        if (!theSame) {
            this.publish(this.id, "setCode", string);
        }
    }

    ensureBehavior() {
        if (!this.$behavior) {
            let maybeCode = this.code;
            this.setCode(maybeCode, true);
        }
        return this.$behavior;
    }

    invoke(receiver, name, ...values) {
        this.ensureBehavior();
        let myHandler = this.$behavior;
        let behaviorName = this.$behaviorName;
        let module = this.module;
        let result;

        let proxy = newProxy(receiver, myHandler, module, this);
        try {
            let f = proxy[name];
            if (!f) {
                throw new Error(`a method named ${name} not found in ${behaviorName || this}`);
            }
            result = f.apply(proxy, values);
        } catch (e) {
            console.error("an error occured in", behaviorName, name, e);
        }
        return result;
    }
}

ScriptingBehavior.register("ScriptingBehavior");

// The class that represents a behavior module.
// init sets up those properties but actorBehaviors and pawnBehaviors will be added.

class ScriptingModule extends Model {
    init(options) {
        super.init(options);
        this.name = options.name;
        this.systemModule = options.systemModule;
        this.location = options.location;
    }
}

ScriptingModule.register("ScriptingModule");

// Each code is a Model object whose contents is the text code
// the model's identifier is the id, but you can also refer to it by name
// If there are two classes with the same name, for now we can say that is not allowed.

export class BehaviorModelManager extends ModelService {
    init(name) {
        super.init(name || "BehaviorModelManager");

        this.moduleDefs = new Map(); // <externalName /* Bar1 */, {name /*Bar*/, actorBehaviors: Map<name, codestring>, pawnBehaviors: Map<name, codestring>, systemModule: boolean, location:string?}>

        this.modules = new Map(); // <externalName /* Bar1 */, {name /*Bar*/, actorBehaviors: Map<name, codestring>, pawnBehaviors: Map<name, codestring>, systemModule: boolean, location:string?}>

        this.behaviors = new Map(); // {name: ScriptingBehavior}

        this.modelUses = new Map(); // {ScriptingBehavior, [cardActorId]}
        this.viewUses = new Map();  // {ScriptingBehavior [cardPawnId]}

        this.externalNames = new Map();

        this.loadCache = null;

        this.subscribe(this.id, "loadStart", "loadStart");
        this.subscribe(this.id, "loadOne", "loadOne");
        this.subscribe(this.id, "loadDone", "loadDone");
    }

    createAvailableName(name, location) {
        let current = this.moduleDefs.get(name);
        if (!current) {return name;}

        for (let [n, o] of this.moduleDefs) {
            if (o.location === location && o.name === name) {
                return n;
            }
        }

        if (current.location === location) {
            return name;
        }

        let match = /([^0-9]+)([0-9]*)/.exec(name);
        let stem = match[1];
        let suffix = match[2];

        if (suffix.length === 0) {
            suffix = 0;
        } else {
            suffix = parseInt(suffix, 10);
        }

        while (true) {
            let newName = stem + (++suffix);
            if (!this.moduleDefs.get(newName)) {
                return newName;
            }
        }
    }

    lookup(externalName, behaviorName) {
        if (!externalName) {return null;}
        let module = this.modules.get(externalName);
        if (!module) {return null;}
        return module.actorBehaviors.get(behaviorName)
            || module.pawnBehaviors.get(behaviorName);
    }

    loadStart(key) {
        // last one wins
        this.key = key;
        this.loadCache = [];
    }

    loadOne(obj) {
        if (!this.key) {return;}
        if (obj.key !== this.key) {
            return;
        }
        this.loadCache.push(obj.buf);
    }

    loadDone(key) {
        if (!this.key) {return;}
        if (this.key !== key) {
            return;
        }

        let array = this.loadCache;
        this.loadCache = [];
        this.key = null;
        this.loadAll(array);
    }

    loadAll(array) {
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
        let codeArray = JSON.parse(result);

        this.loadLibraries(codeArray);
        this.publish(this.sessionId, "triggerPersist");
    }

    loadLibraries(codeArray) {
        let changed = [];
        let nameMap = new Map();
        let userDir = Constants.UserBehaviorDirectory.slice("behaviors/".length);
        let systemDir = Constants.SystemBehaviorDirectory.slice("behaviors/".length);

        codeArray.forEach((moduleDef) => {
            let {action, name, systemModule, location} = moduleDef;
            if (location) {
                let index = location.lastIndexOf("/");
                let pathPart = location.slice(0, index);
                if (!pathPart.startsWith(userDir) && !pathPart.startsWith(systemDir)) {
                    return;
                }
            }

            let internalName = name;
            if (!action || action === "add") {
                let def = {...moduleDef};
                delete def.action;
                if (Array.isArray(def.actorBehaviors)) {
                    def.actorBehaviors = new Map(def.actorBehaviors);
                }
                if (Array.isArray(def.pawnBehaviors)) {
                    def.pawnBehaviors = new Map(def.pawnBehaviors);
                }

                name = this.createAvailableName(internalName, location); // it may be the same name
                nameMap.set(internalName, name);

                this.externalNames.set(`${location}$${moduleDef.name}`, name);
                this.moduleDefs.set(name, def);

                let m = {actorBehaviors: new Map(), pawnBehaviors: new Map()};

                let module = this.modules.get(name);
                if (!module) {
                    module = ScriptingModule.create({name: def.name, systemModule: def.systemModule, location: location});
                }
                module.externalName = name;

                ["actorBehaviors", "pawnBehaviors"].forEach((behaviorType) => {
                    if (moduleDef[behaviorType]) {
                        let map = moduleDef[behaviorType];
                        for (let [behaviorName, codeString] of map) {
                            // so when location is set, and the external name was
                            // synthesized due to a collision, we look up the external name
                            // from file path and module name.
                            // there should not be any other case.

                            // maybe be undefined
                            let externalName = this.externalNames.get(`${location}$${moduleDef.name}`);
                            let behavior = this.lookup(externalName, behaviorName);
                            if (!behavior) {
                                behavior = ScriptingBehavior.create({
                                    systemBehavior: systemModule,
                                    module: module,
                                    name: behaviorName,
                                    type: behaviorType.slice(0, behaviorType.length - 1)
                                });
                                behavior.setCode(codeString);
                                changed.push(behavior);
                            } else if (behavior.code !== codeString) {
                                behavior.setCode(codeString);
                                changed.push(behavior);
                            }
                            m[behaviorType].set(behaviorName, behavior);
                            // this.behaviors.set(behaviorName, behavior);
                        };
                    }
                });
                module.actorBehaviors = m.actorBehaviors;
                module.pawnBehaviors = m.pawnBehaviors;

                this.modules.set(module.externalName, module);
            }

            if (action === "remove") {
                for (let [k, v] of this.modules) {
                    if (v.location === location) {
                        /*for (let behaviorName of v.actorBehaviors.keys()) {
                            this.behaviors.delete(behaviorName);
                        }
                        for (let behaviorName of v.pawnBehaviors.keys()) {
                            this.behaviors.delete(behaviorName);
                            }*/
                        this.externalNameMap.delete(location);
                        this.modules.delete(k);
                        this.moduleDefs.delete(k);
                    }
                }
            }
        });

        let toPublish = [];
        changed.forEach((behavior) => {
            if (!behavior.$behavior.setup) {return;}
            if (behavior.type === "actorBehavior") {
                let modelUsers = this.modelUses.get(behavior);
                let actorManager = this.service("ActorManager");
                if (modelUsers) {
                    modelUsers.forEach((modelId) => {
                        let model = actorManager.get(modelId);
                        if (model) {
                            behavior.future(0).invoke(model, "setup");
                        }
                    });
                }
            } else if (behavior.type === "pawnBehavior") {
                toPublish.push([behavior.module.externalName, behavior.$behaviorName]);
            }
        });
        this.publish(this.id, "callViewSetupAll", toPublish);
        return nameMap;
    }

    save(optModuleNames) {
        let filtered = [...this.moduleDefs].filter(([_key, value]) => !value.systemModule);
        if (optModuleNames) {
            filtered = filtered.filter(([key, _value]) => optModuleNames.includes(key));
            filtered = filtered.map(([key, m]) => {
                let newM = {...m};
                if (newM.location) {
                    function randomString() {
                        return Math.floor(Math.random() * 36 ** 10).toString(36);
                    }
                    newM.location = `${randomString()}/${randomString()}`;
                }
                return [key, newM];
            });
        }
        return new Map([...filtered]);
    }

    modelUse(model, behavior) {
        let modelId = model.id;
        let array = this.modelUses.get(behavior);
        if (!array) {
            array = [];
            this.modelUses.set(behavior, array);
        }
        if (array.indexOf(modelId) < 0) {
            array.push(modelId);
            behavior.ensureBehavior();
            if (behavior.$behavior.setup) {
                behavior.future(0).invoke(model[isProxy] ? model._target : model, "setup");
            }
        }
    }

    modelUnuse(model, behavior) {
        let modelId = model.id;
        let array = this.modelUses.get(behavior);
        if (!array) {return;}
        let ind = array.indexOf(modelId);
        if (ind < 0) {return;}
        array.splice(ind, 1);
        if (behavior.$behavior && behavior.$behavior.teardown) {
            behavior.future(0).invoke(model[isProxy] ? model._target : model, "teardown");
        }
    }

    viewUse(model, behavior) {
        let modelId = model.id;
        let array = this.viewUses.get(behavior);
        if (!array) {
            array = [];
            this.viewUses.set(behavior, array);
        }
        if (array.indexOf(modelId) < 0) {
            array.push(modelId);
        }

        behavior.ensureBehavior();
        if (behavior.$behavior.setup) {
            model.say("callSetup", `${behavior.module.externalName}$${behavior.$behaviorName}`);
        }
    }

    viewUnuse(model, behavior) {
        let modelId = model.id;
        let array = this.viewUses.get(behavior);
        if (!array) {return;}
        let ind = array.indexOf(modelId);
        if (ind < 0) {return;}
        array.splice(ind, 1);
        if (behavior.$behavior && behavior.$behavior.teardown) {
            model.say("callTeardown", `${behavior.module.externalName}$${behavior.$behaviorName}`);
        }
    }
}

BehaviorModelManager.register("BehaviorModelManager");

export class BehaviorViewManager extends ViewService {
    constructor(name) {
        super(name || "BehaviorViewManager");
        this.url = null;
        this.socket = null;
        window.BehaviorViewManager = this;
        this.model = this.wellKnownModel("BehaviorModelManager");
        this.subscribe(this.model.id, "callViewSetupAll", "callViewSetupAll");
    }

    setURL(url) {
        if (this.socket) {
            try {
                this.socket.onmessage = null;
                this.socket.close();
            } finally {
                this.socket = null;
            }
        }
        if (!url) {return;}
        this.url = url;
        this.socket = new WebSocket(url);
        this.socket.onmessage = (event) => this.load(event.data);
    }

    callViewSetupAll(pairs) {
        pairs.forEach((pair) => {
            let behavior = this.model.lookup(...pair);
            let viewUsers = this.model.viewUses.get(behavior);
            if (viewUsers) {
                viewUsers.forEach((modelId) => {
                    let pawn = GetPawn(modelId);
                    if (pawn) {
                        behavior.invoke(pawn, "setup");
                    }
                });
            }
        });
    }

    // This method receives content of changed behavior files.
    // first it creates a script DOM element with type="module", and sets its innerHTML to be the
    // dataURL of a file. In this way, the browser handles "export" in the behavior file,
    // and gives the exported object. We assign the export object into a global variable.
    // The contents of the global variable is then stored into CodeLibrary and the entire result is sent
    // to the corresponding BehaviorModelManager to update the model data.
    load(string) {
        let array;
        try {
            array = JSON.parse(string);
        } catch(e) {
            console.error(e);
            return;
        }
        if (!array || !Array.isArray(array)) {
            console.log("not an array");
            return;
        }

        let systemModuleMap = new Map();

        let dataURLs = [];
        let promises = [];
        let scripts = [];

        if (!window._alLResolvers) {
            window._allResolvers = new Map();
        }

        let key = Date.now() + "_" + Math.random().toString();

        let current = new Map();

        window._allResolvers.set(key, current);

        array.forEach((obj) => {
            // {action, name, content, systemModule} = obj;
            if (obj.action === "add") {
                systemModuleMap.set(obj.name, obj.systemModule);
                let id = Math.random().toString();
                let promise = new Promise((resolve, _reject) => {
                    current.set(id, resolve);
                    let script = document.createElement("script");
                    scripts.push(script);
                    script.type = "module";
                    let dataURL = URL.createObjectURL(new Blob([obj.content], {type: "application/javascript"}));
                    script.innerHTML = `
import * as data from "${dataURL}";
let map = window._allResolvers.get("${key}");
if (map) {map.get("${id}")({data, key: ${key}, name: "${obj.name}"});}
`;
                    document.body.appendChild(script);
                    dataURLs.push(dataURL);
                }).catch((e) => {console.log(e); return null});
                promises.push(promise);
            }
        });

        Promise.all(promises).then(async (allData) => {
            dataURLs.forEach((url) => URL.revokeObjectURL(url));
            scripts.forEach((s) => s.remove());
            allData = allData.filter((o) => o);
            if (allData.length === 0) {return;}

            let keys = [...window._allResolvers.keys()];

            let index = keys.indexOf(key);
            window._allResolvers.delete(key);

            if (index !== keys.length - 1) {
                // if it is not the last element,
                // there was already another call so discard it
            } else {
                let library = new CodeLibrary();
                allData.forEach((obj) => {
                    let dot = obj.name.lastIndexOf(".");
                    let location = obj.name.slice(0, dot);
                    let isSystem = obj.name.startsWith("croquet");
                    library.add(obj.data.default, location, isSystem);
                });

                let sendBuffer = [];
                let key = Math.random();

                for (let [_k, m] of library.modules) {
                    let {actorBehaviors, pawnBehaviors, name, location, systemModule} = m;
                    sendBuffer.push({
                        name, systemModule, location,
                        actorBehaviors: [...actorBehaviors],
                        pawnBehaviors: [...pawnBehaviors]
                    });
                };

                let string = JSON.stringify(sendBuffer);
                let array = new TextEncoder().encode(string);
                let ind = 0;

                this.publish(this.model.id, "loadStart", key);
                let throttle = array.length > 80000;

                while (ind < array.length) {
                    let buf = array.slice(ind, ind + 2880);
                    this.publish(this.model.id, "loadOne", {key, buf});
                    ind += 2880;
                    if (throttle) {
                        await new Promise((resolve) => {
                            setTimeout(resolve, 5);
                        });
                    }
                }

                this.publish(this.model.id, "loadDone", key);
            }
        });
    }
}

export class CodeLibrary {
    constructor() {
        this.modules = new Map(); // for behaviors
        // {name /*test/lights$Bar*/, {actorBehaviors: Map<name, codestring>, pawnBehaviors: Map<name, codestring>}, systemModule: boolean>, location:string?}

        this.functions = new Map();
        this.classes = new Map();
    }

    add(library, location, isSystem) {
        if (library.modules) {
            library.modules.forEach(module => {
                let {name, actorBehaviors, pawnBehaviors} = module;
                let actors = new Map();
                let pawns = new Map();
                if (actorBehaviors) {
                    actorBehaviors.forEach((cls) => {
                        actors.set(cls.name, cls.toString());
                    });
                }
                if (pawnBehaviors) {
                    pawnBehaviors.forEach((cls) => {
                        pawns.set(cls.name, cls.toString());
                    });
                }
                let pathName = `${location}$${name}`;
                let already = this.modules.get(pathName);
                if (already) {
                    console.log(`a module ${name} is defined in ${location} and ${already.location}`);
                }
                this.modules.set(pathName, {
                    name,
                    location,
                    actorBehaviors: actors,
                    pawnBehaviors: pawns,
                    systemModule: isSystem
                });
            });
        }

        if (library.functions) {
            library.functions.forEach(f => {
                let key = f.name;
                let str = `return ${f.toString()};`;
                this.functions.set(key, str);
            });
        }

        if (library.classes) {
            library.classes.forEach(cls => {
                let key = cls.name;
                this.classes.set(key, cls);
            });
        }
    }

    addModules(map) {
        if (!map) {return;}
        for (let [k, v] of map) {
            this.modules.set(k, v);
        }
    }

    get(path) {
        return this.modules.get(path);
    }

    delete(path) {
        this.modules.delete(path);
    }
}
