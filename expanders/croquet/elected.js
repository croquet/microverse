// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class ElectedActor {
    setup() {
        if (!this.views) {
            this.views = new Set();
        }
        this.scriptSubscribe(this.sessionId, "view-join", "viewJoined");
        this.scriptSubscribe(this.sessionId, "view-exit", "viewExited");
    }

    electedView() {
        for (const view of this.views) return view;
    }

    viewJoined(viewId) { this.publishViewElectedAfter(() => this.views.add(viewId)); }
    viewExited(viewId) { this.publishViewElectedAfter(() => this.views.delete(viewId)); }

    publishViewElectedAfter(action) {
        console.log("publishElectedAfter", action);
        const electedBefore = this.electedView();
        action();
        const electedAfter = this.electedView();
        if (electedBefore !== electedAfter) {
            this.say("view-elected", electedAfter);
        }
    }
}

class ElectedPawn {
    setup() {
        this.electedViewId = "";
        this.scriptListen({event: "view-elected", handling: "oncePerFrame"}, this.onViewElected);
        this.onViewElected(this.actor.call("ElectedActor", "electedView"));

        this.scriptListen("handleElected", this.handleElected);
        this.scriptListen("handleUnelected", this.handleUnelected);
    }

    isElected() { return this.viewId === this.electedViewId; }

    onViewElected(viewId) {
        const wasElected = this.isElected();
        this.electedViewId = viewId;
        console.log("onViewElected", wasElected, viewId, this.viewId);
        if (wasElected !== this.isElected()) {
            if (wasElected) {
                this.say("handleUnelected", {from: this.electedViewId, to: viewId});
            } else {
                this.say("handleElected", {from: this.electedViewId, to: viewId});
            }
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

export let elected = {
    actorExpanders: [ElectedActor],
    pawnExpanders: [ElectedPawn]
}
