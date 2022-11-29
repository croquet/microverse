/*
  A video player for Croquet Microverse.

  It plays a video synchronously (with in the error margin of setting currentTime property)

  Logically, a video has two states (playing and paused/not playing).
  When it is not playing however, there are cases whether:
  - the browser has gaven a permission to play the video
  - the next play (currentTime) should be changed based on whether the video had played
    into a position.

  There is a case that the session comes back from dormant. so care is taken that the video element receated won't start playing.
*/

class VideoActor {
    setup() {
        this.listen("tapped", "tapped");
        this.listen("ended", "ended");
        if (this.state === undefined) {
            this.state = "idle";
        }
    }

    tapped(maybeTime) {
        // console.log("tapped", maybeTime, this.state, this._cardData.playStartTime);
        if (this.state === "idle") {
            if (!this._cardData.playStartTime) {
                this._cardData.playStartTime = this.now() / 1000.0;
                this._cardData.pauseTime = 0;
            }
            this.state = "startPlaying";
            this._cardData.pauseTime = 0;
            this.say("playVideoRequested");
            this.future(50).updateState("playing");
            return;
        }

        if (this.state === "playing") {
            this.state = "stopPlaying";
            this.say("stopVideoRequested");
            this.future(50).updateState("idle");
            this._cardData.pauseTime = maybeTime;
            return;
        }
    }

    updateState(newState) {
        this.state = newState;
    }

    ended() {
        // this may be called multiple times
        this.state = "idle";
        delete this._cardData.playStartTime;
        delete this._cardData.pauseTime;
    }
}

class VideoPawn {
    setup() {
        this.setupHandlers();
        this.addEventListener("pointerTap", "tapped");

        this.listen("cardDataSet", "videoChanged");
        this.listen("playVideoRequested", "playVideoRequested");
        this.listen("stopVideoRequested", "stopVideoRequested");
        this.subscribe(this.viewId, "synced", "synced");
    }

    enableVideo() {
        // console.log("enableVideo");
        if (this.handler && this.videoLoaded) {
            document.removeEventListener("pointerdown", this.handler, true);
            delete this.handler;
            this.video.onended = () => this.ended();
            this.adjustIfNecessary();
            this.stop();
        }

        let actorState = this.actor.state;

        if ((actorState === "playing" || actorState === "startPlaying")) {
            this.playVideoRequested();
        }
    }

    tapped() {
        if (this.videoLoaded) {
            this.say("tapped", this.video.currentTime);
        }
    }

    setupHandlers() {
        this.handler = () => this.enableVideo();
        document.addEventListener("pointerdown", this.handler, true);
        this.interval = setInterval(() => this.adjustIfNecessary(), 1000);
    }

    cleanup() {
        this.stop();
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.handler) {
            document.removeEventListener("pointerdown", this.handler, true);
        }
    }

    synced(flag) {
        if (!flag) {return;}

        /*
        console.log(
            "video synced",
            window[`videopawn-${this.actor._cardData.textureLocation}`],
            this.actor.state
        );
        */

        if (window[`videopawn-${this.actor._cardData.textureLocation}`]) {
            delete window[`videopawn-${this.actor._cardData.textureLocation}`];
            let actorState = this.actor.state;
            if (!(actorState === "playing" || actorState === "startPlaying")) {
                this.playVideoRequested();
            } else if (actorState === "idle" || actorState === "stopPlaying") {
                this.stopVideoRequested();
            }
        }
    }

    playVideoRequested(firstTime) {
        // console.log("playVideoRequested: paused: ", this.video.paused);
        if (!this.videoLoaded) {return;}
        if (!firstTime && !this.video.paused) {return;}
        let actorState = this.actor.state;
        if (!firstTime && !(actorState === "playing" || actorState === "startPlaying")) {return;}

        if (this.actor._cardData.pauseTime) {
            this.video.currentTime = this.actor._cardData.pauseTime;
        } else {
            let now = this.now();
            this.video.currentTime = (now / 1000) - this.actor._cardData.playStartTime;
        }
        this.play();
    }

    stopVideoRequested() {
        // console.log("stopVideoRequested");
        if (!this.videoLoaded) {return;}
        if (this.video.paused) {return;}
        let actorState = this.actor.state;
        if (!(actorState === "idle" || actorState === "stopPlaying")) {return;}
        this.stop();
    }

    play() {
        // console.log("play");
        if (this.video) {
            this.videoEnabled = true;
            this.video.play();
        }
    }

    stop() {
        // console.log("stop");
        if (this.video) {
            this.videoEnabled = true;
            this.video.pause();
        }
    }

    mute(flag) {
        // console.log("mute");
        if (this.video) {
            this.video.muted = flag;
        }
    }

    videoChanged() {
        console.log("videoChanged");
    }

    adjustIfNecessary() {}

    ended() {
        if (this.video) {
            // console.log("ended");
            if (this.actor.state !== "idle") {
                this.say("ended");
            }
        }
    }

    teardown() {
        // so that only when  it was detached for the first time, this.resumed gets a value
        this.cleanup();
        if (this.videoEnabled) {
            window[`videopawn-${this.actor._cardData.textureLocation}`] = true;
        }
    }
}

export default {
    modules: [
        {
            name: "VideoPlayer",
            actorBehaviors: [VideoActor],
            pawnBehaviors: [VideoPawn]
        },
    ]
}
