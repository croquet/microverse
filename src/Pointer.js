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
        /*
          this.listen("focusRequested", this.focusRequested);
        this.listen("unfocusRequested", this.unfocusRequested);
        */
        this.listen("tryFocus", this.onTryFocus);
        this.listen("blur", this.onBlur);
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
        this.hovered.add(pointerId)
    }

    unhoverRequested(pointerId) {
        this.hovered.delete(pointerId)
    }

    onTryFocus(pointerId) {
        if (this.focused.has(pointerId)) return;
        if (!this.isMultiuser && this.focused.size > 0) {
            this.say("focusFailure", pointerId);
        } else {
            this.focused.add(pointerId)
            this.say("focusSuccess", pointerId)
            // this.onFocus(pointerId);
        }
    }

    onBlur(pointerId) {
        this.focused.delete(pointerId)
        // this.onBlur(pointerId);
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

        this.addEventListener("focusFailure", "onFocusFailure");

        if (this.onFocus) this.listen("focusSuccess", this.onFocus);
        if (this.onBlur) this.listen("blur", this.onBlur);
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

    onFocusFailure(pointerId) {
        const pointerPawn = GetPawn(pointerId);
        if (pointerPawn) pointerPawn.focusPawn = null;
    }
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
            this.subscribe("ui", "wheel", this.doPointerWheel);
            this.subscribe("ui", "doubleDown", this.doPointerDoubleDown);
        } else {
            this.subscribe("input", "pointerDown", this.doPointerDown);
            this.subscribe("input", "pointerUp", this.doPointerUp);
            this.subscribe("input", "pointerMove", this.doPointerMove);
            this.subscribe("input", "wheel", this.doPointerWheel);
            this.subscribe("input", "doubleDown", this.doPointerDoubleDown);
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
        let targets = render.threeLayer("pointer").filter((obj) => {
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
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y], this.getTargets("pointerDown"));

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
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y], this.getTargets("pointerUp"));

        if (this.focusPawn) {
            this.invokeListeners("pointerUp", this.focusPawn, rc);
        }
        this.isPointerDown = false;
        // this.focusPawn = null;
    };

    doPointerMove(e) {
        this.focusTimeout = this.now();
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;

        const rc = this.pointerRaycast([x,y], this.getTargets("pointerMove"));
        if (this.hoverPawn !== rc.pawn) {
            if (this.hoverPawn) {
                this.invokeListeners("pointerLeave", this.hoverPawn, rc);
            }
            this.hoverPawn = rc.pawn
            if (this.hoverPawn) {
                this.invokeListeners("pointerEnter", this.hoverPawn, rc);
            }
        }

        if (this.isPointerDown && this.focusPawn && this.focusPawn === rc.pawn) { // dubious check
            this.invokeListeners("pointerMove", this.focusPawn, rc);
        }
    }

    doPointerWheel(e) {
        if (!this.focusPawn) {return false;}
        this.focusTimeout = this.now();
        const rc = {pawn: this.focusPawn};
        if (!rc.pawn) { // dubious check
            this.invokeListeners("pointerWheel", this.focusPawn, rc);
        }
        return true;
    }

    doPointerDoubleDown(e) {
        this.focusTimeout = this.now();
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y], this.getTargets("pointerDoubleDown"));
        if (this.focusPawn) {
            this.invokeListeners("pointerDoubleDown", this.focusPawn, rc);
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
