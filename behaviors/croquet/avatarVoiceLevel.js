// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

// the following import statement is solely for the type checking and
// autocompletion features in IDE.  A Behavior cannot inherit from
// another behavior or a base class but can use the methods and
// properties of the card to which it is installed.
// The prototype classes ActorBehavior and PawnBehavior provide
// the features defined at the card object.

import {ActorBehavior, PawnBehavior} from "../PrototypeBehavior";

class AvatarVoiceLevelActor extends ActorBehavior {
    setup() {
        this.subscribe(this.parent.id, "voiceLevelChanged", "voiceLevelChanged");
    }

    voiceLevelChanged(audioLevel) {
        this.publish(this.id, "voiceLevelChanged", audioLevel);
    }
}

class AvatarVoiceLevelPawn extends PawnBehavior {
    setup() {
        this.subscribe(this.actor.id, "voiceLevelChanged", "voiceLevelChanged");
    }

    voiceLevelChanged(audioLevel) {
        const s = 1 + audioLevel;
        this.shape.children[0].scale.set(s, s, s);
    }
}

export default {
    modules: [
        {
            name: "AvatarVoiceLevel",
            actorBehaviors: [AvatarVoiceLevelActor],
            pawnBehaviors: [AvatarVoiceLevelPawn],
        },
    ]
}
