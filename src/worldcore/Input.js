import { toRad } from "./Vector";
import { ViewService } from "./Root";

// Need to add doubletap

const DOUBLE_DURATION = 300; // milliseconds
const TRIPLE_DURATION = 600; // milliseconds

const TAP_DURATION = 300;   // milliseconds
const TAP_DISTANCE = 10;     // pixels

const keys = new Set();

// Returns true if the key is pressed. Includes entries for mouse buttons.
export function KeyDown(key) {
    return keys.has(key);
}

//----------------------------------------------------------------------------------------------------
// Input
//
// Catches all user input events and transforms them into Croquet events.
// We don't want other systems to install their own listeners because they may not get cleaned up properly on disconnect/reconnect.
// Supports adding chord events to report when multiple buttons are pressed simultaneously.
//----------------------------------------------------------------------------------------------------

export class InputManager extends ViewService {
    constructor(name) {
        super(name || "InputManager");

        this.listeners = [];

        this.presses = new Map();
        this.lastDown = {};
        this.penultimateDown = {};

        this.synthesizedModifierKeys = new Map();
        this.subscribe("_input", "setMicroverseDiv", this.setMicroverseDiv);
    }

    setMicroverseDiv({divQuery, canvasQuery}) {
        this.microverseDiv = document.body.querySelector(divQuery);
        this.canvas = document.body.querySelector(canvasQuery);

        let handleChange = (entries) => {
            for (const entry of entries) {
                let rect = entry.contentRect;
                if (rect.width && rect.height) {
                    this.scheduleResize({width: rect.width, height: rect.height});
                }
            }
        };
        this.observer = new ResizeObserver(handleChange);
        this.observer.observe(this.microverseDiv);
        this.addAllListeners();
    }

    scheduleResize(obj) {
        this.resizeObj = obj;
        if (!this.resizeTimeout) {
            this.publishResize();
        }
    }

    publishResize() {
        if (this.resizeObj) {
            let obj = this.resizeObj
            delete this.resizeObj;
            this.publish("_input", "resize", obj);
            this.resizeTimeout = setTimeout(() => {
                this.publishResize();
                delete this.resizeTimeout;
            }, 500);
        }
    }

    destroy() {
        super.destroy();
        if (this.inPointerLock) document.exitPointerLock();
        if (this.inFullscreen) document.exitFullscreen();
        if (this.observer) {this.observer.disconnect();}
        this.removeAllListeners();
    }

    addListener(element, type, callback) {
        element.addEventListener(type, callback, {passive: false});
        this.listeners.push({element, type, callback});
    }

    removeListener(type) {
        const remainingListeners = this.listeners.filter(listener => listener.type !== type);
        this.listeners.forEach(listener => {
            if (listener.type === type) listener.element.removeEventListener(listener.type, listener.callback, {passive: false});
        });
        this.listeners = remainingListeners;
    }

    removeAllListeners() {
        this.listeners.forEach(listener => listener.element.removeEventListener(listener.type, listener.callback, {passive: false}));
        this.listeners = [];
    }

    // adds all the default input manager listeners
    addAllListeners() {
        this.addListener(this.canvas, 'contextmenu', e => e.preventDefault());
        this.addListener(window, 'focus', e => this.onFocus(e));
        this.addListener(window, 'blur', e => this.onBlur(e));
        this.addListener(window, 'deviceorientation', e => this.onOrientation(e));
        this.addListener(this.canvas, 'click', e => this.onClick(e));
        this.addListener(document, 'pointerlockchange', e => this.onPointerLock(e));
        this.addListener(this.canvas, 'pointerdown', e => this.onPointerDown(e));
        this.addListener(this.canvas, 'pointerup', e => this.onPointerUp(e));
        this.addListener(this.canvas, 'pointercancel', e => this.onPointerUp(e));
        this.addListener(this.canvas, 'pointermove', e => this.onPointerMove(e));
        this.addListener(this.canvas, 'wheel', e => this.onWheel(e));
        this.addListener(window, 'keydown', e => this.onKeyDown(e));
        this.addListener(window, 'keyup', e => this.onKeyUp(e));
    }

    get inFullscreen() {
        return document.fullscreenElement;
    }

    get canFullscreen() {
        return document.documentElement.requestFullscreen;
    }

    enterFullscreen() {
        if (this.inFullscreen) return;
        if (!this.canFullscreen) return;
        document.documentElement.requestFullscreen();
    }

