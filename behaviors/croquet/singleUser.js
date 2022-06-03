// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class SingleUserInteractionActor {
    setup() {
        if (this.occupier === undefined) this.occupier = null;
        if (this.lastOccupyerAction === undefined) this.lastOccupyerAction = -1; // this.now();

        this.subscribe(this.sessionId, "view-exit", "unoccupy");
        this.subscribe(this.id, "occupy", "occupy");
        this.subscribe(this.id, "unoccupy", "unoccupy");
    }

    occupy(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (!this.occupier) {
            this.occupier = viewId;
            this.lastOccupyerAction = this.now();
            this.say("occupierChanged");
            this.future(1000).checkDropOut();
        } else if (this.occupier === viewId) {
            this.lastOccupyerAction = this.now();
        }
    }

    unoccupy(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (this.occupier === viewId) {
            this.occupier = null;
            this.lastOccupyerAction = -1;
            this.say("occupierChanged");
        }
    }

    checkDropOut() {
        if (this.occupier) {this.future(1000).checkDropOut();}
        let timeout = this._cardData.singleUserTimeOut || 5000;
        if (this.lastOccupyerAction >= 0 && this.now() - this.lastOccupyerAction >= timeout) {
            this.unoccupy(this.occupier);
        }
    }

    teardown() {
        delete this.occupier;
        delete this.lastOccupyerAction;
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
