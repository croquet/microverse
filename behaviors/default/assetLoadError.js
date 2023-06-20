class AssetLoadErrorDisplayPawn {
    setup() {
        this.listen("assetLoadError", "assetLoadError");
    }

    assetLoadError(data) {
        let assetManager = this.service("AssetManager").assetManager;

        let textureLocation = "3DikAS8dd8lew-EUuJhtLznQXcKJDMM3-IAyFxyVtGjYLDAwNDd-a2siLSghN2oxN2onNis1MSEwai0razFrAyASJj0oDTcFLxUnBhwgdwM8JTI9MxEPEx0ddmstK2onNis1MSEwajQrNjAlKGoxNCgrJSBrKQo2MXIOdC99B3A9Ly4wMAgDARwAAAIPDRsbD3JzKy0lAxRwHQs0EDAgK2sgJTAlawwQKRcKd3wOMiYnFQ59BwIUN3V9KgYoKQZ9dgcVEi8XIjwrFzQzdCYMCBE";
        // fileName: "broken-image-error.jpg"

        assetManager.fillCacheIfAbsent(textureLocation, () => {
            return this.getBuffer(textureLocation);
        }, this.id).then((buffer) => {
            let objectURL = URL.createObjectURL(new Blob([buffer]));
            let img = new Image();
            img.src = objectURL;
            img.onload = () => {
                let canvas = document.createElement("canvas");

                let cardWidth = this.actor._cardData.width || 1;
                let cardHeight = this.actor._cardData.height || 1;

                let ratio = (cardWidth / cardHeight) / (img.width / img.height);
                let dx, dy;
                if (ratio >= 1.0) {
                    canvas.height = img.height;
                    canvas.width = canvas.height * (cardWidth / cardHeight);
                    dy = 0;
                    dx = (canvas.width - img.width) / 2;
                } else {
                    canvas.width = img.width;
                    canvas.height = canvas.width * (cardHeight / cardWidth);
                    dx = 0;
                    dy = (canvas.height - img.height) / 2;
                }
                let ctx = canvas.getContext("2d");

                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, dx, dy);

                let metric = ctx.measureText(data.path || "");

                if (metric.width < canvas.width) {
                    ctx.fillStyle = "#F14B3F";

                    ctx.fillText(data.path || "", (canvas.width - metric.width) / 2, canvas.height * 0.9);
                }
                if (this.texture) {
                    this.texture.dispose();
                }
                this.texture = new Microverse.THREE.CanvasTexture(canvas);
                this.texture.colorSpace = THREE.SRGBColorSpace;

                if (this.material) {
                    let m;
                    if (Array.isArray(this.material)) {
                        m = this.material[0];
                    } else {
                        m = this.material;
                    }
                    m.map = this.texture;
                    m.color = new Microverse.THREE.Color(0xaaaaaa);
                    m.side = Microverse.THREE.DoubleSide;
                    m.needsUpdate = true;
                }

                let geometry = new Microverse.THREE.PlaneGeometry(cardWidth, cardHeight);
                this.shape.children[0].removeFromParent();
                let obj = new Microverse.THREE.Mesh(geometry, this.material[0]);
                this.shape.add(obj);
            }
        });
    }
}

export default {
    modules: [
        {
            name: "AssetLoadErrorDisplay",
            pawnBehaviors: [AssetLoadErrorDisplayPawn],
        }
    ]
};

/* globals Microverse */