    exitFullscreen() {
        if (!this.inFullscreen) return;
        document.exitFullscreen();
    }

    get inPointerLock() {
        return document.pointerLockElement || document.mozPointerLockElement;
    }

    get canPointerLock() {
        return document.documentElement.requestPointerLock || document.documentElement.mozRequestPointerLock;
    }

    modifierKeysFrom(event) {
        let {altKey, ctrlKey, metaKey, shiftKey} = event;
        altKey = !!(altKey || this.synthesizedModifierKeys.get("altKey"));
        ctrlKey = !!(ctrlKey || this.synthesizedModifierKeys.get("ctrlKey"));
        metaKey = !!(metaKey || this.synthesizedModifierKeys.get("metaKey"));
        shiftKey = !!(shiftKey || this.synthesizedModifierKeys.get("shiftKey"));
        return {altKey, ctrlKey, metaKey, shiftKey};
    }

    setModifierKeys(obj) {
        for (let k in obj) {
            this.synthesizedModifierKeys.set(k, !!obj[k])
        }
    }

    modifierEqual(e1, e2) {
        return !!e1.altKey === !!e2.altKey && !!e1.ctrlKey === !!e2.ctrlKey && !!e1.metaKey === !!e2.metaKey && !!e1.shiftKey === !!e2.shiftKey;
    }

    enterPointerLock() {
        if (this.inPointerLock) return;
        if (!this.canPointerLock) return;
        document.documentElement.requestPointerLock = this.canPointerLock;
        document.documentElement.requestPointerLock();
    }

    exitPointerLock() {
        if (!this.inPointerLock) return;
        document.exitPointerLock();
    }

    onPointerLock(_event) {
        this.publish("_input", "pointerLock", this.inPointerLock);
    }

    onResize(_event) {
        // Delay actual resize event to address iOS posting of resize before page layout finishes.
        // (Also it kind of looks better .... )
        this.publish("_input", "beforeResize");
        this.future(500).futureResize();
    }

    futureResize() {
        this.publish("_input", "resize", [window.innerWidth / 2, window.innerHeight]);
    }

    onFocus(_event) {
        this.publish("_input", "focus");
    }

    onBlur(_event) {
        this.publish("_input", "blur");
    }

    // publishes  both keyDown + arg and "xDown" where "x" is the key

    onKeyDown(event) {
        const key = event.key;
        let modKeys = this.modifierKeysFrom(event);
        keys.add(key);
        if (event.repeat) {
            this.publish("_input", "keyRepeat", {key, ...modKeys});
            // This can generate a lot of events! Don't subscribe to in model.
        } else {
            this.publish("_input", "keyDown", {key, ...modKeys});
        }
    }

    // publish both keyUp + arg and "xUp" where "x" is the key
    onKeyUp(event) {
        const key = event.key;
        let modKeys = this.modifierKeysFrom(event);
        if (!KeyDown(key)) return;
        this.publish("_input", "keyUp", {key, ...modKeys});
        keys.delete(key);
    }

    onClick(event) {
        let modKeys = this.modifierKeysFrom(event);
        window.focus();
        this.publish("_input", "click", {
            pointerId: event.pointerId, pointerType: event.pointerType,
            button: event.button, buttons: event.buttons, ...modKeys,
            xy: [event.offsetX, event.offsetY]});
    }

    onPointerDown(event) {
        let modKeys = this.modifierKeysFrom(event);
        let pressure = this.getPressure(event);
        this.presses.set(event.pointerId, {
            pointerId: event.pointerId, time: event.timeStamp,
            start: [event.offsetX, event.offsetY], ...modKeys,
            xy: [event.offsetX, event.offsetY]
        });
        this.publish("_input", "pointerDown", {
            pointerId: event.pointerId, pointerType: event.pointerType,
            button: event.button, buttons: event.buttons, ...modKeys,
            xy: [event.offsetX, event.offsetY], pressure
        });
        if (event.pointerId === this.lastDown.pointerId &&
            event.button === this.lastDown.button &&
            event.timeStamp - this.lastDown.time < DOUBLE_DURATION &&
            this.modifierEqual(event, this.lastDown)) {
            if (event.pointerId === this.penultimateDown.pointerId &&
                event.button === this.penultimateDown.button &&
                event.timeStamp - this.penultimateDown.time < TRIPLE_DURATION) {
                this.publish("_input", "tripleDown", {
                    pointerId: event.pointerId, pointerType: event.pointerType,
                    button: event.button, buttons: event.buttons, ...modKeys,
                    xy: [event.offsetX, event.offset], pressure
                });
            } else {
                this.publish("_input", "doubleDown", {
                    pointerId: event.pointerId, pointerType: event.pointerType,
                    button: event.button, buttons: event.buttons, ...modKeys,
                    xy: [event.offsetX, event.offset], pressure
                });
            }
        }
        this.penultimateDown = this.lastDown;
        this.lastDown = {
            pointerId: event.pointerId, button: event.button, buttons: event.buttons,
            ...modKeys, time: event.timeStamp
        };
    }

