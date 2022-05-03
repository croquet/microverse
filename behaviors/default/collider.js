class ColliderActor {
    setup() {
        let kinematic;
        let rapierType = this._cardData.rapierType;
        let rapierShape = this._cardData.rapierShape;
        let rapierSensor = this._cardData.rapierSensor;
        let rapierForce = this._cardData.rapierForce;
        if (rapierType === "positionBased") {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newKinematicPositionBased();
        } else if (rapierType === "static") {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newStatic();
        } else {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newDynamic();
        }
        this.call("Rapier$RapierActor", "createRigidBody", kinematic);

        let cd;
        if (rapierShape === "ball") {
            let s = this._cardData.rapierSize || 1;
            s = s / 2;
            cd = Worldcore.RAPIER.ColliderDesc.ball(s);
        } else if (rapierShape === "cuboid") {
            let s = this._cardData.rapierSize || [1, 1, 1];
            s = [s[0] / 2, s[1] / 2, s[2] / 2];
            cd = Worldcore.RAPIER.ColliderDesc.cuboid(...s);
        }
        cd.setRestitution(this._cardData.rapierRestitution || 0.5);
        cd.setFriction(this._cardData.rapierFriction || 1);
        cd.setDensity(this._cardData.rapierDensity || 1.5);

        if (rapierSensor) {
            console.log("sensor");
            this.registerIntersectionEventHandler("intersection");
            cd.setSensor(true);
            cd.setActiveEvents(Worldcore.RAPIER.ActiveEvents.CONTACT_EVENTS |
                               Worldcore.RAPIER.ActiveEvents.INTERSECTION_EVENTS);
        }
        this.call("Rapier$RapierActor", "createCollider", cd);

        if (!rapierType) {
            this.addEventListener("pointerTap", "jolt");
        }

        if (rapierForce) {
            this.rigidBody.applyForce(rapierForce);
        }
        this.listen("translating", "translated");
    }

    jolt() {
        let r = this.rigidBody;
        if (r) {
            r.applyForce({x: 0, y: 400, z: 0}, true);
            r.applyTorque({x: Math.random() * 50, y: Math.random() * 20, z: Math.random() * 50}, true);
        }
    }

    translated() {
        // may not be a very efficient way to detect it
        if (this._translation[1] < -10) {
            this.destroy();
        }
    }

    registerContactEventHandler(methodName) {
        let behavior = this._behavior;
        let physicsManager = this.service("RapierPhysicsManager");
        this.contactEventHandlerBehavior = `${behavior.module.name}$${behavior.$behaviorName}`;
        this.contactEventHandlerMethod = methodName;
        physicsManager.registerContactEventHandler(this._target);
    }

    registerIntersectionEventHandler(methodName) {
        let behavior = this._behavior;
        let physicsManager = this.service("RapierPhysicsManager");
        this.intersectionEventHandlerBehavior = `${behavior.module.name}$${behavior.$behaviorName}`;
        this.intersectionEventHandlerMethod = methodName;
        physicsManager.registerIntersectionEventHandler(this._target);
    }

    intersection(card1, card2, intersecting) {
        console.log(card1, card2, intersecting);
        if (!intersecting) {return;}
        if (card1.id !== this.id) {
            card1.destroy();
        }
        if (card2.id !== this.id) {
            card2.destroy();
        }
    }
}

class ColliderPawn {
    setup() {
        if (this.shape.children.length === 0) {
            let rapierShape = this.actor._cardData.rapierShape;
            if (rapierShape === "ball") {
                let s = this.actor._cardData.rapierSize || 1;
                let geometry = new Worldcore.THREE.SphereGeometry(s / 2, 32, 16);
                let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Worldcore.THREE.Mesh(geometry, material);
            } else if (rapierShape === "cuboid") {
                let s = this.actor._cardData.rapierSize || [1, 1, 1];
                let geometry = new Worldcore.THREE.BoxGeometry(...s);
                let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Worldcore.THREE.Mesh(geometry, material);
            }
            this.shape.add(this.obj);
        }
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

class SprayActor {
    setup() {
        this.running = true;
        // this.spray();
        this.addEventListener("pointerDown", "toggle");
    }

    spray() {
        if (!this.running) {return;}
        this.future(500).spray();

        const bt = [-20, 0, 53]; // bt for base translation

        let x = Math.random() * 200 - 100;
        let z = Math.random() * -100;
        let shape;
        let size;
        let color;

        let dice = Math.random();

        if (dice < 0.1) {
            this.createCard({
                name:"earth",
                type: "object",
                translation: [bt[0] - 1, 19, bt[2] - 2],
                layers: ["pointer"],
                scale: [0.25, 0.25, 0.25],
                behaviorModules: ["Rapier", "FlightTracker", "Collider"],
                rapierSize: 2,
                rapierShape: "ball",
                rapierForce: {x, y: 100, z},
                color: 0x0000ff,
                shadow: true,
            });
            return;
        }

        if (dice < 0.2) {
            this.createCard({
                name:"wooden box",
                type: "object",
                translation: [bt[0] - 1, 19, bt[2] - 2],
                layers: ["pointer"],
                behaviorModules: ["Rapier", "Slides", "Collider"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                rapierForce: {x, y: 100, z},
                slides: ["3Ty3Bbs4szi78KqNTyGrH0FVMEqE023P_eSIBhC8knE4PCAgJCdue3syPTgxJ3ohJ3o3JjslITEgej07eyF7EzACNi04HScVPwU3FgwwZxMsNSItIwEfAw0NZns9O3o3JjslITEgejk9NyY7IjEmJzF7PTs9AQIbOwY-Ag1mI2YtMTdjAy44GGxhGBsmHQU-AT4cMCYSImAcGSBnZHswNSA1exIeHBALYiMgPBcAYxwtYh0CBAQ_G2EyYx8sEm0WFjsOFSNiDDItAGMhNxk", "3V_rhbXp8a1PLyayumtWeAAGGfyLTKjRrD4suceOjMuoPiIiJiVseXkwPzozJXgjJXg1JDknIzMieD85eSN5ETIANC86HyUXPQc1FA4yZREuNyAvIQMdAQ8PZHk_OXg1JDknIzMieDs_NSQ5IDMkJTN5Pzk_AwAZOQQ8AA9kIWQvMzVhASw6Gm5jGhkkHwc8AzweMiQQIGIeGyJlZnkyNyI3eT00JBoDOWACJxcHFC4OBQljGCM8GwEsPyAbHhwkBxsEbgEzARIkIBIFZxM"],
                shadow: true,
            });
            return;
        }

        if (dice < 0.6) {
            shape = "cuboid";
            size = [1, 1, 1];
            color = 0xdd2222;
        } else {
            shape = "ball";
            size = 2;
            color = 0x22dd22;
        }

        this.createCard({
            type: "object",
            layers: ["pointer"],
            translation: [bt[0] - 1, 19, bt[2] - 2],
            behaviorModules: ["Rapier", "Collider"],
            rapierSize: size,
            rapierForce: {x, y: 100, z},
            rapierShape: shape,
            color: color,
            shadow: true,
        });
    }

    toggle() {
        this.running = !this.running;
        if (this.running) {
            this.spray();
        }
    }
}

export default {
    modules: [
        {
            name: "Collider",
            actorBehaviors: [ColliderActor],
            pawnBehaviors: [ColliderPawn]
        },
        {
            name: "Spray",
            actorBehaviors: [SprayActor],
        }
    ]
}

/* globals Worldcore */

