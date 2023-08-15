//------------------------------------------------------
// BouncingLogo
// A very simple demonstration of how to create a similar application
// using the DynamicTexture surface.

// the following import statement is solely for the type checking and
// autocompletion features in IDE.  A Behavior cannot inherit from
// another behavior or a base class but can use the methods and
// properties of the card to which it is installed.
// The prototype classes ActorBehavior and PawnBehavior provide
// the features defined at the card object.

import {ActorBehavior, PawnBehavior, Vector2} from "../PrototypeBehavior";

class BouncingLogoActor extends ActorBehavior {
    SPEED: number;
    position: Vector2;
    ballVelocity: Vector2;
    radius: number;
    running: boolean;
    imageSize: number;
    canvasSize: Vector2;
    setup() {
        this.SPEED = 10;
        this.imageSize = 64;
        this.canvasSize = [this._cardData.textureWidth, this._cardData.textureHeight];
        this.position = Microverse.v2_scale(this.canvasSize, 0.5);
        this.ballVelocity = this.randomVelocity();
        this.radius = (this.canvasSize[0] / 2 - this.imageSize) ** 2;
        this.listen("set", this.updatePosition);
        if (!this.running) {
            this.future(100).bounce();
            this.running = true;
        }
    }

    randomVelocity(): Vector2 {
        const r = Math.random() * 2 * Math.PI;
        return [Math.cos(r) * this.SPEED, Math.sin(r) * this.SPEED];
    }

    bounce() {
        let {v2_add, v2_sub, v2_sqrMag, v2_abs, v2_multiply, v2_scale} = Microverse;
        let newPos = v2_add(this.position, this.ballVelocity);
        let d = v2_sub(newPos, v2_scale(this.canvasSize, 0.5));
        let dx;
        let dy;
        if (v2_sqrMag(d) > this.radius) {
            dx = d[0] > 0 ? -1 : 1;
            dy = d[1] > 0 ? -1 : 1;
            let newVel = this.randomVelocity();
            this.ballVelocity = v2_multiply(v2_abs(newVel), [dx, dy]);
        }
        this.updatePosition(newPos);
        this.future(50).bounce();
    }

    updatePosition(p: Vector2) {
        this.position = p;
        this.say("updatePosition");
    }
}

class BouncingLogoPawn extends PawnBehavior {
    image: HTMLImageElement;
    canvas: HTMLCanvasElement;
    imageSize: number;
    texture: THREE.CanvasTexture;
    setup() {
        this.updatePosition();
        this.listen("updatePosition", "updatePosition");
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerMove", "onPointerMove");
        this.imageSize = (this.actor as BouncingLogoActor).imageSize;
        let image = new Image();
        image.src = "./assets/SVG/CroquetSymbol_CMYK_NoShadow.svg";
        image.onload = () => {
            this.image = image;
        }
    }

    updatePosition() {
        let pos = (this.actor as BouncingLogoActor).position;
        let ctx = this.canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.image && this.texture) {
            ctx.drawImage(this.image, pos[0] - this.imageSize, pos[1] - this.imageSize, this.imageSize * 2, this.imageSize * 2);
            this.texture.needsUpdate = true;
        }
    }

    uv2xy(uv) {
        return [this.actor._cardData.textureWidth * uv[0], this.actor._cardData.textureHeight * (1 - uv[1])];
    }

    onPointerDown(p3d) {
        this.say("set", this.uv2xy(p3d.uv));
    }

    onPointerMove(p3d) {
        this.say("set", this.uv2xy(p3d.uv));
    }
}

export default {
    modules: [
        {
            name: "BouncingBall",
            actorBehaviors: [BouncingLogoActor],
            pawnBehaviors: [BouncingLogoPawn]
        }
    ]
}
