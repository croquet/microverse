// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class ElectedActor {
    setup() {
        if (!this.views) {
            this.views = new Set();
        }
        this.subscribe(this.sessionId, "view-join", "viewJoined");
        this.subscribe(this.sessionId, "view-exit", "viewExited");
    }

    electedView() {
        for (const view of this.views) return view;
    }

    viewJoined(viewId) { this.publishViewElectedAfter(() => this.views.add(viewId)); }
    viewExited(viewId) { this.publishViewElectedAfter(() => this.views.delete(viewId)); }

    publishViewElectedAfter(action) {
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
        if (this.electedViewId === undefined) {
            this.electedViewId = "";
            this.onViewElected(this.actorCall("ElectedActor", "electedView"));
        }
        this.listen({event: "view-elected", handling: "oncePerFrame"}, "onViewElected");

        this.listen("handleElected", "handleElected");
        this.listen("handleUnelected", "handleUnelected");

        this.listen("electionStatusRequested", "electionStatusRequested");
    }

    isElected() { return this.viewId === this.electedViewId; }

    electionStatusRequested() {
        if (this.isElected()) {
            this.say("handleElected");
        }
    }

    onViewElected(viewId) {
        const wasElected = this.isElected();
        this.electedViewId = viewId;
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
    }
}

export default {
    modules: [
        {
            name: "Elected",
            actorBehaviors: [ElectedActor],
            pawnBehaviors: [ElectedPawn]
        }
    ]
}
