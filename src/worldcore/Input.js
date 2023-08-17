import { v2_sub, v2_add, v2_scale, v2_magnitude, TAU, toRad } from "./Vector";
import { ViewService } from "./Root";

// Need to add doubletap

const DOUBLE_DURATION = 300; // milliseconds
const TRIPLE_DURATION = 600; // milliseconds

const TAP_DURATION = 300;   // milliseconds
const TAP_DISTANCE = 10;     // pixels

const SWIPE_DURATION = 300;   // milliseconds
const SWIPE_DISTANCE = 50;     // pixels

const keys = new Set();
const chordNames = new Map();
const upChordKeys = new Map();
const downChordKeys = new Map();

// Returns true if the key is pressed. Includes entries for mouse buttons.
export function KeyDown(key) {
    return keys.has(key);
}

//Returns true if the combination of keys is pressed/unpressed.
// export function ChordDown(name) {
//     const chord = chordNames.get(name);
//     if (!chord) return false;
//     const down = chord.down;
//     const up = chord.up;
//     let all = true;
//     down.forEach(d => {all &= KeyDown(d);});
//     up.forEach(u => {all &= !KeyDown(u);});
//     return all;
// }

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

        document.body.style.touchAction = "none";
        this.addAllListeners();

        this.synthesizedModifierKeys = new Map();
    }

    destroy() {
        super.destroy();
        if (this.inPointerLock) document.exitPointerLock();
        if (this.inFullscreen) document.exitFullscreen();
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
        this.addListener(document, 'contextmenu', e => e.preventDefault());
        this.addListener(window, 'resize', e => this.onResize(e));
        this.addListener(window, 'focus', e => this.onFocus(e));
        this.addListener(window, 'blur', e => this.onBlur(e));
        this.addListener(window, 'deviceorientation', e => this.onOrientation(e));
        this.addListener(document, 'click', e => this.onClick(e));
        this.addListener(document, 'pointerlockchange', e => this.onPointerLock(e));
        this.addListener(document, 'pointerdown', e => this.onPointerDown(e));
        this.addListener(document, 'pointerup', e => this.onPointerUp(e));
        this.addListener(document, 'pointercancel', e => this.onPointerUp(e));
        this.addListener(document, 'pointermove', e => this.onPointerMove(e));
        this.addListener(document, 'wheel', e => this.onWheel(e));
        this.addListener(document,'keydown', e => this.onKeyDown(e));
        this.addListener(document,'keyup', e => this.onKeyUp(e));
    }

    // If you want the input handler to report a chord event, you need to add the chord and give it an event name.
    addChord(name, down = [], up = []) {
        chordNames.set(name, {down, up});
        down.forEach(d => {
            if (!downChordKeys.has(d)) downChordKeys.set(d, new Set());
            downChordKeys.get(d).add(name);
        });
        up.forEach(u => {
            if (!upChordKeys.has(u)) upChordKeys.set(u, new Set());
            upChordKeys.get(u).add(name);
        });
    }

    onChordDown(key) {
        const downs = [];
        const ups = [];

        if (downChordKeys.has(key)) {
            downChordKeys.get(key).forEach( name => {
                if (this.chordTest(name)) downs.push(name);
            });
        }

        if (upChordKeys.has(key)) {
            upChordKeys.get(key).forEach( name => {
                if (!this.chordTest(name)) ups.push(name);
            });
        }

        ups.forEach(name => {
            if (!KeyDown(name)) return;
            keys.delete(name);
            this.publish("input", name + "Up");
        });

        downs.forEach(name => {
            if (KeyDown(name)) return;
            keys.add(name);
            this.publish("input", name + "Down");
        });

    }

    onChordUp(key) {
        const downs = [];
        const ups = [];

        if (downChordKeys.has(key)) {
            downChordKeys.get(key).forEach( name => {
                if (!this.chordTest(name)) ups.push(name);
            });
        }

        if (upChordKeys.has(key)) {
            upChordKeys.get(key).forEach( name => {
                if (this.chordTest(name)) downs.push(name);
            });
        }

        ups.forEach(name => {
            if (!KeyDown(name)) return;
            keys.delete(name);
            this.publish("input", name + "Up");
        });

        downs.forEach(name => {
            if (KeyDown(name)) return;
            keys.add(name);
            this.publish("input", name + "Down");
        });

    }

    chordTest(name) {
        const chord = chordNames.get(name);
        if (!chord) return false;
        const down = chord.down;
        const up = chord.up;
        let all = true;
        down.forEach(d => {all &= KeyDown(d);});
        up.forEach(u => {all &= !KeyDown(u);});
        return all;
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
        this.publish("input", "pointerLock", this.inPointerLock);
    }

    onResize(_event) {
        // Delay actual resize event to address iOS posting of resize before page layout finishes.
        // (Also it kind of looks better .... )
        this.publish("input", "beforeResize");
        this.future(500).futureResize();
    }

    futureResize() {
        this.publish("input", "resize", [window.innerWidth, window.innerHeight]);
    }

    onFocus(_event) {
        this.publish("input", "focus");
    }

    onBlur(_event) {
        this.publish("input", "blur");
    }

    // publishes  both keyDown + arg and "xDown" where "x" is the key

    onKeyDown(event) {
        const key = event.key;
        let modKeys = this.modifierKeysFrom(event);
        keys.add(key);
        if (event.repeat) {
            this.publish("input", key + "Repeat", {key, shift: modKeys.shiftKey, alt: modKeys.altKey, ctrl: modKeys.ctrlKey, meta: modKeys.metaKey, ...modKeys});
            this.publish("input", "keyRepeat", {key, shift: modKeys.shiftKey, alt: modKeys.altKey, ctrl: modKeys.ctrlKey, meta: modKeys.metaKey, ...modKeys});
            // This can generate a lot of events! Don't subscribe to in model.
        } else {
            this.publish("input", key + "Down", {key, shift: modKeys.shiftKey, alt: modKeys.altKey, ctrl: modKeys.ctrlKey, meta: modKeys.metaKey, ...modKeys});
            this.publish("input", "keyDown", {key, shift: modKeys.shiftKey, alt: modKeys.altKey, ctrl: modKeys.ctrlKey, meta: modKeys.metaKey, ...modKeys});
            this.onChordDown(key);
        }
    }

    // publish both keyUp + arg and "xUp" where "x" is the key
    onKeyUp(event) {
        const key = event.key;
        let modKeys = this.modifierKeysFrom(event);
        if (!KeyDown(key)) return;
        this.publish("input", key + "Up", {key, shift: modKeys.shiftKey, alt: modKeys.altKey, ctrl: modKeys.ctrlKey, meta: modKeys.metaKey, ...modKeys});
        this.publish("input", "keyUp", {key, shift: modKeys.shiftKey, alt: modKeys.altKey, ctrl: modKeys.ctrlKey, meta: modKeys.metaKey, modKeys});
        keys.delete(key);
        this.onChordUp(key);
    }

    onClick(event) {
        let modKeys = this.modifierKeysFrom(event);
        window.focus();
        this.publish("input", "click", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY]});
    }

    onPointerDown(event) {
        let modKeys = this.modifierKeysFrom(event);
        let pressure = this.getPressure(event);
        this.presses.set(event.pointerId, {id: event.pointerId, time: event.timeStamp, start: [event.clientX, event.clientY], ...modKeys, xy: [event.clientX, event.clientY]});
        this.publish("input", "pointerDown", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY], pressure});
        if (event.button === this.lastDown.button && event.timeStamp - this.lastDown.time < DOUBLE_DURATION && this.modifierEqual(event, this.lastDown)) {
            if (event.button === this.penultimateDown.button && event.timeStamp - this.penultimateDown.time < TRIPLE_DURATION) {
                this.publish("input", "tripleDown", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY], pressure});
            } else {
                this.publish("input", "doubleDown", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY], pressure});
            }
        }
        this.penultimateDown = this.lastDown;
        this.lastDown = {id: event.pointerId, button: event.button, buttons: event.buttons, ...modKeys, time: event.timeStamp};
        this.zoomStart();
    }

    onPointerUp(event) {
        const press = this.presses.get(event.pointerId);
        let pressure = this.getPressure(event);
        let modKeys = this.modifierKeysFrom(event);
        if (press) {
            press.xy = [event.clientX, event.clientY];
            const duration = event.timeStamp - press.time;
            const dx = event.clientX - press.start[0];
            const dy = event.clientY - press.start[1];
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            if (duration < TAP_DURATION && ax < TAP_DISTANCE && ay < TAP_DISTANCE) {
                this.publish("input", "tap", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY], pressure});
            }
            if (duration < SWIPE_DURATION && ax > SWIPE_DISTANCE) {
                this.publish("input", "swipeX", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, distance: dx, ...modKeys});
            }
            if (duration < SWIPE_DURATION && ay > SWIPE_DISTANCE) {
                this.publish("input", "swipeY", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, distance: dy, ...modKeys});
            }
        }

        this.presses.delete(event.pointerId);
        this.publish("input", "pointerUp", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY], pressure});
        this.zoomEnd();
    }

    onPointerMove(event) {
        const press = this.presses.get(event.pointerId);
        let pressure = this.getPressure(event);
        let modKeys = this.modifierKeysFrom(event);
        if (press) {
            press.xy = [event.clientX, event.clientY];
            const duration = event.timeStamp - press.time;
            const dx = event.clientX - press.start[0];
            const dy = event.clientY - press.start[1];
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            if (duration > TAP_DURATION || ax > TAP_DISTANCE || ay > TAP_DISTANCE) { // Only publish pressed move events that aren't taps
                this.publish("input", "pointerMove", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY], pressure});
                this.publish("input", "pointerDelta", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.movementX, event.movementY]}, pressure);
            }
        } else {
            this.publish("input", "pointerMove", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.clientX, event.clientY]});
            this.publish("input", "pointerDelta", {id: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons, ...modKeys, xy: [event.movementX, event.movementY]});
        }
        this.zoomUpdate();
    }

    zoomStart() {
        if (this.presses.size !== 2) return;

        const values = Array.from(this.presses.values());
        const press0 = values[0];
        const press1 = values[1];
        const mid = v2_scale(v2_add(press0.xy, press1.xy), 0.5);

        this.publish("input", "zoomStart", {mid, zoom: 1, dial: 0});
    }

    zoomEnd() {
        if (this.presses.size !== 1) return;
        this.publish("input", "zoomEnd");
    }

    zoomUpdate() {
        if (this.presses.size < 2) return;

        const values = Array.from(this.presses.values());
        const press0 = values[0];
        const press1 = values[1];
        const mid = v2_scale(v2_add(press0.xy, press1.xy), 0.5);

        const delta0 = v2_sub(press1.start, press0.start);
        const delta1 = v2_sub(press1.xy, press0.xy);
        const gap0 = v2_magnitude(delta0);
        const gap1 = v2_magnitude(delta1);

        let zoom = 1;
        if (gap0 > 0) zoom = gap1 / gap0;

        const angle0 = Math.atan2(delta0[0], delta0[1]);
        const angle1 = Math.atan2(delta1[0], delta1[1]);
        let dial = (angle1 - angle0 + TAU) % TAU;
        if (dial > Math.PI) dial -= TAU;

        this.publish("input", "zoomUpdate", {mid, zoom, dial});
    }

    onWheel(event) {
        let modKeys = this.modifierKeysFrom(event);
        event.preventDefault();
        const y = event.deltaY;
        this.publish("input", "wheel", {deltaY: y, ...modKeys, xy: [event.clientX, event.clientY]});
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
        this.publish("input", "orientation", {pitch, yaw});
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