    onPointerUp(event) {
        const press = this.presses.get(event.pointerId);
        let pressure = this.getPressure(event);
        let modKeys = this.modifierKeysFrom(event);
        if (press) {
            press.xy = [event.offsetX, event.offsetY];
            const duration = event.timeStamp - press.time;
            const dx = event.offsetX - press.start[0];
            const dy = event.offsetY - press.start[1];
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            if (duration < TAP_DURATION && ax < TAP_DISTANCE && ay < TAP_DISTANCE) {
                this.publish("_input", "tap", {
                    pointerId: event.pointerId, pointerType: event.pointerType,
                    button: event.button, buttons: event.buttons, ...modKeys,
                    xy: [event.offsetX, event.offsetY], pressure
                });
            }
        }

        this.presses.delete(event.pointerId);
        this.publish("_input", "pointerUp", {
            pointerIdd: event.pointerId, pointerType: event.pointerType,
            button: event.button, buttons: event.buttons, ...modKeys,
            xy: [event.offsetX, event.offsetY], pressure
        });
    }

    onPointerMove(event) {
        const press = this.presses.get(event.pointerId);
        let pressure = this.getPressure(event);
        let modKeys = this.modifierKeysFrom(event);
        if (press) {
            press.xy = [event.offsetX, event.offsetY];
            const duration = event.timeStamp - press.time;
            const dx = event.offsetX - press.start[0];
            const dy = event.offsetY - press.start[1];
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            if (duration > TAP_DURATION || ax > TAP_DISTANCE || ay > TAP_DISTANCE) { // Only publish pressed move events that aren't taps
                this.publish("_input", "pointerMove", {
                    pointerId: event.pointerId, pointerType: event.pointerType,
                    button: event.button, buttons: event.buttons, ...modKeys,
                    xy: [event.offsetX, event.offsetY], pressure
                });
                this.publish("_input", "pointerDelta", {
                    pointerId: event.pointerId, pointerType: event.pointerType,
                    button: event.button, buttons: event.buttons, ...modKeys,
                    xy: [event.movementX, event.movementY], pressure
                });
            }
        } else {
            this.publish("_input", "pointerMove", {
                pointerId: event.pointerId, pointerType: event.pointerType,
                button: event.button, buttons: event.buttons, ...modKeys,
                xy: [event.offsetX, event.offsetY]
            });
            this.publish("_input", "pointerDelta", {
                pointerId: event.pointerId, type: event.pointerType,
                button: event.button, buttons: event.buttons, ...modKeys,
                xy: [event.movementX, event.movementY]
            });
        }
    }

    onWheel(event) {
        let modKeys = this.modifierKeysFrom(event);
        event.preventDefault();
        const y = event.deltaY;
        this.publish("_input", "wheel", {
            deltaY: y, ...modKeys, xy: [event.offsetX, event.offsetY]
        });
    }

    onOrientation(event) {
        const alpha = event.alpha; // yaw
        const beta = event.beta; // Pitch if in portrait,
        // const gamma = event.gamma;
        const pitch = toRad(beta);
        const yaw = toRad(alpha);

        // For landscape mode depends on phone orientation ...
        // const pitch = gamma;
        // const yaw = alpha; // 90 off
        this.publish("_input", "orientation", {pitch, yaw});
    }

    getPressure(evt) {
        if (evt.pressure !== undefined) {
            return evt.pressure;
        } else if (evt.touchType === "stylus") {
            return evt.force / Math.sin(evt.altitudeAngle);
        } else if (evt.force !== undefined) {
            return evt.force;
        } else {
            return 1;
        }
    }
}
