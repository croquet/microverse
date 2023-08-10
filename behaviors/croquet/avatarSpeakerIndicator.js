// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class Actor {
	setup() {
		this.subscribe(this._parent.id, "audioLevelChanged", this.setVibration);
		this.audioLevel = null;
	}

	setVibration(audioLevel) {
		this.audioLevel = audioLevel;
		this.publish(this.id, "audioLevelChanged", this.audioLevel);
	}
}


class SpeakerIndicatorPawn {
	setup() {
		this.subscribe(this.actor.id, "audioLevelChanged", this.setVibration);
	}

	setVibration(audioLevel) {
		const outlineMaterial = new THREE.MeshBasicMaterial( { transparent: true, color: 0xffffff , side: Microverse.THREE.BackSide } );
		const outlineMesh = new Microverse.THREE.Mesh( this.shape.children[0].geometry, outlineMaterial );
		outlineMesh.scale.multiplyScalar( 1.05 );
		const maxScale = audioLevel < 0.296875 ? 1 + audioLevel : 0.296875;
		if (audioLevel > 0.015629) {
			this.shape.children[0].add(outlineMesh);
			outlineMesh.scale.set(maxScale, maxScale, maxScale);
		} else {
			if (this.shape.children[0].children[1]) {
				this.shape.children[0].children[1].removeFromParent();
			}
		}
	}
}

export default {
	modules: [
		{
			name: "SpeakerIndicator",
			pawnBehaviors: [SpeakerIndicatorPawn],
			actorBehaviors: [Actor]
		},
	]
}
