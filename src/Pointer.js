// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { GetPawn, RegisterMixin } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- AM_PointerTarget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Copied from the implementaion in Worldcore, but heavily modified to support event listener style dynamic manipulation of event listeners.

// eventListeners:Map<eventName:EventName, Array<{moduleName:string, behaviorName:string, eventName:string, listener:string}>>

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

    get isMultiuser() { return this._multiuser === undefined ? true : this._multiuser }
    get isHovered() { return this.hovered.size};
    get isFocused() { return this.focused.size};

    // When an actor-side event listener for a pointer event is added,
    // the pawn automatically sends the pointer event over the
    // dispatchEvent Croquet event.  If the lister registered has
    // moduleName and behaviorName, it invokes the behavior method.
    // Otherwise, it looks up the method from the base object and
    // invokes it.
    dispatchEvent(data) {
        // console.log("dispatchEvent", data);
        let {eventName, evt} = data;
        let array = this.eventListeners.get(eventName);
        if (!array) {return;}

        array.forEach((obj) => {
            let {moduleName, behaviorName, listener} = obj;
            if (moduleName && behaviorName) {
                this.call(`${moduleName}$${behaviorName}`, listener, evt);
            } else {
                this[listener](evt);
            }
        });
    }

    addEventListener(eventName, listener) {
        // console.log("addEventListener", eventName, listener);
        let origListener = listener;
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

        let array = this.eventListeners.get(eventName);
        if (!array) {
            array = [];
            this.eventListeners.set(eventName, array);
        }
        if (array.findIndex((obj) => {
            return obj.eventName === eventName &&
                obj.listener === listener &&
                obj.moduleName === moduleName &&
                obj.behaviorName === behaviorName
        }) >= 0) {
            this.removeEventListener(eventName, origListener, true);
            // console.log("multiple registration of the same function");
        }
        array.push({moduleName, behaviorName, eventName, listener});

        this.say("registerEventListener", {eventName, listener});
    }

    removeEventListener(eventName, listener, noDelete) {
        // console.log("removeEventListener", eventName, listener);
        if (typeof listener === "function") {
            listener = listener.name;
        }

        /*

        if (listener.indexOf(".") >= 1) {
            let split = listener.split(".");
            behavior = split[0];
            listener = split[1];
        }

        */

        let behaviorName = this._behavior.$behaviorName;
        let moduleName = this._behavior.module.externalName;

        let array = this.eventListeners.get(eventName);
        if (!array) {
            // console.log("try to remove non-existent listener");
            return;
        }
        let ind = array.findIndex((obj) => obj.behaviorName === behaviorName && obj.moduleName === moduleName && obj.listener === listener);
        if (ind < 0) {
            // console.log("try to remove non-existent listener");
            return;
        }
        array.splice(ind, 1);
        if (array.length === 0) {
            if (!noDelete) {
                this.eventListeners.delete(eventName);
            }
            this.say("unregisterEventListener", {eventName, listener});
        }
    }

    // this is being phased out as whether hover and focus should be
    // exclusive or not depends on the action specified by a behavior.
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

    hoverRequested(avatarId) {
        this.hovered.add(avatarId);
    }

    unhoverRequested(avatarId) {
        this.hovered.delete(avatarId);
    }

    _onTryFocus(avatarId) {
        if (this.focused.has(avatarId)) return;
        if (!this.isMultiuser && this.focused.size > 0) {
            this.say("focusFailure", avatarId);
        } else {
            this.focused.add(avatarId);
            this.say("focusSuccess", avatarId);
            this.dispatchEvent({eventName: "focus", evt: avatarId});
        }
    }

    _onBlur(avatarId) {
        this.focused.delete(avatarId);
        this.dispatchEvent({eventName: "blur", evt: avatarId});
    }

    checkFocus(pe) {
        return this.focused.has(pe.pointerId);
    }
}
RegisterMixin(AM_PointerTarget);

//------------------------------------------------------------------------------------------
//-- PM_PointerTarget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Copied from the implementaion in Worldcore, but heavily modified to support event listener style dynamic manipulation of event listeners.

// eventListeners:Map<eventName:EventName, Array<{name:string, eventName:string, listener:function}>>
// This manages the event listeners added to the pawn side.

