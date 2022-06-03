// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class SingleUserInteractionActor {
    setup() {
        if (this.occupier === undefined) this.occupier = null;

        this.subscribe(this.sessionId, "view-exit", "unoccupy");
        this.subscribe(this.id, "tryOccupy", "tryOccupy");
        this.subscribe(this.id, "unoccupy", "unoccupy");
    }

    tryOccupy(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (!this.occupier) {
            this.occupier = viewId;
            this.say("occupierChanged");
        }
    }

    unoccupy(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (this.occupier === viewId) {
            this.occupier = null;
        }
    }
        
    teardown() {
        this.occupier = null;
    }
}

export default {
    modules: [
        {
            name: "SingleUser",
            actorBehaviors: [SingleUserInteractionActor],
        }
    ]
}
