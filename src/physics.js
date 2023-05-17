// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { ModelService, Model } from "./worldcore";

export let Physics;

export function PhysicsVersion() {
    return "Rapier: " + Physics.version();
}

class PhysicsWorld extends Model {
    init(options) {
        if (options.useCollisionEventQueue) {
            this.queue = new Physics.EventQueue(true);
        }

        const gravity = options.gravity || [0.0, -9.8, 0.0];
        const timeStep = options.timeStep || 5; // Gets Converted to Miliseconds (Hz) 5 Approx 200 Hz

        const g = new Physics.Vector3(...gravity);
        this.world = new Physics.World(g);

        this.timeStep = timeStep;
        this.world.timestep = this.timeStep / 1000;
        this.rigidBodies = new Map();
        if (!options.startPaused) {
            this.future(0).tick();
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    tick() {
        if (!this.isPaused) {
            this.world.step(this.queue); // this.queue may be undefined
            this.world.forEachActiveRigidBody(body => {
                let h = body.handle;
                const rb = this.rigidBodies.get(h);
                const t = rb.rigidBody.translation();
                const r = rb.rigidBody.rotation();

                const v = [t.x, t.y, t.z];
                const q = [r.x, r.y, r.z, r.w];

                rb.moveTo(v);
                rb.say("translating", v);
                rb.rotateTo(q);
            });
            if (this.queue) {
                if (this.collisionEventHandler) {
                    this.queue.drainCollisionEvents((handle1, handle2, started) => {
                        let rb1 = this.rigidBodies.get(handle1);
                        let rb2 = this.rigidBodies.get(handle2);
                        this.collisionEventHandler.collision(rb1, rb2, started);
                    });
                }
            }
        }
        this.future(this.timeStep).tick();
    }

    registerCollisionEventHandler(handler) {
        this.collisionEventHandler = handler;
    }

    destroy() {
        this.world.free();
        this.world = null;
        // super.destroy();
    }
}

PhysicsWorld.register("PhysicsWorld");

//------------------------------------------------------------------------------------------
//-- PhysicsManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------
// Maintains a list of players connected to the session.

export class PhysicsManager extends ModelService {
    static async asyncStart() {
        if (window.RAPIERModule) {
            Physics = window.RAPIERModule;
        } else {
            Physics = await import("@dimforge/rapier3d");
        }
        console.log("Starting physics " + PhysicsVersion());
    }

    static types() {
        if (!Physics) return {};
        return {
            "Physics.World": {
                cls: Physics.World,
                write: world => world.takeSnapshot(),
                read:  snapshot => Physics.World.restoreSnapshot(snapshot)
            },
            "Physics.EventQueue": {
                cls: Physics.EventQueue,
                write: _q => {},
                read:  _q => new Physics.EventQueue(true)
            },
        };
    }

    init() {
        super.init("PhysicsManager");
        this.worlds = new Map();
        // this.globalWorld = this.createWorld({}, this.id);
    }

    createWorld(options, id) {
        let world = PhysicsWorld.create(options);
        this.worlds.set(id, world);
        return world;
    }

    createGlobalWorld(options) {
        if (this.globalWorld) {return;}
        this.globalWorld = this.createWorld(options, this.id);
        return this.globalWorld;
    }

    deleteWorld(id) {
        let world = this.worlds.get(id);
        if (!world) {return;}
        world.destroy();
        this.worlds.delete(id);
    }

    deleteGlobalWorld() {
        this.deleteWorld(this.id);
        delete this.globalWorld;
    }

    destroy() {
        for (let [_k, v] of this.worlds) {
            v.destroy();
        }
        delete this.globalWorld;
        this.worlds = new Map();
        super.destroy();
    }
}

PhysicsManager.register("PhysicsManager");
