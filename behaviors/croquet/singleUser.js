// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

// the following import statement is solely for the type checking and
// autocompletion features in IDE.  A Behavior cannot inherit from
// another behavior or a base class but can use the methods and
// properties of the card to which it is installed.
// The prototype classes ActorBehavior and PawnBehavior provide
// the features defined at the card object.

import {ActorBehavior} from "../PrototypeBehavior";


class SingleUserInteractionActor extends ActorBehavior {
    setup() {
        if (this.occupier === undefined) this.occupier = null;
        if (this.lastOccupierAction === undefined) this.lastOccupierAction = -1; // this.now();

        this.subscribe(this.sessionId, "view-exit", "unfocus");
        this.subscribe(this.id, "focus", "focus");
        this.subscribe(this.id, "unfocus", "unfocus");
    }

    focus(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (!this.occupier) {
            this.occupier = viewId;
            this.lastOccupierAction = this.now();
            this.say("focusChanged");
            this.future(1000).checkDropOut();
        } else if (this.occupier === viewId) {
            this.lastOccupierAction = this.now();
        }
    }

    unfocus(viewId) {
        // console.log("actor tryOccupy", viewId);
        if (this.occupier === viewId) {
            this.occupier = null;
            this.lastOccupierAction = -1;
            this.say("focusChanged");
        }
    }

    checkDropOut() {
        if (this.occupier) {this.future(1000).checkDropOut();}
        let timeout = this._cardData.singleUserTimeOut || 5000;
        if (this.lastOccupierAction >= 0 && this.now() - this.lastOccupierAction >= timeout) {
            this.unfocus(this.occupier);
        }
    }

    teardown() {
        delete this.occupier;
        delete this.lastOccupierAction;
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
