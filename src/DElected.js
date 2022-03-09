// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { mix, RegisterMixin} from "@croquet/worldcore"

export const AM_Elected = superclass => class extends superclass {
    init(options) {
        super.init(options);
        this.views = new Set();
        this.subscribe(this.sessionId, "view-join", this.viewJoined);
        this.subscribe(this.sessionId, "view-exit", this.viewExited);
    }

    get electedView() { for (const view of this.views) return view; }

    viewJoined(viewId) { this.publishViewElectedAfter(() => this.views.add(viewId)); }
    viewExited(viewId) { this.publishViewElectedAfter(() => this.views.delete(viewId)); }

    publishViewElectedAfter(action) {
        const electedBefore = this.electedView;
        action();
        const electedAfter = this.electedView;
        if (electedBefore !== electedAfter) {
            this.say("view-elected", electedAfter);
        }
    }
}
RegisterMixin(AM_Elected);


export const PM_Elected = superclass => class extends superclass {
    constructor(actor) {
        super(actor);
        this.electedViewId = "";
        this.listen({event: "view-elected", handling: "oncePerFrame"}, this.onViewElected);
        this.onViewElected(this.actor.electedView);
    }

    get isElected() { return this.viewId === this.electedViewId; }

    onViewElected(viewId) {
        const wasElected = this.isElected;
        this.electedViewId = viewId;
        if (wasElected !== this.isElected) {
            if (wasElected) this.handleUnelected();
            else this.handleElected();
        } else {
            console.log('%cView Elected: %s (this view %s %s)', 'color: #CC0', this.electedViewId || '<none>', this.viewId,
                wasElected ? 'still elected ✅' : 'unaffected ❌');
        }
    }

    handleElected() {
        console.log('%cView Elected: %s (this view %s elected ✅)', 'color: #0C0', this.electedViewId || '<none>', this.viewId);
    }

    handleUnelected() {
        console.log('%cView Elected: %s (this view %s unelected ❌)', 'color: #C00', this.electedViewId || '<none>', this.viewId);
    }

    destroy() {
        this.onViewElected("");
        super.destroy();
    }
}
