// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

/*

It is useful to be able to "elect" one peer to take a certain action
on its view side. For example, the elected view may fetch an external
data stream from internet and feed data in the shared session for all
peers.

This module provides a generic way to elect one peer. It is expected be used with another behavior modules
that actually takes an action (such as fetching data) based on the
election result.  See examples in behaviors/default/bitcoinTraker.js
and behaviors/default/flightTracker.js.

*/

/*

ElectedActor keeps track of the currently elected view. It picks the first
of all players currently in the world as the leader of the peers.

setup() may be called multiple times in its life cycle. But since
firstEligibleView prefers the currently elected view, it is safe to call again.

*/

class ElectedActor {
    setup() {
        this.subscribe("playerManager", "create", "updateElectedView");
        this.subscribe("playerManager", "destroy", "updateElectedView");
        this.subscribe("playerManager", "enter", "updateElectedView");
        this.subscribe("playerManager", "leave", "updateElectedView");
        this.updateElectedView();
    }

    // previous versions of this behavior have used these methods
    viewJoined() { this.unsubscribe(this.sessionId, "view-join"); }
    viewExited() { this.unsubscribe(this.sessionId, "view-exit"); }

    firstEligibleView() {
        const manager = this.service("PlayerManager");
        // prefer currently elected view, if player is in the world
        const current = manager.player(this.electedViewId);
        if (current && current.inWorld) return this.electedViewId;
        // prefer in-world players (in particular, no spectators)
        for (const [viewId, player] of manager.players) {
            if (player.inWorld) return viewId;
        }
        // otherwise, pick the first player
        for (const [viewId] of manager.players) {
            return viewId;
        }
    }

    updateElectedView() {
        const electedBefore = this.electedViewId;
        const electedAfter = this.firstEligibleView();
        if (electedBefore !== electedAfter) {
            this.electedViewId = electedAfter;
            this.say("view-elected", electedAfter);
        }
    }
}

/*

ElectedPawn publishes an event when the elected peer changes. The
electionStatusRequested() method is called when the accompanying
behavior is being setup(), so that the view can check if the view is
already elected.

For other cases, the onViewElected() method is called when the model
chooses a new leader and checks if the peer was either newly unelected
or elected. It publishes the event handleElected and handleUnelected,
and the accompanying behavior attached to the same object is expected
to handle the event.

*/

class ElectedPawn {
    setup() {
        if (this.electedViewId === undefined) {
            this.electedViewId = "";
            this.onViewElected(this.actorCall("ElectedActor", "electedViewId"));
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

    teardown() {
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
