class SlidesActor {
    setup() {
        this.addEventListener("pointerDown", "advance");
    }

    advance() {
        let index = this._cardData.slideIndex || 0;
        let slides = this._cardData.slides;

        index++;
        if (index >= slides.length) {
            index = 0;
        }
        this._cardData.slideIndex = index;

        this.say("show");
    }
}

class SlidesPawn {
    setup() {
        this.show();
        this.listen("show", "show");
        this.listen("updateShape", "show");
    }

    show() {
        if (this.slideTexture) {
            this.slideTexture.dispose();
            this.slideTexture = null;
        }
        const THREE = Microverse.THREE;

        if (this.shape.children.length === 0) {
            let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshStandardMaterial();
            this.cube = new THREE.Mesh(geometry, material);
            this.shape.add(this.cube);
        }

        let index = this.actor._cardData.slideIndex || 0;
        let dataId = this.actor._cardData.slides[index];
        if (!dataId) {return;}

        this.getBuffer(dataId).then((buffer) => {
            let objectURL = URL.createObjectURL(new Blob([buffer]));
            this.objectURL = objectURL;
            return new Promise((resolve, reject) => {
                this.slideTexture = new THREE.TextureLoader().load(
                    objectURL,
                    (texture) => {
                        resolve({width: texture.image.width, height: texture.image.height, texture})
                        // texture.wrapS = THREE.RepeatWrapping;
                        // texture.wrapT = THREE.RepeatWrapping;
                    }, null, reject);
            });
        }).then((textureData) => {
            let {width, height, texture} = textureData;
            let material = new THREE.MeshStandardMaterial({map: texture});
            this.cube.material = material;
        });
    }
}

export default {
    modules: [
        {
            name: "Slides",
            actorBehaviors: [SlidesActor],
            pawnBehaviors: [SlidesPawn],
        }
    ]
}

/* globals Microverse */
