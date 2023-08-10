// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class AvatarVoiceLevelActor {
	setup() {
		this.subscribe(this.parent.id, "voiceLevelChanged", "voiceLevelChanged");
	}

	voiceLevelChanged(audioLevel) {
		this.publish(this.id, "voiceLevelChanged", audioLevel);
	}
}


class AvatarVoiceLevelPawn {
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
