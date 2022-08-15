// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { ModelService } from "@croquet/worldcore-kernel";

export let RAPIER;

export function RapierVersion() {
    return RAPIER.version();
}

//------------------------------------------------------------------------------------------
//-- RapierPhysicsManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierPhysicsManager extends ModelService {

    static async asyncStart() {
        console.log("Starting Rapier physics!");

        if (window.RAPIERModule) {
            RAPIER = window.RAPIERModule;
        } else {
            RAPIER = await import("@dimforge/rapier3d");
        }
    }

    static types() {
        if (!RAPIER) return {};
        return {
            "RAPIER.World": {
                cls: RAPIER.World,
                write: world => world.takeSnapshot(),
                read:  snapshot => RAPIER.World.restoreSnapshot(snapshot)
            },
            "RAPIER.EventQueue": {
                cls: RAPIER.EventQueue,
                write: _q => {},
                read:  _q => new RAPIER.EventQueue(true)
            },
        };
    }

    init(options = {}) {
        super.init('RapierPhysicsManager');
        if (options.useCollisionEventQueue) {
            this.queue = new RAPIER.EventQueue(true);
        }

        const gravity = options.gravity || [0.0, -9.8, 0.0];
        const timeStep = options.timeStep || 5; // Gets Converted to Miliseconds (Hz) 5 Approx 200 Hz

        const g = new RAPIER.Vector3(...gravity);
        this.world = new RAPIER.World(g);

        this.timeStep = timeStep;
        this.world.timestep = this.timeStep / 1000;
        this.rigidBodies = [];
        this.future(0).tick();
    }

    destroy() {
        super.destroy();
        this.world.free();
        this.world = null;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    tick() {
        if (!this.isPaused) {
            this.world.step(this.queue); // may be undefined
            this.world.forEachActiveRigidBodyHandle(h => {
                const rb = this.rigidBodies[h];
                const t = rb.rigidBody.translation();
                const r = rb.rigidBody.rotation();

                const v = [t.x, t.y, t.z];
                const q = [r.x, r.y, r.z, r.w];

                rb.moveTo(v);
                rb.say("translating", v);
                rb.rotateTo(q);
            });
            if (this.queue) {
                if (this.contactEventHandler) {
                    this.queue.drainContactEvents((handle1, handle2, started) => {
                        let rb1 = this.rigidBodies[handle1];
                        let rb2 = this.rigidBodies[handle2];
                        this.contactEventHandler.contactEvent(rb1, rb2, started);
                    });
                }
                if (this.intersectionEventHandler) {
                    this.queue.drainIntersectionEvents((handle1, handle2, intersecting) => {
                        let rb1 = this.rigidBodies[handle1];
                        let rb2 = this.rigidBodies[handle2];
                        this.intersectionEventHandler.intersectionEvent(rb1, rb2, intersecting);
                    });
                }
            }
        }
        this.future(this.timeStep).tick();
    }

    registerContactEventHandler(handler) {
        this.contactEventHandler = handler;
    }
    registerIntersectionEventHandler(handler) {
        this.intersectionEventHandler = handler;
    }
}
RapierPhysicsManager.register("RapierPhysicsManager");
