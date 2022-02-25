import { Actor, Pawn, GetPawn, mix, RegisterMixin, AM_Predictive, PM_Predictive } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- AM_PointerTarget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to an actor to have it handle card pointer events.

export const AM_PointerTarget = superclass => class extends superclass {
    init(options) {
        super.init(options);
        this.eventListeners = new Map();
        this.listen("dispatchEvent", this.dispatchEvent);
        this.hovered = new Set();
        this.focused = new Set();
        this.listen("hoverRequested", this.hoverRequested);
        this.listen("unhoverRequested", this.unhoverRequested);

        this.listen("blur", this._onBlur);
        this.listen("tryFocus", this._onTryFocus);
        this.future(0).dropoutTick();
    }

    get isMultiuser() { return this._multiuser; }
    get isHovered() { return this.hovered.size};
    get isFocused() { return this.focused.size};

    dispatchEvent(data) {
        let {eventName, evt} = data;
        let array = this.eventListeners.get(eventName);
        if (!array) {return;}

        array.forEach((obj) => {
            let {expander, listener} = obj;
            if (expander) {
                this.call(expander, listener, evt);
            } else {
                this[listener](evt);
            }
        });
    }

    addEventListener(eventName, listener) {
        let expander = this._expander;
        if (typeof listener === "function") {
            listener = listener.name;
        }
        let array = this.eventListeners.get(eventName);
        if (!array) {
            array = [];
            this.eventListeners.set(eventName, array);
        }
        if (array.indexOf(listener) >= 0) {
            console.log("multiple registration of the same function");
            return;
        }
        array.push({expander, listener});

        this.say("registerEventListener", {eventName, listener});
    }

    removeEventListener(eventName, listener) {
        if (typeof listener === "function") {
            listener = listener.name;
        }
        let array = this.eventListeners.get(eventName);
        if (!array) {
            console.log("try to remove non-existent listener");
            return;
        }
        let ind = array.indexOf(listener);
        if (ind < 0) {
            console.log("try to remove non-existent listener");
            return;
        }
        array.splice(ind, 1);
        if (array.length === 0) {
            this.eventListeners.delete(eventName);
            this.say("unregisterEventListener", {eventName, listener});
        }
    }

    dropoutTick() {
        const am = this.service("ActorManager");
        const testHovered = new Set(this.hovered);
        const testFocused = new Set(this.focused);
        testHovered.forEach(id => {
            if (!am.has(id)) this.hovered.delete(id);
        })
        testFocused.forEach(id => {
            if (!am.has(id)) this.focused.delete(id);
        })
        if (!this.doomed) this.future(1000).dropoutTick();
    }

    hoverRequested(pointerId) {
        this.hovered.add(pointerId);
    }

    unhoverRequested(pointerId) {
        this.hovered.delete(pointerId);
    }

    _onTryFocus(pointerId) {
        if (this.focused.has(pointerId)) return;
        if (!this.isMultiuser && this.focused.size > 0) {
            this.say("focusFailure", pointerId);
        } else {
            this.focused.add(pointerId);
            this.say("focusSuccess", pointerId);
            this.dispatchEvent({eventName: "focus", evt: pointerId});
        }
    }

    _onBlur(pointerId) {
        this.focused.delete(pointerId);
        this.dispatchEvent({eventName: "blur", evt: pointerId});
    }

    checkFocus(pe) {
        return this.focused.has(pe.pointerId);
    }
}
RegisterMixin(AM_PointerTarget);

//------------------------------------------------------------------------------------------
//-- PM_PointerTarget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to a pawn to have it be targeted by PM_Pointer

