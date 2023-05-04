class AvatarPawn {
    setup() {
        this.speedManager = {snapshots: [], speed: 0, sign: 1, lastTime: Date.now()};
        this.teardown();

        this.animationsPromise = this.animationsPromise || this.loadAnimations();

        this.subscribe(this.id, "3dModelLoaded", "modelLoaded");

        if (this.avatarModel) {
            this.modelLoaded();
        }

        if (!this.isMyPlayerPawn) {return;}

        this.addFirstResponder("pointerTap", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerTap", this.pointerTap);

        this.addFirstResponder("pointerDown", {ctrlKey: true, altKey: true}, this);
        this.addLastResponder("pointerDown", {}, this);
        this.addEventListener("pointerDown", this.pointerDown);

        this.addFirstResponder("pointerMove", {ctrlKey: true, altKey: true}, this);
        this.addLastResponder("pointerMove", {}, this);
        this.addEventListener("pointerMove", this.pointerMove);

        this.addLastResponder("pointerUp", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerUp", this.pointerUp);

        this.addLastResponder("pointerWheel", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.addEventListener("pointerDoubleDown", this.addSticky);

        this.addLastResponder("keyDown", {ctrlKey: true}, this);
        this.addEventListener("keyDown", this.keyDown);

        this.addLastResponder("keyUp", {ctrlKey: true}, this);
        this.addEventListener("keyUp", this.keyUp);
    }

    loadAnimations() {
        const assetManager = this.service('AssetManager').assetManager;

        const paths = ["idle", "walking", "running"].map(n => `./assets/avatar-animations/${n}.glb`);

        let promises = paths.map((path) => {
            return assetManager.fillCacheIfAbsent(path, () => {
                return this.getBuffer(path).then((buffer) => {
                    return assetManager.load(buffer, 'glb', Microverse.THREE);
                });
            });
        });

        return Promise.all(promises).then((animatedObjects) => {
            return animatedObjects.reduce((animations, obj) => {
                return [...animations, ...obj._croquetAnimation.animations];
            }, []);
        });
    }

    handlingEvent() {
    }

    modelLoaded() {
        this.avatarModel = this.shape.children[0];
        const group = new Microverse.THREE.Group();
        group.add( this.shape.children[0] );
        group.rotateY(Math.PI);
        group.translateY(-1.7);
        this.shape.add(group);

        if (this.myInterval) {
            clearInterval(this.myInterval);
            delete this.myInterval;
        }

        this.animationsPromise.then((animations) => this.animate(animations));
    }

    animate(animations) {
        const mixer = new Microverse.THREE.AnimationMixer(this.avatarModel);

        this.avatarModel.animations = animations;

        const [
            idle,
            walking,
            running,
        ] = this.avatarModel.animations;

        this.animatedActions = {
            idle: mixer.clipAction(idle),
            walking: mixer.clipAction(walking),
            running: mixer.clipAction(running),
        }

        Object.values(this.animatedActions).forEach((action) => action.play());

        const run = () => {
            let now = Date.now();
            let lastTime = this.speedManager.lastTime;
            this.speedManager = this.calcSpeed(this.speedManager, now);

            let speed = this.speedManager.speed;
            let sign = this.speedManager.sign;

            const weight = speed / 2;

            if (this.avatarModel.visible) {
                this.animatedActions.idle.setEffectiveTimeScale(sign);
                this.animatedActions.walking.setEffectiveTimeScale(sign);
                this.animatedActions.running.setEffectiveTimeScale(sign);
                this.animatedActions.idle.setEffectiveWeight(1 - weight);
                this.animatedActions.walking.setEffectiveWeight(weight < 1 ? weight : 2 - weight);
                this.animatedActions.running.setEffectiveWeight(weight - 1);

                let delta = (now - lastTime) / 1000;

                mixer.update(delta);
                this.speedManager.lastTime = now;
            }
        }

        if (!this.myInterval) {
            this.myInterval = setInterval(() => run(), 16);
        }
    }

    calcSpeed(config, time) {
        if (config.snapshots.length >= 16) {
            config.snapshots.shift();
        }

        config.snapshots.push({
            position: [...this.translation],
            time,
        });

        const from = config.snapshots.at(0);
        const to = config.snapshots.at(-1);
        const preTo = config.snapshots.at(-2) || from;
        // const tick = to.time - preTo.time;

        if (from.position[0] === to.position[0] &&
            from.position[1] === to.position[1] &&
            from.position[2] === to.position[2]
        ) {
            return {
                snapshots: config.snapshots,
                lastTime: time,
                speed: 0,
                sign: 1,
            };
        }

        const distance = Math.sqrt(
            (from.position[0] - to.position[0]) ** 2 +
            (from.position[1] - to.position[1]) ** 2 +
            (from.position[2] - to.position[2]) ** 2
        );

        const speed = distance / (to.time - from.time) * 1000;

        // Sign should represent if avatar moves forward or backward
        const [,a,,b] = this.rotation;
        const xSign = Math.sign(a) !== Math.sign(b) ? 1 : -1;
        const sign = 0 <= to.position[0] - preTo.position[0] ? xSign : -xSign;

        return {
            snapshots: config.snapshots,
            lastTime: time,
            speed,
            sign,
        };
    }

    /*
    up(p3d) {
        this._plane = null;
        let avatar = Microverse.GetPawn(p3d.avatarId);
        avatar.removeFirstResponder("pointerMove", {}, this);
    }
    */

    mapOpacity(avatar, opacity) {
        if (this._target === avatar && Microverse.v3_magnitude(this.lookOffset) < 0.8) {return 0;}
        if (opacity === 0 || opacity === 1) {return opacity;}
        return 1;
    }

    teardown() {
        delete this.bones;

        if (this.myInterval) {
            clearInterval(this.myInterval);
            delete this.myInterval;
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (!this.isMyPlayerPawn) {return;}
        this.removeFirstResponder("pointerTap", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerTap", this.pointerTap);

        this.removeFirstResponder("pointerDown", {ctrlKey: true, altKey: true}, this);
        this.removeLastResponder("pointerDown", {}, this);
        this.removeEventListener("pointerDown", this.pointerDown);

        this.removeFirstResponder("pointerMove", {ctrlKey: true, altKey: true}, this);
        this.removeLastResponder("pointerMove", {}, this);
        this.removeEventListener("pointerMove", this.pointerMove);

        this.removeLastResponder("pointerUp", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerUp", this.pointerUp);

        this.removeLastResponder("pointerWheel", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.removeFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.removeEventListener("pointerDoubleDown", this.addSticky);

        this.removeLastResponder("keyDown", {ctrlKey: true}, this);
        this.removeEventListener("keyDown", this.keyDown);

        this.removeLastResponder("keyUp", {ctrlKey: true}, this);
        this.removeEventListener("keyUp", this.keyUp);
    }
}

export default {
    modules: [
        {
            name: "FullBodyAvatarEventHandler",
            pawnBehaviors: [AvatarPawn],
        }
    ]
}

/* globals Microverse */
