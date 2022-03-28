// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import * as WorldCore from "@croquet/worldcore";
const {ViewService, ModelService, GetPawn, Model} = WorldCore;

let isProxy = Symbol("isProxy");
function newProxy(object, handler, expander) {
    if (object[isProxy]) {
        return object;
    }
    return new Proxy(object, {
        get(target, property) {
            if (property === isProxy) {return true;}
            if (property === "_target") {return object;}
            if (property === "_expander") {return expander;}
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
        this.expanderManager = this.service("ExpanderModelManager");
        if (options.actorCode) {
            options.actorCode.forEach((name) => {
                this.expanderManager.modelUse(this, name);
            });
        }
        if (options.pawnCode) {
            options.pawnCode.forEach((name) => {
                this.expanderManager.viewUse(this, name);
            });
        }
    }

    addActorExpander(name) {
        if (!this._actorCode) {
            this._actorCode = [];
        }

        if (this._actorCode.indexOf(name) < 0) {
            this._actorCode = [...this._actorCode, name];
            this.expanderManager.modelUse(this, name);
        }
    }

    removeActorExpander(name) {
        if (!this._actorCode) {return;}
        let ind = this._actorCode.indexOf(name);
        if (ind >= 0) {
            this._actorCode.splice(ind, 1);
            this.expanderManager.modelUnuse(this, name);
        }
    }

    addPawnExpander(name) {
        if (!this._pawnCode) {
            this._pawnCode = [];
        }

        if (this._pawnCode.indexOf(name) < 0) {
            this._pawnCode = [...this._pawnCode, name];
            this.expanderManager.viewUse(this, name);
        }
    }

    removePawnExpander(name) {
        if (!this._pawnCode) {return;}
        let ind = this._pawnCode.indexOf(name);
        if (ind >= 0) {
            this._pawnCode.splice(ind, 1);
            this.expanderManager.viewUnuse(this, name);
        }
    }

    destroy() {
        if (this[isProxy]) {
            return this._target.destroy();
        }
        if (this._actorCode) {
            this._actorCode.forEach((name) => {
                this.expanderManager.modelUnuse(this, name);
            });
        }
        if  (this._pawnCode) {
            this._pawnCode.forEach((name) => {
                this.expanderManager.viewUnuse(this, name);
            });
        }
        super.destroy();
    }

    future(time) {
        if (!this[isProxy]) {return super.future(time);}
        let expanderName = this._expander;
        return this.futureWithExpander(time, expanderName);
    }

    futureWithExpander(time, expanderName) {
        let superFuture = (sel, args) => super.future(time, sel, args);
        let expanderManager = this.expanderManager;
        let basicCall = this.call;
        
        return new Proxy(this, {
            get(_target, property) {
                let expander = expanderManager.actorExpanders.get(expanderName);

                let func = property === "call" ? basicCall : expander.$expander[property];
                let fullName = property === "call" ?  "call" : `${expanderName}.${property}`;
                if (typeof func === "function") {
                    const methodProxy = new Proxy(func, {
                        apply(_method, _this, args) {
                            return superFuture(fullName, args);
                        }
                    });
                    return methodProxy;
                }
                throw Error("Tried to call " + property + "() on future of " + expanderName + " which is not a function");
            }
        });
    }

    call(expanderName, name, ...values) {
        let expander = this.expanderManager.actorExpanders.get(expanderName);
        if (!expander) {
            throw new Error(`epxander named ${expanderName} not found`);
        }

        expander.ensureExpander();

        return expander.invoke(this[isProxy] ? this._target : this, name, ...values);
    }

    scriptListen(eventName, listener) {
        return this.scriptSubscribe(this.id, eventName, listener);
    }

    scriptSubscribe(scope, eventName, listener) {
        //console.log("model", scope, eventName, listener);
        
        if (typeof listener === "function") {
            listener = listener.name;
        }

        let expander = this._expander;
        if (!expander) {
            expander = expander.constructor.name;
        }

        let fullMethodName;
        if (listener.indexOf(".") >= 1 || !expander) {
            fullMethodName = listener;
        } else {
            fullMethodName = `${expander}.${listener}`;
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
        let forActor = this._cardData.actorExpander;
        let type = forActor ? "actorExpanders" : "pawnExpanders";
        
        let current = this.expanderManager[type].get(name);
        
        this.expanderManager.loadAllCode([
            {action: "add", type, name, content: data.text,
             systemExpander: current.systemExpander}]);
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
        let expanderManager = this.actor.expanderManager;

        this.subscribe(actor.id, "callSetup", "callSetup");
        this.subscribe(actor.id, "callDestroy", "callDestroy");
        if (actor._pawnCode) {
            actor._pawnCode.forEach((name) => {
                let expander = expanderManager.pawnExpanders.get(name);
                if (expander) {
                    expander.ensureExpander();
                }
                if (expander.$expander.setup) {
                    this.future(0).callSetup(name);
                }
            });
        }
    }
        
    call(expanderName, name, ...values) {
        let expander = this.actor.expanderManager.pawnExpanders.get(expanderName);
        if (!expander) {
            throw new Error(`epxander named ${expanderName} not found`);
        }

        expander.ensureExpander();

        return expander.invoke(this[isProxy] ? this._target : this, name, ...values);
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

        let expander = this._expander;
        if (!expander) {
            expander = expander.constructor.name;
        }

        let fullMethodName;
        if (listener.indexOf(".") >= 1 || !expander) {
            fullMethodName = listener;
        } else {
            fullMethodName = `${expander}.${listener}`;
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

class Expander extends Model {
    init(options) {
        this.systemExpander = !!options.systemExpander;
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

        this.$expander = cls.prototype;
        this.$expanderName = cls.name;

        if (!theSame) {
            this.publish(this.id, "setCode", string);
        }
    }

    ensureExpander() {
        if (!this.$expander) {
            let maybeCode = this.code;
            this.setCode(maybeCode, true);
        }
        return this.$expander;
    }

    invoke(receiver, name, ...values) {
        this.ensureExpander();
        let myHandler = this.$expander;
        let expander = this.$expanderName;
        let result;

        let proxy = newProxy(receiver, myHandler, expander);
        try {
            let f = proxy[name];
            if (!f) {
                throw new Error(`a method named ${name} not found in ${expander || this}`);
            }
            result = f.apply(proxy, values);
        } catch (e) {
            console.error("an error occured in", expander, name, e);
        }
        return result;
    }
}

Expander.register("Expander");

// Each code is a Model object whose contents is the text code
// the model's identifier is the id, but you can also refer to it by name
// If there are two classes with the same name, for now we can say that is not allowed

export class ExpanderModelManager extends ModelService {
    init(name) {
        super.init(name || "ExpanderModelManager");
        this.modelUses = new Map(); // {name: [cardActorId]}
        this.viewUses = new Map();  // {name: [cardActorId]}

        this.actorExpanders = new Map(); // {name: Expander}
        this.pawnExpanders = new Map(); // {name: Expander}

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
            let {action, type, name, content, systemExpander} = obj;

            if (action === "add") {
                if (type === "actorExpanders") {
                    let expander = this.actorExpanders.get(name);
                    if (!expander) {
                        expander = Expander.create({systemExpander});
                        this.actorExpanders.set(name, expander);
                    }
                    expander.setCode(content);
                } else if (type === "pawnExpanders") {
                    let expander = this.pawnExpanders.get(name);
                    if (!expander) {
                        expander = Expander.create({systemExpander});
                        this.pawnExpanders.set(name, expander);
                    }
                    expander.setCode(content);
                }
            }
            if (action === "remove") {
                if (type === "actorExpanders") {
                    this.actorExpanders.delete(name);
                }
                if (type === "pawnExpanders") {
                    this.pawnExpanders.delete(name);
                }
            }
        });

        let toPublish = [];
        codeArray.forEach((obj) => {
            let {action, type, name} = obj;
            if (action === "add") {
                if (type === "actorExpanders") {
                    let expander = this.actorExpanders.get(name);
                    if (!expander.$expander.setup) {return;}
                    let modelUsers = this.modelUses.get(name);
                    let actorManager = this.service("ActorManager");
                    if (modelUsers) {
                        modelUsers.forEach((modelId) => {
                            let model = actorManager.get(modelId);
                            if (model) {
                                expander.future(0).invoke(model, "setup");
                            }
                        });
                    }
                } else if (type === "pawnExpanders") {
                    toPublish.push(name);
                }
            }
        });
        this.publish(this.id, "callViewSetupAll", toPublish);
    }

    save() {
        let actorExpanders = new Map();
        let pawnExpanders = new Map();

        for (let [key, expander] of this.actorExpanders) {
            if (!expander.systemExpander) {
                actorExpanders.set(key, {content: expander.code});
            }
        }
        for (let [key, expander] of this.pawnExpanders) {
            if (!expander.systemExpander) {
                pawnExpanders.set(key, {content: expander.code});
            }
        }
        return {actorExpanders, pawnExpanders};
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

            let expander = this.actorExpanders.get(name);
            if (!expander) {return;}
            expander.ensureExpander();
            if (expander.$expander.setup) {
                expander.future(0).invoke(model[isProxy] ? model._target : model, "setup");
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
        let expander = this.actorExpanders.get(name);
        if (expander && expander.$expander && expander.$expander.destroy) {
            expander.future(0).invoke(model[isProxy] ? model._target : model, "destroy");
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

        let expander = this.pawnExpanders.get(name);
        if (!expander) {return;}
        expander.ensureExpander();
        if (expander.$expander.setup) {
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
        let expander = this.pawnExpanders.get(name);
        if (expander && expander.$expander && expander.$expander.destroy) {
            model.say("callDestroy", name);
        }
    }
}

ExpanderModelManager.register("ExpanderModelManager");

export class ExpanderViewManager extends ViewService {
    constructor(name) {
        super(name || "ExpanderViewManager");
        this.url = null;
        this.socket = null;
        window.ExpanderViewManager = this;
        this.model = this.wellKnownModel("ExpanderModelManager");
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
            let expander = this.model.pawnExpanders.get(name);
            let viewUsers = this.model.viewUses.get(name);
            if (viewUsers) {
                viewUsers.forEach((modelId) => {
                    let pawn = GetPawn(modelId);
                    if (pawn) {
                        expander.invoke(pawn, "setup");
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

        let systemExpanderMap = new Map();

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
                systemExpanderMap.set(obj.name, obj.systemExpander);
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
                    keys.forEach((expName) => {
                        if (obj.data[expName] && obj.data[expName].actorExpanders) {
                            files.push({
                                type: "actorExpanders",
                                contents: obj.data[expName].actorExpanders.map(e => e.toString()),
                                systemExpander: systemExpanderMap.get(obj.name)});
                        }
                        if (obj.data[expName] && obj.data[expName].pawnExpanders) {
                            files.push({
                                type: "pawnExpanders",
                                contents: obj.data[expName].pawnExpanders.map(e => e.toString()),
                                systemExpander: systemExpanderMap.get(obj.name)});
                        }
                    });
                });

                let sendBuffer = [];
                let key = Math.random();
                
                files.forEach((obj) => {
                    let {type, contents, systemExpander} = obj;

                    contents.forEach((str) => {
                        let match = /^class[\s]+([\S]+)/.exec(str.trim());
                        if (!match) {return;}
                        let className = match[1];

                        sendBuffer.push({
                            action: "add", type, name: className, content: str, key, systemExpander
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
        this.actorExpanders = new Map();
        this.pawnExpanders = new Map();
        this.functions = new Map();
        this.classes = new Map();
    }

    add(library, isSystem) {
        if (library.actorExpanders) {
            library.actorExpanders.forEach(cls => {
                let key = cls.name;
                this.actorExpanders.set(key, {systemExpander: isSystem, content: cls.toString()});
            });
        }

        if (library.pawnExpanders) {
            library.pawnExpanders.forEach(cls => {
                let key = cls.name;
                this.pawnExpanders.set(key, {systemExpander: isSystem, content: cls.toString()});
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
        let ret = this.actorExpanders.get(path);
        if (ret) {return ret;}
        ret = this.pawnExpanders.get(path);
        if (ret) {return ret;}
        ret = this.functions.get(path);
        if (ret) {return ret;}
        ret = this.classes.get(path);
        if (ret) {return ret;}
    }

    delete(path) {
        let ret = this.actorExpanders.get(path);
        if (ret) {
            this.actorExpanders.delete(path);
            return;
        }
        
        ret = this.pawnExpanders.get(path);
        if (ret) {
            this.pawnExpanders.delete(path);
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
