class SpatialSoundActor {
    setup() {
        this.listen("tapped", "tapped");
        this.listen("ended", "ended");
        if (this.state === undefined) {
            this.state = "idle";
            this.size = null;
            this.REWIND_TIME = 0.03; // same as default for a video-content card
            this._cardData.pauseTime = this.REWIND_TIME;
        }
    }

    tapped(currentTime) {
        console.log("tapped");
        if (this.state === "idle") {
            this._cardData.playStartTime = this.now() / 1000.0 - currentTime;
            this._cardData.pauseTime = null; // no pause time while playing
            this.state = "startPlaying";
            this.say("playSoundRequested");
            // so what about zero here?
            this.future(0).updateState("playing");
        } else if (this.state === "playing") {
            this.state = "pausePlaying";
            this._cardData.pauseTime = currentTime;
            this.say("pauseSoundRequested");
            this.future(0).updateState("idle");
        }
    }

    updateState(newState) {
        this.state = newState;
    }

    ended() {
        // handle the replicated "ended" event sent by each view when its own video
        // playback ends.
        // this may be called multiple times
        if (this.state !== "idle") {
            this.state = "idle";
            delete this._cardData.playStartTime;
            this._cardData.pauseTime = this.REWIND_TIME;
            this.say("pauseSoundRequested");
        }
    }
}

class SpatialSoundPawn {
    setup() {
        this.handler = () => this.start();
        document.addEventListener("pointerdown", this.handler);
        this.interval = setInterval(() => this.adjustIfNecessary(), 1000);

        this.listen("playSoundRequested", "playSoundRequested");
        this.listen("pauseSoundRequested", "pauseSoundRequested");
        this.subscribe("soundPlayer", "toggleSound", "toggleSound"); // from menu
        this.addEventListener("pointerTap", "tapped");
    }

    start() {
        if (this.handler) {
            document.removeEventListener("pointerdown", this.handler);
            delete this.handler;
            console.log("starting");
            this.airPlay();
        }
    }

    airPlay() {
        // create empty buffer
        let listener = this.getAudioListener();
        let context = listener.context;
        let buffer = context.createBuffer(1, 1, 22050);
        let source = context.createBufferSource();
        source.buffer = buffer;

        // connect to output (your speakers)
        source.connect(context.destination);

        // play the file
        source.start();
    }

    tapped() {
        this.say("tapped", this.audio ? this.audio.context.currentTime : 0);
    }

    ensureAudio() {
        let THREE = Microverse.THREE;
        if (this.audio) {
            return Promise.resolve(this.audio);
        }
        if (this.ensureAudioPromise) {
            return this.ensureAudioPromise;
        }

        let soundLocation = this.actor._cardData.soundLocation;
        this.ensureAudioPromise = this.getBuffer(soundLocation).then((buffer) => {
            let objectURL = URL.createObjectURL(new Blob([buffer], {type: "audio/mp3"}));
            this.file = objectURL;
            this.objectURL = objectURL;
            return this.file;
        }).then(() => {
            let audio = new THREE.PositionalAudio(this.getAudioListener());
            let audioLoader = new THREE.AudioLoader();
            return new Promise((resolve, _reject) => {
                audioLoader.load(this.file, (buffer) => {
                    audio.setBuffer(buffer);
                    audio.setRefDistance(20);
                    this.loop = this.actor._cardData.loop || false;
                    this.volume = this.actor._cardData.volume || 0.25;
                    this.maxVolume = this.actor._cardData.maxVolume || 0.5;
                    this.shape.add(audio);
                    this.audio = audio;
                    this.audio.setLoop(this.loop);
                    this.audio.setVolume(this.volume);
                    this.adjustIfNecessary();
                    this.audio.onEnded = () => this.ended();
                    this.pause();
                    resolve(this.audio);
                });
            });
        });
        return this.ensureAudioPromise;
    }

    async playSoundRequested() {
        if (this.audio && this.audio.isPlaying) {return;}
        if (!this.audio) {
            await this.ensureAudio();
        }
        // let now = this.now();
        // if (this.actor._cardData.playStartTime) {
        // this.audio.offset = now / 1000 - this.actor._cardData.playStartTime;
        // }
        // this.audio.offset = 0;
        this.play();
    }

    async pauseSoundRequested() {
        if (!this.audio) {return;}
        if (!this.audio.isPlaying) {return;}
        let actorState = this.actor.state;
        if (!(actorState === "idle" || actorState === "pausePlaying")) {return;}
        // if (this.actor._cardData.pauseTime) {
        // this.audio.offset = this.actor._cardData.pauseTime;
        // }
        this.pause();
    }

    adjustIfNecessary() {}

    toggleSound() {
        if (this.audio.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    ended() {
        if (this.audio) {
            this.audio.isPlaying = false;
            this.audio.offset = 0;
            console.log("ended");
            this.say("ended");
        }
    }

    play() {
        if (this.audio) {
            this.audio.play();
        }
    }

    pause() {
        if (this.audio && this.audio.source) {
            this.audio.offset = 0;
            this.audio.stop();
        }
    }

    teardown() {
        if(this.audio) this.pause();
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export default {
    modules: [
        {
            name: "SpatialSoundPlayer",
            actorBehaviors: [SpatialSoundActor],
            pawnBehaviors: [SpatialSoundPawn]
        },
    ]
}

/* globals Microverse */
