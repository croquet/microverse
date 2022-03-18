// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import * as WorldCore from "@croquet/worldcore";
const {ViewService, ModelService, GetPawn, Model, Constants} = WorldCore;

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
            let expander = this.expanderManager.code.get(name);
            if (expander && expander.$expander && expander.$expander.destroy) {
                expander.invoke(this[isProxy] ? this._target : this, "destroy");
            }
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
            this.publish(this.id, "callSetup", name);
        }
    }

    removePawnExpander(name) {
        if (!this._pawnCode) {return;}
        let ind = this._pawnCode.indexOf(name);
        if (ind >= 0) {
            this.publish(this.id, "callDestroy", name);
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
                let expander = this.expanderManager.code.get(name);
                if (expander && expander.$expander.destroy) {
                    this.call(name, "destroy");
                }
                this.expanderManager.modelUnuse(this, name);
            });
        }
        if  (this._pawnCode) {
            this._pawnCode.forEach((name) => {
                this.say("callDestroy", name);
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
                let expander = expanderManager.code.get(expanderName);

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
        let expander = this.expanderManager.code.get(expanderName);
        if (!expander) {
            throw new Error(`epxander named ${expanderName} not found`);
        }

        expander.ensureExpander();

        return expander.invoke(this[isProxy] ? this._target : this, name, ...values);
    }

    scriptListen(eventName, listener) {
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
        
        let had = this.scriptListeners.get(eventName, fullMethodName);
        if (had) {
            return;
        }
        this.scriptListeners.set(eventName, fullMethodName);
        super.listen(eventName, fullMethodName);
    }

    scriptSubscribe(scope, eventName, listener) {
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
        
        super.subscribe(scope, eventName, fullMethodName);
    }

    // this is for the code editor. Probably better be split into a separate mixin
    codeAccepted(data) {
        let match = /^class[\s]+([\S]+)/.exec(data.text.trim());
        if (!match) {
            console.log("code does not begin with the keyword class and name");
            return;
        }

        let name = match[1];
        
        this.expanderManager.loadAll([{action: "add", name, content: data.text}]);
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
                let expander = expanderManager.code.get(name);
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
        let expander = this.actor.expanderManager.code.get(expanderName);
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

    scriptListen(eventName, listener) {
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

        let had = this.scriptListeners.get(eventName);
        if (had) {
            this.ignore(eventName, fullMethodName);
        }
        
        this.scriptListeners.set(eventName, fullMethodName);
        if (fullMethodName.indexOf(".") >= 1) {
            let split = fullMethodName.split(".");
            let func = (data) => this.call(split[0], split[1], data);
            return super.subscribe(this.actor.id, eventName, func);
        }
        super.subscribe(this.actor.id, eventName, fullMethodName);
    }
}

class Expander extends Model {
    setCode(string) {
        if (!string) {
            console.log("code is empty for ", this);
            return;
        }

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

        this.code = new Map(); // {name: Expander}

        this.loadCache = null;

        this.subscribe(this.id, "loadStart", "loadStart");
        this.subscribe(this.id, "loadOne", "loadOne");
        this.subscribe(this.id, "loadDone", "loadDone");
    }

    loadStart() {
        this.loadCache = [];
    }

    loadOne(obj) {
        this.loadCache.push(obj);
    }

    loadDone() {
        let array = this.loadCache;
        this.loadCache = [];
        this.loadAll(array);
    }

    loadAll(array) {
        array.forEach((obj) => {
            let {action, name, content} = obj;

            if (action === "add") {
                let expander = this.code.get(name);
                if (!expander) {
                    expander = Expander.create();
                    this.code.set(name, expander);
                }
                expander.setCode(content);
            }

            if (action === "remove") {
                let codeModel = this.code.get(name);
                if (codeModel) {
                    this.code.delete(name);
                }
            }
        });

        let toPublish = [];
        array.forEach((obj) => {
            let {action, name} = obj;
            if (action === "add") {
                let code = this.code.get(name);
                if (!code.$expander.setup) {return;}
                toPublish.push(name);
                let modelUsers = this.modelUses.get(name);
                let actorManager = this.service("ActorManager");
                if (modelUsers) {
                    modelUsers.forEach((modelId) => {
                        let model = actorManager.get(modelId);
                        if (model) {
                            code.invoke(model, "setup");
                        }
                    });
                }
            }
        });
        this.publish(this.id, "callViewSetupAll", toPublish);
    }

    save() {
        let result = new Map();
        for (let [key, expander] of this.code) {
            result.set(key, expander.code);
        };
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

            let expander = this.code.get(name);
            if (!expander) {return;}
            expander.ensureExpander();
            if (expander.$expander.setup) {
                expander.invoke(model, "setup");
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

        let expander = this.code.get(name);
        if (!expander) {return;}
        expander.ensureExpander();
    }

    viewUnuse(model, name) {
        let modelId = model.id;
        let array = this.viewUses.get(name);
        if (!array) {return;}
        let ind = array.indexOf(modelId);
        if (ind < 0) {return;}
        array.splice(ind, 1);
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

        // this.justConstructed = true;

        // this.subscribe(this.viewId, "synced", "synced");
    }

    /*
    synced(flag) {
        if (flag && this.justConstructed) {
            this.justConstructed = false;
            for (let [key, array] of this.model.viewUses) {
                let code = this.model.code.get(key);
                if (!code) {continue;}
                code.ensureExpander();
                if (!code.$expander.setup) {continue;}
                array.forEach((modelId) => {
                    let pawn = GetPawn(modelId);
                    if (pawn) {
                        code.invoke(pawn, "setup");
                    }
                })
            };
        }
    }*/

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
            let code = this.model.code.get(name);
            let viewUsers = this.model.viewUses.get(name);
            if (viewUsers) {
                viewUsers.forEach((modelId) => {
                    let pawn = GetPawn(modelId);
                    if (pawn) {
                        code.invoke(pawn, "setup");
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
                let id = Math.random().toString();
                let promise = new Promise((resolve, _reject) => {
                    current.set(id, resolve);
                    let script = document.createElement("script");
                    scripts.push(script);
                    script.type = "module";
                    let dataURL = URL.createObjectURL(new Blob([obj.content], {type: "application/javascript"}));
                    script.innerHTML = `
import * as data from "${dataURL}";
window._allResolvers.get("${key}").get("${id}")({data, key: ${key}});
console.log(data)`;
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
                        if (obj.data[expName] && obj.data[expName].expanders) {
                            files.push(...obj.data[expName].expanders.map(e => e.toString()));
                        }
                    });
                });
                this.publish(this.model.id, "loadStart");

                files.forEach((str) => {
                    let match = /^class[\s]+([\S]+)/.exec(str.trim());
                    if (!match) {return;}
                    let className = match[1];
                    
                    this.publish(this.model.id, "loadOne", {
                        action: "add", name: className, content: str
                    });
                });
                this.publish(this.model.id, "loadDone");
            }
        });
    }
}

export class ExpanderLibrary {
    constructor() {
        this.expanders = new Map();
        this.functions = new Map();
        this.classes = new Map();
    }

    add(library, path) {
        if (library.expanders) {
            library.expanders.forEach(cls => {
                let key = (path ? path + "." : "") + cls.name;
                this.expanders.set(key, cls.toString());
            });
        }

        if (library.functions) {
            library.functions.forEach(f => {
                let key = (path ? path + "." : "") + f.name;
                let str = `return ${f.toString()};`;
                this.functions.set(key, str);
            });
        }

        if (library.classes) {
            library.classes.forEach(cls => {
                let key = (path ? path + "." : "") + cls.name;
                this.classes.set(key, cls);
            });
        }
    }

    get(path) {
        let ret = this.expanders.get(path);
        if (ret) {return ret;}
        ret = this.functions.get(path);
        if (ret) {return ret;}
        ret = this.classes.get(path);
        if (ret) {return ret;}
    }

    delete(path) {
        let ret = this.expanders.get(path);
        if (ret) {
            this.expanders.delete(path);
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

    installAsBaseLibrary() {
        Constants.Library = this;
    }

    static getBaseLibrary() {
        return Constants.Library;
    }
}
