class VideoActor {
    setup() {
        this.listen("tapped", "tapped");
        this.listen("ended", "ended");
        if (this.state === undefined) {
            this.state = "idle";
        }
    }

    tapped(maybeTime) {
        if (this.state === "idle") {
            if (!this._cardData.playStartTime) {
                this._cardData.playStartTime = this.now() / 1000.0;
                this._cardData.pauseTime = 0;
            }
            this.state = "startPlaying";
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
        delete this._cardData.playStartTime
    }
}

class VideoPawn {
    setup() {
        this.handler = () => this.enableVideo();
        document.addEventListener("pointerdown", this.handler);
        this.interval = setInterval(() => this.adjustIfNecessary(), 1000);

        this.listen("cardDataSet", "videoChanged");
        this.listen("playVideoRequested", "playVideoRequested");
        this.listen("stopVideoRequested", "stopVideoRequested");
        this.addEventListener("pointerTap", "tapped");
    }

    enableVideo() {
        if (this.handler && this.videoLoaded) {
            document.removeEventListener("pointerdown", this.handler);
            delete this.handler;
            console.log("starting");
            this.video.onended = () => this.ended();
            this.adjustIfNecessary();
            this.playVideoRequested();
        }
    }

    tapped() {
        if (this.videoLoaded) {
            console.log("say tapped", this.video.currentTime);
            this.say("tapped", this.video.currentTime);
        }
    }

    playVideoRequested() {
        if (!this.videoLoaded) {return;}
        if (!this.video.paused) {return;}
        let actorState = this.actor.state;
        if (!(actorState === "playing" || actorState === "startPlaying")) {return;}

        if (this.actor._cardData.pauseTime) {
            this.video.currentTime = this.actor._cardData.pauseTime;
        } else {
            let now = this.now();
            this.video.currentTime = (now / 1000) - this.actor._cardData.playStartTime;
        }
        this.play();
    }

    stopVideoRequested() {
        if (!this.videoLoaded) {return;}
        if (this.video.paused) {return;}
        let actorState = this.actor.state;
        if (!(actorState === "idle" || actorState === "stopPlaying")) {return;}
        this.stop();
    }

    play() {
        if (this.video) {
            this.video.play();
        }
    }

    stop() {
        if (this.video) {
            this.video.pause();
        }
    }

    videoChanged() {
        console.log("videoChanged");
    }

    adjustIfNecessary() {}

    ended() {
        if (this.video) {
            console.log("ended");
            if (this.actor.state !== "idle") {
                this.say("ended");
            }
        }
    }

    teardown() {
        if(this.video) this.stop();
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
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
