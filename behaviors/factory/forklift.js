class ForkLiftActor {
    setup() {
        this.paths = [
            [
                {v: [37.64344906612852, 0, -20.223492416172753], r: 0},
                {v: [37.64344906612852, 0, -26],                 r: 0},
                {v: [37.64344906612852, 0, -26],                 r: Math.PI / 2},
                {v: [28.944084890920184, 0, -26],                r: Math.PI / 2},
                {v: [28.944084890920184, 0, -26],                r: 0},

                {v: [28.944084890920184, 0, -29],                r: 0},
                {v: [28.944084890920184, 0, -29],                r: Math.PI / 2},

                {v: [16.944084890920184, 0, -29],                r: Math.PI / 2},
                {v: [16.944084890920184, 0, -29],                r: 0},

                {v: [16.944084890920184, 0, -32.35],             r: 0},
                {v: [16.944084890920184, 0, -32.35],             r: Math.PI / 2},
                {v: [7.83, 0, -32.35],                           r: Math.PI / 2},
                {v: [7.83, 0, -32.35],                           r: 0},
                {v: [7.83, 0, -38.7],                            r: 0},
                {v: [7.83, 0, -38.7],                            r: 0},
                {v: [7.83, 0, -38.7],                            r: -Math.PI / 2},
                {v: [7.83, 0, -38.7],                            r: -Math.PI},

                {v: [7.83, 0, -33.35],                           r: -Math.PI},
                {v: [7.83, 0, -33.35],                           r: -Math.PI / 2},

                {v: [16.944084890920184, 0, -33.35],             r: -Math.PI / 2},

                {v: [16.944084890920184, 0, -33.35],             r: -Math.PI},

                {v: [16.944084890920184, 0, -29],                r: -Math.PI},

                {v: [16.944084890920184, 0, -29],                r: -Math.PI / 2},

                {v: [28.944084890920184, 0, -29],                r: -Math.PI / 2},

                {v: [28.944084890920184, 0, -29],                r: -Math.PI},

                {v: [28.944084890920184, 0, -26],                r: -Math.PI},

                {v: [28.944084890920184, 0, -26],                r: -Math.PI / 2},

                {v: [37.64344906612852, 0, -26],                 r: -Math.PI / 2},

                {v: [37.64344906612852, 0, -26],                 r: -Math.PI},

                {v: [37.64344906612852, 0, -20.223492416172753], r: -Math.PI},
                {v: [37.64344906612852, 0, -20.223492416172753], r: -Math.PI / 2},
                {v: [37.64344906612852, 0, -20.223492416172753], r: 0},
            ], [
                {v: [-6.864045029864473, 0, -5],                 r: Math.PI},
                {v: [-6.864045029864473, 0, 1],                  r: Math.PI},
                {v: [-6.864045029864473, 0, 1],                  r: -Math.PI / 2},
                {v: [-4.864045029864473, 0, 1],                  r: -Math.PI / 2},
                {v: [-4.864045029864473, 0, 1],                  r: Math.PI},
                {v: [-4.864045029864473, 0, 5],                  r: Math.PI},
                {v: [-4.864045029864473, 0, 5],                  r: -Math.PI / 2},
                {v: [-4.864045029864473, 0, 5],                  r: 0},
                {v: [-4.864045029864473, 0, 1],                  r: 0},
                {v: [-4.864045029864473, 0, 1],                  r: -Math.PI / 2},
                {v: [-6.864045029864473, 0, 1],                  r: -Math.PI / 2},
                {v: [-6.864045029864473, 0, 1],                  r: Math.PI},
                {v: [-6.864045029864473, 0, -5],                 r: Math.PI},
                {v: [-6.864045029864473, 0, -5],                 r: Math.PI},
            ]
    ];


        this.checkPoints = this.paths[this._cardData.pathIndex || 0];
        
        if (this.checkPoint === undefined) {
            this.checkPoint = 0;
            this.ratio = 0; // [0, 1]
        }

        if (this.running === undefined) {
            this.running = true;
            this.step();
        }

        this.addEventListener("pointerDown", "toggle");
    }

    toggle() {
        this.running = !this.running;
        if (this.running && !this.futureScheduled) {
            this.step();
        }
    }

    step() {
        this.futureScheduled = false;
        this.ratio += 0.0625;
        if (this.ratio >= 1) {
            this.ratio = 0;
            this.checkPoint++;
            if (this.checkPoint >= this.checkPoints.length - 1) {
                this.checkPoint = 0;
            }
        }

        this.translateTo(Microverse.v3_lerp(
            this.checkPoints[this.checkPoint].v,
            this.checkPoints[this.checkPoint + 1].v,
            this.ratio
        ));
        this.rotateTo(Microverse.q_slerp(
            Microverse.q_euler(0, this.checkPoints[this.checkPoint].r, 0),
            Microverse.q_euler(0, this.checkPoints[this.checkPoint + 1].r, 0),
            this.ratio
        ));
        if (this.running) {
            this.futureScheduled = true;
            this.future(100).step();
        }
    }
}

export default {
    modules: [
        {
            name: "ForkLift",
            actorBehaviors: [ForkLiftActor],
        },
    ]
}

/* globals Microverse */
