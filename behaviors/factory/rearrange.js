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
        let cascade = this.queryCards().filter((c) => c.name === "cascade");
        if (cascade[0]) {
            cascade[0].set({
                translation: [32.35043668195448, 0.2, -17.6],
                rotation: Microverse.q_euler(0, Math.PI, 0),
                scale: [0.75, 0.75, 0.75]
            });
        }
    }
}

class RearrangeButtonPawn {
    setup() {
        this.makeButton();
    }

    makeButton() {
        [...this.shape.children].forEach((c) => this.shape.remove(c));

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