// modelListeners:Map<eventName:EventName, func:function
// When an event listener for a pointer event is added to the actor side, the pawn was notified so that it should send a dispatchEvent when the specified pointerEvent type occurs on the pawn side.

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
        const hoverEnd = new Set(this.actor.hovered);
        hoverEnd.forEach( avatarId => {
            const pointerPawn = GetPawn(avatarId);
            if (pointerPawn) pointerPawn.hoverPawn = null;
        });

        const focusEnd = new Set(this.actor.focused);
        focusEnd.forEach( avatarId => {
            const pointerPawn = GetPawn(avatarId);
            if (pointerPawn) pointerPawn.focusPawn = null;
        });
        super.destroy();
    }

    addEventListener(eventName, listener, name) {
        let origListener = listener;
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
        if (array.find((obj) => {
            return obj.name === name &&
                obj.eventName === eventName;
        })) {
            this.removeEventListener(eventName, origListener, name);
            // console.log("multiple registration of the same function");
        }
        array.push({name, eventName, listener});
    }

    removeEventListener(eventName, listener, name) {
        if (typeof listener === "string") {
            name = listener;
            // listener = (evt) => this[listener](evt);
        } else {
            if (!name) {
                name = listener.name;
            }
        }
        let array = this.eventListeners.get(eventName);
        if (!array) {
            // console.log("try to remove non-existent listener");
            return;
        }
        let ind = array.findIndex((obj) => {
            return obj.name === name &&
                obj.eventName === eventName;
        });
        if (ind < 0) {
            // console.log("try to remove non-existent listener");
            return;
        }
        array.splice(ind, 1);
    }

    registerEventListener(data) {
        // console.log("registerEventLIstener", data);
        let {eventName} = data;
        let func = (evt) => this.say("dispatchEvent", {eventName, evt});
        this.modelListeners.set(eventName, func);
        this.addEventListener(eventName, func, `dispatch_${eventName}`);
    }

    unregisterEventListener(data) {
        let {eventName, _listener} = data;
        let func = this.modelListeners.get(eventName);
        if (!func) {return;}
        this.removeEventListener(eventName, func, `dispatch_${eventName}`);
    }

    // this is called only upon the initialization time. If the actor
    // already has some entries in the eventListeners, the pawn sets
    // up the disptchEvent link for them.

    registerAllEventListeners() {
        if (!this.actor.eventListeners) {return;}
        for (let eventName of this.actor.eventListeners.keys()) {
            this.registerEventListener({eventName});
        }
    }

    get isMultiuser() { return this.actor.isMultiuser; }
    get isHovered() { return this.actor.isHovered; }
    get isFocused() { return this.actor.isFocused; }

    _onFocusFailure(avatarId) {
        const pointerPawn = GetPawn(avatarId);
        if (pointerPawn) pointerPawn.focusPawn = null;
        let array = this.eventListeners.get("focusFailure");
        if (array) {
            array.forEach((obj) => {
                obj.listner.call(this, avatarId);
            });
        }
    }

    _onFocusSuccess(avatarId) {
        const pointerPawn = GetPawn(avatarId);
        if (pointerPawn) pointerPawn.focusPawn = this;
        let array = this.eventListeners.get("focusSuccess");
        if (array) {
            array.forEach((obj) => {
                obj.listner.call(this, avatarId);
            });
        }
    }
}

//------------------------------------------------------------------------------------------
//-- PM_Pointer ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Copied from the implementaion in Worldcore, but heavily modified to support event listener style dynamic manipulation of event listeners.

// This mixin is used by the avatar to implement the event routing.