export const PM_PointerTarget = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        this.eventListeners = new Map();
        this.modelListeners = new Map();

        this.listen("registerEventListener", "registerEventListener");
        this.listen("unregisterEventListener", "unregisterEventListener");

        // send from model to indicate that non multiuser object was already busy
        // the user of this mixin needs to add event listeners
        this.listen("focusFailure", this._onFocusFailure);
        this.listen("focusSuccess", this._onFocusSuccess);

        if (this.onKeyDown) this.listen("keyDown", this.onKeyDown);
        if (this.onKeyUp) this.listen("keyUp", this.onKeyUp);

        this.registerAllEventListeners();
    }

    destroy() {
        super.destroy();

        const hoverEnd = new Set(this.actor.hovered);
        hoverEnd.forEach( pointerId => {
            const pointerPawn = GetPawn(pointerId);
            if (pointerPawn) pointerPawn.hoverPawn = null;
        });

        const focusEnd = new Set(this.actor.focused);
        focusEnd.forEach( pointerId => {
            const pointerPawn = GetPawn(pointerId);
            if (pointerPawn) pointerPawn.focusPawn = null;
        });
    }

    addEventListener(eventName, listener, name) {
        if (typeof listener === "string") {
            name = listener;
            listener = (evt) => this[name](evt);
        } else {
            if (!name) {
                name = listener.name;
            }
        }
        let array = this.eventListeners.get(eventName);
        if (!array) {
            array = [];
            this.eventListeners.set(eventName, array);
        }
        if (array.find((obj) => obj.name === name)) {
            console.log("multiple registration of the same function");
            return;
        }
        array.push({name, listener});
    }

    removeEventListener(eventName, listener) {
        let name;
        if (typeof listener === "string") {
            listener = (evt) => this[listener](evt);
            name = listener;
        } else {
            name = listener.name;
        }
        let array = this.eventListeners.get(eventName);
        if (!array) {
            console.log("try to remove non-existent listener");
            return;
        }
        let ind = array.findIndex((obj) => obj.name === name);
        if (ind < 0) {
            console.log("try to remove non-existent listener");
            return;
        }
        array.splice(ind, 1);
    }

    registerEventListener(data) {
        window.flpawn = this;
        let {eventName} = data;
        if (!this.modelListeners.get(eventName)) {
            let func = (evt) => this.say("dispatchEvent", {eventName, evt});
            this.modelListeners.set(eventName, func);
            this.addEventListener(eventName, func, `dispatch_${eventName}`);
        }
    }

    unregisterEventListener(data) {
        let {eventName, listener} = data;
        let func = this.modelListeners.get(eventName);
        if (!func) {return;}
        this.removeEventListener(eventName, func);
    }

    registerAllEventListeners() {
        if (!this.actor.eventListeners) {return;}
        for (let eventName of this.actor.eventListeners.keys()) {
            this.registerEventListener({eventName});
        }
    }

    get isMultiuser() { return this.actor.isMultiuser; }
    get isHovered() { return this.actor.isHovered; }
    get isFocused() { return this.actor.isFocused; }

    _onFocusFailure(pointerId) {
        const pointerPawn = GetPawn(pointerId);
        if (pointerPawn) pointerPawn.focusPawn = null;
        let array = this.eventListeners.get("focusFailure");
        if (array) {
            array.forEach((obj) => {
                obj.listner.call(this, pointerId);
            });
        }
    }

    _onFocusSuccess(pointerId) {
        const pointerPawn = GetPawn(pointerId);
        if (pointerPawn) pointerPawn.focusPawn = this;
        let array = this.eventListeners.get("focusSuccess");
        if (array) {
            array.forEach((obj) => {
                obj.listner.call(this, pointerId);
            });
        }
    }

    _nop() {}
}

//------------------------------------------------------------------------------------------
//-- PM_Pointer ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to an avatar to allow it to use card pointer events.
// Requires the ThreeCamera raycaster.

