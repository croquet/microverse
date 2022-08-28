class AmbientSoundActor {
    setup() {

    }

    update(){

    }
}


class AmbientSoundPawn {
    setup() {
        this.subscribe(this.actor.service("PlayerManager").players.get(this.viewId).id, "trigger", "play");

        this.file = this.actor._cardData.dataLocation;
        this.loop = this.actor._cardData.loop || false;
        this.volume = this.actor._cardData.volume || 0.5;
        console.log(this.file, this.loop, this.volume)
        const listener = new THREE.AudioListener();
        this.audio = new THREE.Audio( listener );
        if ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent )) {

            const loader = new THREE.AudioLoader();
            loader.load( this.file, function ( buffer ) {
console.log("A", buffer)
                this.audio.setBuffer( buffer );

            } );

        } else {
            this.mediaElement = new Audio( this.file );
           // this.mediaElement.play();
           console.log("B", this.mediaElement)
            this.audio.setMediaElementSource( this.mediaElement );
        }
        this.audio.setLoop(this.loop);
        this.audio.setVolume(this.volume);

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
