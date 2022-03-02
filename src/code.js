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
            this._actorCode.push(name);
            this.expanderManager.modelUse(this, name);
        }
    }

    addPawnExpander(name) {
        if (!this._pawnCode) {
            this._pawnCode = [];
        }

        if (this._pawnCode.indexOf(name) < 0) {
            this._pawnCode.push(name);
            this.expanderManager.viewUse(this, name);
        }
    }

    future(time) {
        if (this[isProxy]) {
            return this._target.future(time);
        }
        return super.future(time);
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
}

export const PM_Code = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        this.scriptListeners = new Map();
        let expanderManager = this.actor.expanderManager;

        this.publish(actor.id, "callSetup", "callSetup");
        if (actor.pawnCode) {
            actor.pawnCode.forEach((name) => {
                let expander = expanderManager.code.get(name);
                if (expander && expander.$expander.setup) {
                    expander.invoke(this, "setup");
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

    callSetup(name) {
        return this.call(name, "setup");
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
            console.log("error occured while compiling", error);
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
            console.error("an error occured in", this, expander, name, e);
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
        let result = [];
        for (let [key, expander] of this.code) {
            result.push({action: "add", name: key, content: expander.code});
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

            let code = this.code.get(name);
            if (code && code.$expander.setup) {
                code.invoke(model, "setup");
            }
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
        this.publish(modelId, "callSetup", name);
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

        this.justConstructed = true;

        this.subscribe(this.viewId, "synced", "synced");
    }

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

        this.publish(this.model.id, "loadStart");

        array.forEach((obj) => {
            this.publish(this.model.id, "loadOne", obj);
        });
        
        this.publish(this.model.id, "loadDone");
    }
}
