class AmbientSoundActor {
    setup() {

    }

    update(){

    }
}


class AmbientSoundPawn {
    setup() {
        this.subscribe(this.actor.service("PlayerManager").players.get(this.viewId).id, "trigger", "start");

        this.file = this.actor._cardData.dataLocation;
        this.loop = this.actor._cardData.loop || false;
        this.volume = this.actor._cardData.volume || 0.5;


    }

    start(){
        this.audio = new Audio(this.file);
        this.audio.loop = this.loop;
        this.audio.volume = this.volume;
        this.audio.play();
    }

    play(){
        console.log("play!")
        this.audio.play();
    }

    stop(){
        this.audio.stop();
    }

    update(t){
 
    }

    teardown() {
        this.audio.stop();

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
