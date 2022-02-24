import * as WorldCore from "@croquet/worldcore";
const {ViewService, ModelService, GetPawn} = WorldCore;

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
        if (options.actorCode) {
            let expanderManager = this.service("ExpanderModelManager");
            options.actorCode.forEach((name) => {
                expanderManager.modelUse(this.id, name);
                let codeActor = this.wellKnownModel(name);
                if (codeActor) {
                    if (codeActor.ensureExpander().setup) {
                        codeActor.invoke(this, "setup");
                    }
                }
            });
        }
    }

    // for the code editor probably better be split into a separate mixin
    codeAccepted(data) {
        this.setCode(data.text);

        let expanderModelManager = this.service("ExpanderModelManager");
        let modelUsers = expanderModelManager.modelUses.get(this.expanderName);
        let actorManager = this.service("ActorManager");
        modelUsers.forEach((modelId) => {
            let model = actorManager.get(modelId);
            if (model) {
                if (this.$expander.setup) {
                    this.invoke(model, "setup");
                }
            }
        });
        this.say("codeAccepted");
    }

    codeLoaded(data) {
        if (this.textActor) {
            this.publish(this.textActor.id, "load", data);
        }
    }

    future(time) {
        if (this[isProxy]) {
            return this._target.future(time);
        }
        return super.future(time);
    }

    invoke(receiver, name, ...values) {
        let myHandler = this.ensureExpander();
        let expander = this.expanderName;
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

    call(expanderName, name, ...values) {
        let expander = this.wellKnownModel(expanderName);
        if (!expander) {
            throw new Error(`epxander named ${expanderName} not found`);
        }
        return expander.invoke(this, name, ...values);
    }

    ensureExpander() {
        if (!this.$expander) {
            let maybeCode = this.getCode();
            this.setCode(maybeCode, true);
        }
        return this.$expander;
    }

    getCode() {
        return this._cardData.runs.map((run) => run.text).join("");
    }

    setCode(string, notCallInit) {
        if (!string) {
            console.log("code is empty for ", this);
            return;
        }

        let trimmed = string.trim();
        let source;
        if (trimmed.length === 0) {return;}
        if (/^class[ \t]/.test(trimmed)) {
            source = trimmed;
        }

        //let code = `let x = ${source}; return x;`;
        let code = `return (${source})`;
        let cls = new Function("WorldCore", code)(WorldCore);
        if (typeof cls !== "function") {
            console.log("error occured while compiling");
            return;
        }

        this.$expander = cls.prototype;
        this.expanderName = cls.name;
        let newOptions = {...this._cardData};
        newOptions.expanderName = this.expanderName;
        this.set({cardData: newOptions});
    }
}

export const PM_Code = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        this.listen("codeAccepted", this.codeAccepted);

        if (actor._pawnCode) {
            actor._pawnCode.forEach((name) => {
                let codeActor = this.wellKnownModel(name);
                if (codeActor) {
                    let expanderManager = this.service("ExpanderViewManager");
                    expanderManager.viewUse(this.id, name);
                }
            });
        }
    }
        
    codeAccepted() {
        if (!this._actor.$expander.setup) {return;}
        let expanderManager = this.service("ExpanderViewManager");
        let viewUsers = this.viewUses.get(this.expanderName);
        viewUsers.forEach((modelId) => {
            let pawn = GetPawn(modelId);
            this.invoke(pawn, "setup");
        });
    }
}

export class ExpanderModelManager extends ModelService {
    init(name) {
        super.init(name || "ExpanderModelManager");
        this.modelUses = new Map(); // {modelId: [names]}
        this.viewUses = new Map();  // {modelId: [names]}
    }

    modelUse(modelId, name) {
        let array = this.modelUses.get(name);
        if (!array) {
            array = [];
            this.modelUses.set(name, array);
        }
        if (array.indexOf(modelId) < 0) {
            array.push(modelId);
        }
    }

    viewUse(modelId, name) {
        let array = this.viewUsers.get(name);
        if (!array) {
            array = [];
            this.viewUses.set(name, array);
        }
        if (array.indexOf(modelId) < 0) {
            array.push(modelId);
        }
    }
}

ExpanderModelManager.register("ExpanderModelManager");

export class ExpanderViewManager extends ViewService {
    constructor(name) {
        super(name || "ExpanderManager");
        this.url = null;
        this.socket = null;
        window.ExpanderViewManager = this;
    }

    setURL(url) {
        if (this.socket) {
            try {
                this.socket.close();
            } finally {
                this.socket = null;
            }
        }
        this.url = url;
        this.socket = new WebSocket(url);
        this.socket.onmessage = (event) => this.load(event.data);
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

        array.forEach((obj) => {
            let {action, name, content} = obj;
            let codeActor = this.wellKnownModel(name);
            if (codeActor) {
                if (action === "add") {
                    this.publish(codeActor.id, "load", content);
                } else if (action === "remove") {
                    this.publish(codeActor.id, "load", "");
                }
            }
        });
    }
}
