class RearrangeButtonActor {
    setup() {
        this.addEventListener("pointerTap", "pressed");
    }

    check() {
        return this._cardData.rearranged;
    }

    pressed() {
        //if (this.check()) {return;}
        this._cardData.rearranged = true;

        let flightTracker = this.queryCards().filter((c) => c.name === "flightTracker");
        if (flightTracker[0]) {
            flightTracker[0].set({translation: [-2.9612415315138225, 5.5325562744871135, -33.24926529495514]});
        }

        this.moveCascadeDemo();
    }

    moveCascadeDemo() {
        let base = this.queryCards().filter((c) => c.name === "base");
        if (base[0]) {
            base[0].set({
                translation: [32.35043668195448, 0.5333311732970384, -18.116381872009743],
                rotation: Microverse.q_euler(0.47123889803846897, Math.PI, 0)
            });
        }

        let base2 = this.queryCards().filter((c) => c.name === "base 2");
        if (base2[0]) {
            base2[0].set({
                translation: [32.382446107309924, -1.3319528860066834, -20.746485651429282],
                rotation: Microverse.q_euler(0.35123889803846897, Math.PI, 0)
            });
        }
        let spray = this.queryCards().filter((c) => c.name === "spray");
        if (spray[0]) {
            spray[0].set({
                translation: [32.546121675913284, 1.9440803511382083, -18.116381872009743],
            });
        }
    }
}

class RearrangeButtonPawn {
    setup() {
        this.makeButton();
    }

    makeButton() {
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        let geometry = new Microverse.THREE.SphereGeometry(0.15, 16, 16);
        let material = new Microverse.THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.8});
        let button = new Microverse.THREE.Mesh(geometry, material);
        this.shape.add(button);
    }
}

export default {
    modules: [
        {
            name: "RearrangeButton",
            actorBehaviors: [RearrangeButtonActor],
            pawnBehaviors: [RearrangeButtonPawn]
        }
    ]
}

/* globals Microverse */
