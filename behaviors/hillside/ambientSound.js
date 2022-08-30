class AmbientSoundActor {
    setup() {
        // nothing yet
    }
}


class AmbientSoundPawn {
    setup() {
        this.subscribe(this.actor.service("PlayerManager").players.get(this.viewId).id, "trigger", "start");

        this.file = this.actor._cardData.dataLocation;
        this.loop = this.actor._cardData.loop || false;
        this.volume = this.actor._cardData.volume || 0.25;
        this.maxVolume = this.actor._cardData.maxVolume || 0.5;
        this.subscribe("global", "setWind", this.setWind);
    }

    start(){
        this.audio = new Audio(this.file);
        this.audio.loop = this.loop;
        this.audio.volume = this.volume;
        this.audio.play();
    }

    setWind(val){ // change volume on change in wind intensity
        if(this.audio){
            let delta = val*(this.maxVolume-this.volume)
            this.audio.volume = this.volume + delta;
        }
    }

    play(){
        if(this.audio)this.audio.play();
    }

    stop(){
        if(this.audio)this.audio.stop();
    }

    update(t){
 
    }

    teardown() {
        if(this.audio) this.stop();

    }
}

export default {
    modules: [
        {
            name: "AmbientSound",
            actorBehaviors: [AmbientSoundActor],
            pawnBehaviors: [AmbientSoundPawn]
        }
    ]
}

/* globals Microverse */
