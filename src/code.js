import * as WorldCore from "@croquet/worldcore";

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
            options.actorCode.forEach((code) => {
                let codeActor = this.wellKnownModel(code);
                if (codeActor) {
                    if (codeActor.ensureHandler().init) {
                        codeActor.invoke(this, "init");
                    }
                }
            });
        }

        // if (options.pawnCode) {
        // this.setViewCode(options.pawnCode);
        // }
    }
            
    codeAccepted(data) {
        this.setCode(data.text);
    }

    future(time) {
        if (this[isProxy]) {
            return this._target.future(time);
        }
        return super.future(time);
    }

    invoke(receiver, name, ...values) {
        let myHandler = this.ensureHandler();
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

    call(expanderName, name, ...values) {
        let expander = this.wellKnownModel(expanderName);
        if (!expander) {
            throw new Error(`epxander named ${expanderName} not found`);
        }
        return expander.invoke(this, name, ...values);
    }

    ensureHandler() {
        if (!this.$handler) {
            let maybeCode = this.getCode();
            this.setCode(maybeCode, true);
        }
        return this.$handler;
    }

    getCode() {
        return this._shapeOptions.runs.map((run) => run.text).join("");
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

        this.$handler = cls.prototype;
        this.$expanderName = cls.name;
    }
}