export const PM_Pointer = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        if (!this.isMyPlayerPawn) {return;}

        this.focusTime = this.now();
        this.idleTimeout = 5000;

        this.future(0).focusTick();

        if (this.service("UIManager")) {
            this.subscribe("ui", "pointerDown", this.doPointerDown);
            this.subscribe("ui", "pointerUp", this.doPointerUp);
            this.subscribe("ui", "pointerMove", this.doPointerMove);
            this.subscribe("ui", "click", this.doPointerClick);
            this.subscribe("ui", "wheel", this.doPointerWheel);
            this.subscribe("ui", "doubleDown", this.doPointerDoubleDown);
            this.subscribe("ui", "tap", this.doPointerTap);
        } else {
            this.subscribe("input", "pointerDown", this.doPointerDown);
            this.subscribe("input", "pointerUp", this.doPointerUp);
            this.subscribe("input", "pointerMove", this.doPointerMove);
            this.subscribe("input", "click", this.doPointerClick);
            this.subscribe("input", "wheel", this.doPointerWheel);
            this.subscribe("input", "doubleDown", this.doPointerDoubleDown);
            this.subscribe("input", "tap", this.doPointerTap);
        }

        this.subscribe("input", "keyDown", this.doKeyDown);
        this.subscribe("input", "keyUp", this.doKeyUp);
    }

    destroy() {
        super.destroy();
        if (this.hoverPawn) this.hoverPawn.say("hoverUnrequested", this.actor.id);
        if (this.focusPawn) this.focusPawn.say("blur", this.actor.id);
    }

    focusTick() {
        if (this.focusPawn && this.now() > this.focusTime + this.IdleTimeout) this.focusPawn.say("blur", this.actor.id);
        if (!this.doomed) this.future(1000).focusTick();
    }

    getTargets(type) {
        const render = this.service("ThreeRenderManager");
        return render.threeLayer("pointer").filter((obj) => {
            let array = obj.wcPawn.eventListeners.get(type);
            return array && array.length !== 0;
        });
    }

    invokeListeners(type, target, rc, optEvent) {
        let array = target.eventListeners.get(type);
        let event = optEvent;
        if (!event) {
            event = this.pointerEvent(rc);
        }
        if (array) {
            array.forEach((n) => n.listener.call(target, event));
        }
    }

    doPointerDown(e) {
        this.focusTime = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets("pointerDown"));
        if (e.button === 0) {
            this.isPointerDown = true;
            if (this.focusPawn !== rc.pawn) {
                if (this.focusPawn) this.focusPawn.say("blur", this.actor.id);
                this.focusPawn = rc.pawn;
                if (this.focusPawn) this.focusPawn.say("tryFocus", this.actor.id);
            }
        }
        if (this.focusPawn) {
            this.invokeListeners("pointerDown", this.focusPawn, rc);
        }
    }

    doPointerUp(e) {
        this.focusTime = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets("pointerUp"));
        if (this.focusPawn) {
            this.invokeListeners("pointerUp", this.focusPawn, rc);
        }
        this.isPointerDown = false;
        // this.focusPawn = null;
    };

    doPointerMove(e) {
        this.focusTimeout = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets("pointerMove"));
        if (this.hoverPawn !== rc.pawn) {
            if (this.hoverPawn) {
                this.invokeListeners("pointerLeave", this.hoverPawn, rc);
            }
            this.hoverPawn = rc.pawn;
            if (this.hoverPawn) {
                this.invokeListeners("pointerEnter", this.hoverPawn, rc);
            }
        }

        if (this.isPointerDown && this.focusPawn && this.focusPawn === rc.pawn) { // dubious check
            this.invokeListeners("pointerMove", this.focusPawn, rc);
        }
    }

    doPointerClick(e) {
        this.focusTime = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets("click"));
        if (rc.pawn) {
            this.invokeListeners("click", rc.pawn, rc);
        }
    }

    doPointerDoubleDown(e) {
        this.focusTimeout = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets("pointerDoubleDown"));
        if (this.focusPawn) {
            this.invokeListeners("pointerDoubleDown", this.focusPawn, rc);
        }
    }

    doPointerTap(e) {
        this.focusTimeout = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets("pointerTap"));
        console.log("doPointerTap", this.focusPawn)
        if (this.focusPawn) {
            this.invokeListeners("pointerTap", this.focusPawn, rc);
        }
    }

    doKeyDown(e) {
        this.focusTime = this.now();
        if (this.focusPawn) {
            this.invokeListeners("keyDown", this.focusPawn, null, e);
        }
    }

    doKeyUp(e) {
        this.focusTime = this.now();
        
        if (this.focusPawn) {
            this.invokeListeners("keyUp", this.focusPawn, null, e);
        }
    }

    pointerEvent(rc) {
        const pe = {pointerId: this.actor.id}
        if (rc.pawn) {
            pe.targetId = rc.pawn.actor.id;
            pe.xyz = rc.xyz;
            pe.uv = rc.uv;
            pe.normal = rc.normal;
        }
        return pe;
    }
}
