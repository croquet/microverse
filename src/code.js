let isProxy = Symbol("isProxy");
function newProxy(object, handler, trait) {
    if (object[isProxy] && object._trait === trait) {
        return object;
    }
    return new Proxy(object, {
        get(target, property) {
            if (property === isProxy) {return true;}
            if (property === "_target") {return object;}
            if (property === "_trait") {return trait;}
            if (trait && trait.hasOwnProperty(property)) {
                return new Proxy(trait[property], {
                    apply: function(_target, thisArg, argumentList) {
                        return trait[property].apply(thisArg, argumentList);
                    }
                });
            }
            return target[property];
        },
    });
}

export const AM_Code = superclass => class extends superclass {
    codeAccepted(data) {
        console.log(data.text);
        this.setModelCode([data.text]);
    }

    call(traitOrNull, name, ...values) {
        let myHandler = this.ensureMyHandler();
        let trait;
        let result;
        if (traitOrNull) {
            trait = myHandler[traitOrNull];
        }

        if (traitOrNull && !trait) {
            throw new Error(`an expander named ${traitOrNull} is not installed`);
        }

        let proxy = newProxy(this, myHandler, trait);
        try {
            let f = proxy[name];
            if (!f) {
                throw new Error(`a method named ${name} not found in ${traitOrNull || this}`);
            }
            result = f.apply(proxy, values);
        } catch (e) {
            console.error("an error occured in", this, traitOrNull, name, e);
        }
        return result;
    }

    ensureMyHandler() {
        if (!this.$handlers) {
            this.$handlers = {};
            let maybeCode = this.getCode();
            if (maybeCode.length > 0) {// always an array
                this.setCode(maybeCode, true);
            }
            maybeCode = this.getViewCode();
            if (maybeCode.length > 0) {// always an array
                this.setViewCode(maybeCode);
            }
            maybeCode = this.getStyleString();
            if (maybeCode.length > 0) {
                this.setStyleString(maybeCode);
            }
        }
        return this.$handlers;
    }

    hasHandler(traitName) {
        let myHandler = this.ensureMyHandler();
        return !!myHandler[traitName];
    }

    setModelCode(stringOrArray, notCallInit) {
        if (!stringOrArray) {
            console.log("code is empty for ", this);
            return;
        }

        let array;
        let result = [];
        if (typeof stringOrArray === "string") {
            array = [stringOrArray];
        } else {
            array = stringOrArray;
        }

        this._code = array;
        array.forEach((str) => {
            let trimmed = str.trim();
            let source;
            if (trimmed.length === 0) {return;}
            if (/^class[ \t]/.test(trimmed)) {
                source = trimmed;
            } else {
                let codeActor = this.service("ActorManager").get(`${this.sessionId}/${str}`);
                if (codeActor) {
                    source = codeActor.text;
                }
            }

            if (!source) {
                console.log(`code specified as ${trimmed} is empty for`, this);
            }

            let code = `let x = ${source}; return x;`;
            let cls = new Function(code)();
            if (typeof cls !== "function") {
                console.log("error occured while compiling");
                return;
            }
            result.push(cls);
        });

        if (!this.$handlers) {
            this.$handlers = {};
        }
        let myHandler = this.$handlers;

        Object.keys(myHandler).forEach((k) => {
            if (myHandler[k] && myHandler["_" + k]) {
                delete myHandler[k];
                delete myHandler["_" + k];
            }
        });

        result.forEach((cls) => {
            let name = cls.name;
            myHandler[name] = cls.prototype;
            myHandler["_" + name] = cls;
            if (!notCallInit && cls.prototype.init) {
                this.call(cls.name, "init");
            }
        });
    }

    setViewCode(stringOrArray) {
        if (!stringOrArray) {
            console.log("code is empty for ", this);
            return;
        }

        let array;
        if (typeof stringOrArray === "string") {
            array = [stringOrArray];
        } else {
            array = stringOrArray;
        }
        this.set({viewCode: array});
        this.say("viewCodeUpdated");
    }
}
