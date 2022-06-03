// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class SingleUserInteractionActor {
    setup() {
        if (this.occupier === undefined) this.occupier = null;
        if (this.lastOccupyerAction === undefined) this.lastOccupyerAction = -1; // this.now();

        this.subscribe(this.sessionId, "view-exit", "unfocus");
        this.subscribe(this.id, "focus", "focus");
        this.subscribe(this.id, "unfocus", "unfocus");
    }

    focus(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (!this.occupier) {
            this.occupier = viewId;
            this.lastOccupyerAction = this.now();
            this.say("focusChanged");
            this.future(1000).checkDropOut();
        } else if (this.occupier === viewId) {
            this.lastOccupyerAction = this.now();
        }
    }

    unfocus(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (this.occupier === viewId) {
            this.occupier = null;
            this.lastOccupyerAction = -1;
            this.say("focusChanged");
        }
    }

    checkDropOut() {
        if (this.occupier) {this.future(1000).checkDropOut();}
        let timeout = this._cardData.singleUserTimeOut || 5000;
        if (this.lastOccupyerAction >= 0 && this.now() - this.lastOccupyerAction >= timeout) {
            this.unfocus(this.occupier);
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
