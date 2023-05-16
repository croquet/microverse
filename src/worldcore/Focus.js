import { ViewService } from "./Root";

//------------------------------------------------------------------------------------------
//-- FocusManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of focus sets. Only one pawn can be focused per set.

export class FocusManager extends ViewService {

    constructor(name) {
        super(name ||'FocusManager');
        this.sets = [];
    }

}

//------------------------------------------------------------------------------------------
//-- Focusable -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The pawn interface to the focus manager. Adds methods to set and remove focus.

export const PM_Focusable = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
    }

    destroy() {
        super.destroy();
        this.blurAll();
    }

    hasFocus(set = 0) {
        const fm = this.service("FocusManager");
        return fm.sets[set] === this;
    }

    focus(set = 0) {
        const fm = this.service("FocusManager");
        const old = fm.sets[set];
        if (old === this) return; // Already has focus
        if (old) {
            fm.sets[set] = null;
            old.onBlur(set);
        }
        fm.sets[set] = this;
        this.onFocus(set);
    }

    blur(set = 0) {
        const fm = this.service("FocusManager");
        const old = fm.sets[set];
        if (old !== this) return; // Doesn't have focus
        fm.sets[set] = null;
        this.onBlur(set);
    }

    blurAll() {
        const fm = this.service("FocusManager");
        if(!fm) return;
        fm.sets.forEach(set =>  this.blur(set));
    }

    onFocus(set) {}
    onBlur(set) {}

};