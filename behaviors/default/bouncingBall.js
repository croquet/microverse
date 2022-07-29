//------------------------------------------------------
// BouncingLogo
// A very simple demonstration of how to create a similar application
// using the DynamicTexture surface.

class BouncingLogoActor {
    setup() {
        this.SPEED = 10;
        this.position = [512, 512];
        this.ballVelocity = this.randomVelocity();
        this.radius = (512 - 64) * (512 - 64);
        this.listen("set", this.setPosition);
        if (!this.running) {
            this.future(100).bounce();
            this.running = true;
        }
    }

    randomVelocity() {
        const r = this.random() * 2 * Math.PI;
        return [Math.cos(r) * this.SPEED, Math.sin(r) * this.SPEED];
    }

    bounce() {
        let px = this.position[0], py = this.position[1];
        let vel = this.ballVelocity;
        px += vel[0];
        py += vel[1];
        let dx = px - 512;
        let dy = py - 512;
        if(dx * dx + dy * dy > this.radius) {
            dx = dx > 0 ? -1 : 1;
            dy = dy > 0 ? -1 : 1;
            this.ballVelocity = this.randomVelocity();
            this.ballVelocity[0] = Math.abs(this.ballVelocity[0]) * dx;
            this.ballVelocity[1] = Math.abs(this.ballVelocity[1]) * dy;
        }
        this.updatePosition([px, py]);
        this.future(50).bounce();
    }

    updatePosition(p) {
        this.position[0] = p[0];
        this.position[1] = p[1];
        this.say("updatePosition", this.position);
    }

    setPosition(uv) {
        let p = this.uv2xy(uv);
        this.updatePosition(p);
    }
}

class BouncingLogoPawn {
    setup() {
        this.updatePosition(this.actor.position);
        this.listen("updatePosition", "updatePosition");
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerMove", "onPointerMove");
        let image = new Image();
        image.src = "./assets/SVG/CroquetSymbol_CMYK_NoShadow.svg";
        image.onload = () => {
            this.image = image;
        }
    }

    updatePosition(pos) {
        this.dynamic.clear();
        if(this.image) {
            this.dynamic.drawImage(this.image, pos[0] - 64, pos[1] - 64, 128, 128);
        }
    }

    onPointerDown(p3d) {
        this.say("set", p3d.uv);
    }

    onPointerMove(p3d) {
        this.say("set", p3d.uv);
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
