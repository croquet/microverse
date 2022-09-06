class AmbientSoundActor {
    setup() {
        // nothing yet
    }
}


class AmbientSoundPawn {
    setup() {
    //    this.subscribe(this.actor.service("PlayerManager").players.get(this.viewId).id, "trigger", "start");

        this.file = this.actor._cardData.dataLocation;
        this.loop = this.actor._cardData.loop || false;
        console.log(this.actor._cardData);
        this.volume = this.actor._cardData.volume || 0.25;
        this.maxVolume = this.actor._cardData.maxVolume || 0.5;
        this.scaleWind = 1;

        console.log(this.volume, this.maxVolume)
        this.subscribe("global", "setWind", this.setWind);
        this.subscribe("global", "scaleWind", this.setScaleWind);
        this.subscribe("global", "startStopWind", this.startStopWind);
        this.addEventListener("pointerDown", "trigger");
        this.loadSplashScreen();
        this.handler = () => this.start();
        document.addEventListener("click", this.handler);
    }

    loadSplashScreen(){
        let size = 8.5;
        const THREE = Microverse.THREE;
        new Microverse.THREE.TextureLoader().load(
            this.actor._cardData.textureLocation,
            splashTexture =>{
                let w = splashTexture.image.width;
                let h = splashTexture.image.height;
                this.fadeIn = new THREE.Mesh(new THREE.PlaneGeometry(size, size*h/w), 
                    new THREE.MeshBasicMaterial({
                        color: 0xFFFFFF, fog: false, transparent: true, opacity: 1.0, map:splashTexture,
                        depthTest: false, depthWrite: false, side:THREE.DoubleSide, toneMapped: false
                    }));
                this.fadeIn.position.z = -2;
                this.fadeIn.renderOrder = 1000;
                this.shape.add(this.fadeIn);
        });
    }

    start(){
        if(/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
           return; // no audio for you
        }
          
        console.log("AUDIO PLAY?", /(iPad|iPhone|iPod)/g.test( navigator.userAgent ))
        this.audio = new Audio(this.file);
        this.audio.loop = this.loop;
        this.audio.volume = this.volume;
        this.play();
        if (this.handler) {
            document.removeEventListener('click', this.handler);
            delete this.handler;
        }
    }

    setScaleWind(scale){
        this.scaleWind = Math.min(1, Math.max(0, scale)); // must be between 0-1
        this.audio.volume = this.currentVolume*this.scaleWind;
    }

    setWind(val){ // change volume on change in wind intensity
        if(this.audio){
            let delta = val*(this.maxVolume-this.volume);
            this.currentVolume = this.volume + delta;
            this.audio.volume = this.currentVolume*this.scaleWind;
        }
    }

    startStopWind(){
        if(this.playing)this.stop();
        else this.play();
    }

    play(){
        if(this.audio)this.audio.play();
        this.playing = true;
    }

    stop(){
        if(this.audio)this.audio.pause();
        this.playing = false;
    }

    update(t){
 
    }

    trigger(){
      //  this.start();
        this.fadeAway(1);
    }

    fadeAway(alpha){

        alpha -= 0.05;
        if(alpha>0){
            this.fadeIn.material.opacity = alpha;
            this.future(50).fadeAway(alpha);
            return;
        }
        this.disposeFadeIn();
    }

    disposeFadeIn(){
        // dispose of the fade
        if(this.fadeIn){
            this.fadeIn.removeFromParent();
            this.fadeIn.geometry.dispose();
            this.fadeIn.material.dispose();
            this.fadeIn = undefined;
            const render = this.service("ThreeRenderManager");
            if (render) render.dirtyAllLayers();
        }
        this.removeEventListener("pointerDown", "toggle");
    }
    
    teardown() {
        if(this.audio) this.stop();
        this.disposeFadeIn();

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