export const PM_Pointer = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        if (!this.isMyPlayerPawn) {return;}

        this.focusTime = this.now();
        this.idleTimeout = 5000;

        this.future(0).focusTick();

        /* Microverse uses InputManager from Worldcore */

        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.subscribe("input", "click", this.doPointerClick);
        this.subscribe("input", "wheel", this.doPointerWheel);
        this.subscribe("input", "doubleDown", this.doPointerDoubleDown);
        this.subscribe("input", "tap", this.doPointerTap);
        this.subscribe("input", "keyDown", this.doKeyDown);
        this.subscribe("input", "keyUp", this.doKeyUp);

        this.firstResponders = new Map();
        this.lastResponders = new Map();
        // {eventType -> [{eventMask, pawn}]} // eventMask should be exclusive
    }

    modifierEqual(e1, e2) {
        return !!e1.altKey === !!e2.altKey && !!e1.ctrlKey === !!e2.ctrlKey && !!e1.metaKey === !!e2.metaKey && !!e1.shiftKey === !!e2.shiftKey;
    }

    addResponder(responders, eventType, eventMask, pawn) {
        if (pawn._target) {pawn = pawn._target;}
        let ms = ["altKey", "shiftKey", "ctrlKey", "metaKey"];
        let array = responders.get(eventType);
        if (!array) {
            array = [];
            responders.set(eventType, array);
        }

        function has() {
            for (let i = 0; i < array.length; i++) {
                let obj = array[i];
                let all = true;

                for (let i = 0; i < ms.length; i++) {
                    all = all && obj.eventMask[ms[i]] === eventMask[ms[i]]
                }
                if (obj.pawn === pawn && all) {return true;}
            }
            return false;
        }

        if (has()) {return;}

        array.forEach((obj) => {
            for (let i = 0; i < ms.length; i++) {
                if (obj.eventMask[ms[i]] && eventMask[ms[i]]) {
                    throw new Error(`${ms[i]} is already handled for ${eventType}`);
                }
            }
        });
        array.unshift({eventMask, pawn});
    }

    removeResponder(responders, eventType, eventMask, pawn) {
        if (pawn._target) {pawn = pawn._target;}
        let array = responders.get(eventType);
        if (!array) {return;}
        let responderIndex = array.findIndex((obj) => {
            let ms = ["altKey", "shiftKey", "ctrlKey", "metaKey"];
            let all = true;
            for (let i = 0; i < ms.length; i++) {
                if (obj.eventMask[ms[i]]) {
                    all = all && eventMask[ms[i]];
                }
            }
            return all;
        });

        if (responderIndex >= 0 && array[responderIndex].pawn === pawn) {
            array.splice(responderIndex, 1);
        }
    }

    findResponder(responders, e, eventType, requireModefier) {
        let array = responders.get(eventType);
        if (!array) {return null;}
        let responderIndex = array.findIndex((obj) => {
            let ms = ["altKey", "shiftKey", "ctrlKey", "metaKey"];
            let all = true;
            let any = false;
            for (let i = 0; i < ms.length; i++) {
                if (e[ms[i]]) {
                    any = true;
                    all = all && obj.eventMask[ms[i]];
                }
            }

            if (requireModefier && (Object.keys(obj.eventMask).length === 0 && !any)) {
                return true;
            }
            if (requireModefier && !any) {return false;}
            return all;
        });

        if (responderIndex >= 0) {
            return array[responderIndex].pawn;
        }
        return null;
    }

    addFirstResponder(eventType, eventMask, pawn) {
        console.log('first', eventType, pawn)
        return this.addResponder(this.firstResponders, eventType, eventMask, pawn);
    }

    removeFirstResponder(eventType, eventMask, pawn) {
        return this.removeResponder(this.firstResponders, eventType, eventMask, pawn);
    }

    findFirstResponder(e, eventType) {
        return this.findResponder(this.firstResponders, e, eventType, true);
    }

    addLastResponder(eventType, eventMask, pawn) {
        console.log('last', eventType, pawn)
        return this.addResponder(this.lastResponders, eventType, eventMask, pawn);
    }

    removeLastResponder(eventType, eventMask, pawn) {
        return this.removeResponder(this.lastResponders, eventType, eventMask, pawn);
    }

    findLastResponder(e, eventType) {
        return this.findResponder(this.lastResponders, e, eventType, false);
    }

    destroy() {
        if (this.hoverPawn) this.hoverPawn.say("hoverUnrequested", this.actor.id);
        if (this.focusPawn) this.focusPawn.say("blur", this.actor.id);
        super.destroy();
    }

    focusTick() {
        if (this.focusPawn && this.now() > this.focusTime + this.IdleTimeout) this.focusPawn.say("blur", this.actor.id);
        if (!this.doomed) this.future(1000).focusTick();
        if (this.focusPawn && this.focusPawn.doomed) {this.focusPawn = null;}
    }

    getTargets(type, optWalk) {
        const render = this.service("ThreeRenderManager");
        let objects = optWalk ? render.threeLayerUnion('pointer', 'walk') : render.threeLayer("pointer");
        return objects.filter((obj) => {
            let array = obj.wcPawn.eventListeners.get(type);
            return array && array.length !== 0;
        });
    }

    invokeListeners(type, target, rc, wcEvent) {
        let array = target.eventListeners.get(type);
        let event;
        if (!rc) {
            event = wcEvent;
        } else {
            event = this.pointerEvent(rc, wcEvent);
        }
        if (array) {
            array.forEach((n) => n.listener.call(target, event));
        }
    }

    pointerCapture(toPawn) {
        this.focusPawn = toPawn;
    }

    doPointerDown(e) {
        let eventType = "pointerDown";
        this.focusTime = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets(eventType));

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, rc, e);
        }

        if (e.button === 0) {
            this.isPointerDown = true;
            if (this.focusPawn !== rc.pawn) {
                if (this.focusPawn) this.focusPawn.say("blur", this.actor.id);
                this.focusPawn = rc.pawn;
                if (this.focusPawn) this.focusPawn.say("tryFocus", this.actor.id);
            }
        }
        if (this.focusPawn) {
            this.invokeListeners(eventType, this.focusPawn, rc, e);
        } else {
            let lastResponder = this.findLastResponder(e, eventType);
            if (lastResponder) {
                return this.invokeListeners(eventType, lastResponder, rc, e);
            }
        }
    }

    doPointerUp(e) {
        let eventType = "pointerUp";
        this.focusTime = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets(eventType));

        this.isPointerDown = false;
        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, rc, e);
        }

        if (this.focusPawn) {
            this.invokeListeners(eventType, this.focusPawn, rc, e);
        }

        // this is dubious but we clear the editPawn anyway.
        let lastResponder = this.findLastResponder(e, eventType);
        if (lastResponder) {
            return this.invokeListeners(eventType, lastResponder, rc, e);
        }
        // this.focusPawn = null;
    }

    doPointerMove(e) {
        let eventType = "pointerMove";
        this.focusTimeout = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets(eventType));

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, rc, e);
        }

        if (this.hoverPawn !== rc.pawn) {
            if (this.hoverPawn) {
                this.invokeListeners("pointerLeave", this.hoverPawn, rc, e);
            }
            this.hoverPawn = rc.pawn;
            if (this.hoverPawn) {
                this.invokeListeners("pointerEnter", this.hoverPawn, rc, e);
            }
        }

        if (this.isPointerDown && this.focusPawn && this.focusPawn === rc.pawn) { // dubious check
            this.invokeListeners(eventType, this.focusPawn, rc, e);
        } else {
            let lastResponder = this.findLastResponder(e, eventType);
            if (lastResponder) {
                return this.invokeListeners(eventType, lastResponder, rc, e);
            }
        }
    }

    doPointerClick(e) {
        let eventType = "click";
        this.focusTime = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets(eventType));

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, rc, e);
        }

        if (rc.pawn) {
            this.invokeListeners(eventType, rc.pawn, rc, e);
        } else {
            let lastResponder = this.findLastResponder(e, eventType);
            if (lastResponder) {
                return this.invokeListeners(eventType, lastResponder, rc, e);
            }
        }
    }

    doPointerDoubleDown(e) {
        let eventType = "pointerDoubleDown";
        this.focusTimeout = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets(eventType, true), true);

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, rc, e);
        }

        if (rc.pawn) {
            this.invokeListeners(eventType, rc.pawn, rc, e);
        }
    }

    doPointerWheel(e) {
        let eventType = "pointerWheel";
        this.focusTimeout = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets(eventType, true), true);

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, rc, e);
        }

        if (rc.pawn) {
            this.invokeListeners(eventType, rc.pawn, rc, e);
        } else {
            let lastResponder = this.findLastResponder(e, eventType);
            if (lastResponder) {
                return this.invokeListeners(eventType, lastResponder, rc, e);
            }
        }
    }

    doPointerTap(e) {
        let eventType = "pointerTap";
        this.focusTimeout = this.now();
        const rc = this.pointerRaycast(e.xy, this.getTargets(eventType));

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, rc, e);
        }

        if (rc.pawn) {
            this.invokeListeners(eventType, rc.pawn, rc, e);
        } else {
            let lastResponder = this.findLastResponder(e, eventType);
            if (lastResponder) {
                return this.invokeListeners(eventType, lastResponder, rc, e);
            }
        }
    }

    doKeyDown(e) {
        let eventType = "keyDown";
        this.focusTime = this.now();

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, null, e);
        }

        if (this.focusPawn) {
            this.invokeListeners(eventType, this.focusPawn, null, e);
        } else {
            let lastResponder = this.findLastResponder(e, eventType);
            if (lastResponder) {
                return this.invokeListeners(eventType, lastResponder, null, e);
            }
        }
    }

    doKeyUp(e) {
        let eventType = "keyUp";
        this.focusTime = this.now();

        let firstResponder = this.findFirstResponder(e, eventType);
        if (firstResponder) {
            return this.invokeListeners(eventType, firstResponder, null, e);
        }

        if (this.focusPawn) {
            this.invokeListeners(eventType, this.focusPawn, null, e);
        }

        // this falling through part is also a hack, but we want to clear the wasd key bits in avatar.
        let lastResponder = this.findLastResponder(e, eventType);
        if (lastResponder) {
            return this.invokeListeners(eventType, lastResponder, null, e);
        }
    }

    pointerEvent(rc, wcEvent) {
        const pe = {avatarId: this.actor.id}
        if (rc.pawn) {
            pe.targetId = rc.pawn.actor.id;
            pe.xyz = rc.xyz;
            pe.uv = rc.uv;
            pe.normal = rc.normal;
            pe.distance = rc.distance;
        }
        pe.ctrlKey = wcEvent.ctrlKey;
        pe.altKey = wcEvent.altKey;
        pe.shiftKey = wcEvent.shiftKey;
        pe.metaKey = wcEvent.metaKey;
        pe.xy = wcEvent.xy;
        pe.id = wcEvent.id;
        pe.button = wcEvent.button;
        pe.buttons = wcEvent.buttons;
        if (wcEvent.deltaY !== undefined) {
            pe.deltaY = wcEvent.deltaY;
        }
        return pe;
    }
}
