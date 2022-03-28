// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import * as WorldCore from "@croquet/worldcore";
const {ViewService, ModelService, GetPawn, Model} = WorldCore;

let isProxy = Symbol("isProxy");
function newProxy(object, handler, behavior) {
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

// this is a bit problematic as the one that handles code (the code editor) and
// the one that uses it both use this one.  But then, you can script a editor
// so it is kind of okay
export const AM_Code = superclass => class extends superclass {
    init(options) {
        super.init(options);
        this.scriptListeners = new Map();
        this.behaviorManager = this.service("BehaviorModelManager");
        if (options.actorCode) {
            options.actorCode.forEach((name) => {
                this.behaviorManager.modelUse(this, name);
            });
        }
        if (options.pawnCode) {
            options.pawnCode.forEach((name) => {
                this.behaviorManager.viewUse(this, name);
            });
        }
    }

    addActorBehavior(name) {
        if (!this._actorCode) {
            this._actorCode = [];
        }

        if (this._actorCode.indexOf(name) < 0) {
            this._actorCode = [...this._actorCode, name];
            this.behaviorManager.modelUse(this, name);
        }
    }

    removeActorBehavior(name) {
        if (!this._actorCode) {return;}
        let ind = this._actorCode.indexOf(name);
        if (ind >= 0) {
            this._actorCode.splice(ind, 1);
            this.behaviorManager.modelUnuse(this, name);
        }
    }

    addPawnBehavior(name) {
        if (!this._pawnCode) {
            this._pawnCode = [];
        }

        if (this._pawnCode.indexOf(name) < 0) {
            this._pawnCode = [...this._pawnCode, name];
            this.behaviorManager.viewUse(this, name);
        }
    }

    removePawnBehavior(name) {
        if (!this._pawnCode) {return;}
        let ind = this._pawnCode.indexOf(name);
        if (ind >= 0) {
            this._pawnCode.splice(ind, 1);
            this.behaviorManager.viewUnuse(this, name);
        }
    }

    destroy() {
        if (this[isProxy]) {
            return this._target.destroy();
        }
        if (this._actorCode) {
            this._actorCode.forEach((name) => {
                this.behaviorManager.modelUnuse(this, name);
            });
        }
        if  (this._pawnCode) {
            this._pawnCode.forEach((name) => {
                this.behaviorManager.viewUnuse(this, name);
            });
        }
        super.destroy();
    }

    future(time) {
        if (!this[isProxy]) {return super.future(time);}
        let behaviorName = this._behavior;
        return this.futureWithBehavior(time, behaviorName);
    }

    futureWithBehavior(time, behaviorName) {
        let superFuture = (sel, args) => super.future(time, sel, args);
        let behaviorManager = this.behaviorManager;
        let basicCall = this.call;
        
        return new Proxy(this, {
            get(_target, property) {
                let behavior = behaviorManager.actorBehaviors.get(behaviorName);

                let func = property === "call" ? basicCall : behavior.$behavior[property];
                let fullName = property === "call" ?  "call" : `${behaviorName}.${property}`;
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

    call(behaviorName, name, ...values) {
        let behavior = this.behaviorManager.actorBehaviors.get(behaviorName);
        if (!behavior) {
            throw new Error(`epxander named ${behaviorName} not found`);
        }

        behavior.ensureBehavior();

        return behavior.invoke(this[isProxy] ? this._target : this, name, ...values);
    }

    scriptListen(eventName, listener) {
        return this.scriptSubscribe(this.id, eventName, listener);
    }

    scriptSubscribe(scope, eventName, listener) {
        //console.log("model", scope, eventName, listener);
        
        if (typeof listener === "function") {
            listener = listener.name;
        }

        let behavior = this._behavior;
        if (!behavior) {
            behavior = behavior.constructor.name;
        }

        let fullMethodName;
        if (listener.indexOf(".") >= 1 || !behavior) {
            fullMethodName = listener;
        } else {
            fullMethodName = `${behavior}.${listener}`;
        }

        let listenerKey = `${scope}:${eventName}${fullMethodName}`;
        let had = this.scriptListeners.get(listenerKey, fullMethodName);
        if (had) {
            return;
        }
        
        this.scriptListeners.set(listenerKey, fullMethodName);
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

        let name = match[1];
        let forActor = this._cardData.actorBehavior;
        let type = forActor ? "actorBehaviors" : "pawnBehaviors";
        
        let current = this.behaviorManager[type].get(name);
        
        this.behaviorManager.loadAllCode([
            {action: "add", type, name, content: data.text,
             systemBehavior: current.systemBehavior}]);
    }

    getCode() {
        return this._cardData.runs.map((run) => run.text).join("");
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
            
        return rcvr.constructor.load([{card: options}], this.wellKnownModel("ModelRoot"), "1")[0];
    }
}

export const PM_Code = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        this.scriptListeners = new Map();
        let behaviorManager = this.actor.behaviorManager;

        this.subscribe(actor.id, "callSetup", "callSetup");
        this.subscribe(actor.id, "callDestroy", "callDestroy");
        if (actor._pawnCode) {
            actor._pawnCode.forEach((name) => {
                let behavior = behaviorManager.pawnBehaviors.get(name);
                if (behavior) {
                    behavior.ensureBehavior();
                }
                if (behavior.$behavior.setup) {
                    this.future(0).callSetup(name);
                }
            });
        }
    }
        
    call(behaviorName, name, ...values) {
        let behavior = this.actor.behaviorManager.pawnBehaviors.get(behaviorName);
        if (!behavior) {
            throw new Error(`epxander named ${behaviorName} not found`);
        }

        behavior.ensureBehavior();

        return behavior.invoke(this[isProxy] ? this._target : this, name, ...values);
    }

    destroy() {
        if (this[isProxy]) {
            return this._target.destroy();
        }
        super.destroy();
    }

    callSetup(name) {
        return this.call(name, "setup");
    }

    callDestroy(name) {
        return this.call(name, "destroy");
    }

    scriptSubscribe(scope, subscription, listener) {
        // console.log("view", scope, subscription, listener);
        let eventName;
        let handling;
        if (typeof subscription === "string") {
            eventName = subscription;
        } else {
            eventName = subscription.event;
            handling = subscription.handling;
        }
        
        if (typeof listener === "function") {
            listener = listener.name;
        }

        let behavior = this._behavior;
        if (!behavior) {
            behavior = behavior.constructor.name;
        }

        let fullMethodName;
        if (listener.indexOf(".") >= 1 || !behavior) {
            fullMethodName = listener;
        } else {
            fullMethodName = `${behavior}.${listener}`;
        }

        let listenerKey = `${scope}:${eventName}${fullMethodName}`;

        let had = this.scriptListeners.get(listenerKey);
        if (had) {
            this.unsubscribe(scope, eventName, fullMethodName);
        }
        
        this.scriptListeners.set(listenerKey, fullMethodName);
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
        
    scriptListen(subscription, listener) {
        return this.scriptSubscribe(this.actor.id, subscription, listener);
    }

}

class ScriptingBehavior extends Model {
    init(options) {
        this.systemBehavior = !!options.systemBehavior;
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
            cls = new Function("WorldCore", code)(WorldCore);
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
        let behavior = this.$behaviorName;
        let result;

        let proxy = newProxy(receiver, myHandler, behavior);
        try {
            let f = proxy[name];
            if (!f) {
                throw new Error(`a method named ${name} not found in ${behavior || this}`);
            }
            result = f.apply(proxy, values);
        } catch (e) {
            console.error("an error occured in", behavior, name, e);
        }
        return result;
    }
}

ScriptingBehavior.register("ScriptingBehavior");

// Each code is a Model object whose contents is the text code
// the model's identifier is the id, but you can also refer to it by name
// If there are two classes with the same name, for now we can say that is not allowed

export class BehaviorModelManager extends ModelService {
    init(name) {
        super.init(name || "BehaviorModelManager");
        this.modelUses = new Map(); // {name: [cardActorId]}
        this.viewUses = new Map();  // {name: [cardActorId]}

        this.actorBehaviors = new Map(); // {name: Behavior}
        this.pawnBehaviors = new Map(); // {name: Behavior}

        this.loadCache = null;

        this.subscribe(this.id, "loadStart", "loadStart");
        this.subscribe(this.id, "loadOne", "loadOne");
        this.subscribe(this.id, "loadDone", "loadDone");
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

        this.loadAllCode(codeArray);
    }

    loadAllCode(codeArray) {
        codeArray.forEach((obj) => {
            let {action, type, name, content, systemBehavior} = obj;

            // type is either actorBehaviors or pawnBehaviors
            if (action === "add") {
                let behavior = this[type].get(name);
                if (!behavior) {
                    behavior = ScriptingBehavior.create({systemBehavior});
                    this[type].set(name, behavior);
                }
                behavior.setCode(content);
            }
            if (action === "remove") {
                this[type].delete(name);
            }
        });

        let toPublish = [];
        codeArray.forEach((obj) => {
            let {action, type, name} = obj;
            if (action === "add") {
                if (type === "actorBehaviors") {
                    let behavior = this.actorBehaviors.get(name);
                    if (!behavior.$behavior.setup) {return;}
                    let modelUsers = this.modelUses.get(name);
                    let actorManager = this.service("ActorManager");
                    if (modelUsers) {
                        modelUsers.forEach((modelId) => {
                            let model = actorManager.get(modelId);
                            if (model) {
                                behavior.future(0).invoke(model, "setup");
                            }
                        });
                    }
                } else if (type === "pawnBehaviors") {
                    toPublish.push(name);
                }
            }
        });
        this.publish(this.id, "callViewSetupAll", toPublish);
    }

    save() {
        let result = {actorBehaviors: new Map(), pawnBehaviors: new Map()};

        ["actorBehaviors", "pawnBehaviors"].forEach((col) => {
            for (let [key, behavior] of this[col]) {
                if (!behavior.systemBehavior) {
                    result[col].set(key, {content: behavior.code});
                }
            }
        });
        return result;
    }
            
    modelUse(model, name) {
        let modelId = model.id;
        let array = this.modelUses.get(name);
        if (!array) {
            array = [];
            this.modelUses.set(name, array);
        }
        if (array.indexOf(modelId) < 0) {
            array.push(modelId);

            let behavior = this.actorBehaviors.get(name);
            if (!behavior) {return;}
            behavior.ensureBehavior();
            if (behavior.$behavior.setup) {
                behavior.future(0).invoke(model[isProxy] ? model._target : model, "setup");
            }
        }
    }

    modelUnuse(model, name) {
        let modelId = model.id;
        let array = this.modelUses.get(name);
        if (!array) {return;}
        let ind = array.indexOf(modelId);
        if (ind < 0) {return;}
        array.splice(ind, 1);
        let behavior = this.actorBehaviors.get(name);
        if (behavior && behavior.$behavior && behavior.$behavior.destroy) {
            behavior.future(0).invoke(model[isProxy] ? model._target : model, "destroy");
        }
    }

    viewUse(model, name) {
        let modelId = model.id;
        let array = this.viewUses.get(name);
        if (!array) {
            array = [];
            this.viewUses.set(name, array);
        }
        if (array.indexOf(modelId) < 0) {
            array.push(modelId);
        }

        let behavior = this.pawnBehaviors.get(name);
        if (!behavior) {return;}
        behavior.ensureBehavior();
        if (behavior.$behavior.setup) {
            model.say("callSetup", name);
        }
    }

    viewUnuse(model, name) {
        let modelId = model.id;
        let array = this.viewUses.get(name);
        if (!array) {return;}
        let ind = array.indexOf(modelId);
        if (ind < 0) {return;}
        array.splice(ind, 1);
        let behavior = this.pawnBehaviors.get(name);
        if (behavior && behavior.$behavior && behavior.$behavior.destroy) {
            model.say("callDestroy", name);
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

    callViewSetupAll(names) {
        names.forEach((name) => {
            let behavior = this.model.pawnBehaviors.get(name);
            let viewUsers = this.model.viewUses.get(name);
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

        let systemBehaviorMap = new Map();

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
            if (obj.action === "add") {
                systemBehaviorMap.set(obj.name, obj.systemBehavior);
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

        Promise.all(promises).then((allData) => {
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
                let files = [];
                allData.forEach((obj) => {
                    let keys = Object.keys(obj.data);
                    keys.forEach((behaviorName) => {
                        if (obj.data[behaviorName] && obj.data[behaviorName].actorBehaviors) {
                            files.push({
                                type: "actorBehaviors",
                                contents: obj.data[behaviorName].actorBehaviors.map(e => e.toString()),
                                systemBehavior: systemBehaviorMap.get(obj.name)});
                        }
                        if (obj.data[behaviorName] && obj.data[behaviorName].pawnBehaviors) {
                            files.push({
                                type: "pawnBehaviors",
                                contents: obj.data[behaviorName].pawnBehaviors.map(e => e.toString()),
                                systemBehavior: systemBehaviorMap.get(obj.name)});
                        }
                    });
                });

                let sendBuffer = [];
                let key = Math.random();
                
                files.forEach((obj) => {
                    let {type, contents, systemBehavior} = obj;

                    contents.forEach((str) => {
                        let match = /^class[\s]+([\S]+)/.exec(str.trim());
                        if (!match) {return;}
                        let className = match[1];

                        sendBuffer.push({
                            action: "add", type, name: className, content: str, key, systemBehavior
                        });
                    });
                });

                let string = JSON.stringify(sendBuffer);
                let array = new TextEncoder().encode(string);
                let ind = 0;
                
                this.publish(this.model.id, "loadStart", key);

                while (ind < array.length) {
                    let buf = array.slice(ind, ind + 4000);
                    this.publish(this.model.id, "loadOne", {key, buf});
                    ind += 4000;
                }
                
                this.publish(this.model.id, "loadDone", key);
            }
        });
    }
}

export class CodeLibrary {
    constructor() {
        this.actorBehaviors = new Map();
        this.pawnBehaviors = new Map();
        this.functions = new Map();
        this.classes = new Map();
    }

    add(library, isSystem) {
        if (library.actorBehaviors) {
            library.actorBehaviors.forEach(cls => {
                let key = cls.name;
                this.actorBehaviors.set(key, {systemBehavior: isSystem, content: cls.toString()});
            });
        }

        if (library.pawnBehaviors) {
            library.pawnBehaviors.forEach(cls => {
                let key = cls.name;
                this.pawnBehaviors.set(key, {systemBehavior: isSystem, content: cls.toString()});
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

    get(path) {
        let ret = this.actorBehaviors.get(path);
        if (ret) {return ret;}
        ret = this.pawnBehaviors.get(path);
        if (ret) {return ret;}
        ret = this.functions.get(path);
        if (ret) {return ret;}
        ret = this.classes.get(path);
        if (ret) {return ret;}
    }

    delete(path) {
        let ret = this.actorBehaviors.get(path);
        if (ret) {
            this.actorBehaviors.delete(path);
            return;
        }
        
        ret = this.pawnBehaviors.get(path);
        if (ret) {
            this.pawnBehaviors.delete(path);
            return;
        }
        
        ret = this.functions.get(path);
        if (ret) {
            this.functions.delete(path);
            return;
        }

        ret = this.classes.get(path);
        if (ret) {
            this.classes.delete(path);
            return;
        }
    }
}
