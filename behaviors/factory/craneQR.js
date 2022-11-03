/*
    Important Note: When changing the height or width of the links and joints,
    you must account for many things. This includes the collider, the translations
    of the links, the impulse joint creation, and the actual size of the material.
    Some of these need to be doubled and others need to be halved or even fourthed,
    so look into the documentation to help figure it out. I've provided some comments
    below to help assist you in changing these values. Also, the code is somewhat
    modified for two connections, so see previous commits for the one connection code.

    (cd = Microverse.Physics.ColliderDesc.ball(0.85))
    (let translation = [0, 34.135389925172704 - i * 2, 0])
    (card.call("Physics$PhysicsActor", "createImpulseJoint", "ball" ...))
    (let s = [0.1, 2.3])
*/

class CraneActor {
    setup() { // Start With Logic, Continue With Physics Implementation
        if (!this.physicsWorld) {
            let physicsManager = this.service("PhysicsManager");
            console.log("new physics world for crane");
            this.setPhysicsWorld(physicsManager.createWorld({timeStep: 50}, this.id));
        }

        this.pointA = [-1.4447057496318962, -5.504611090090481, 29.225081241195];
        this.pointB = [-1.4447057496318962, -5.504611090090481, -6.8406291023593755];
        this.subscribe("crane", "updatePositionBy", "updatePositionBy");
        if (this.ratio === undefined) this.ratio = 0.005;
        this.updatePositionBy(0);

        this.removeObjects(); // Reset

        this.base = this.createCard({ // Create Base
            name: "craneBase",
            translation: [0, -4.6239610018586506, 0.35],
            scale: [0.9, 0.9, 0.9],
            dataScale: [3.384158349075, 3.384158349075, 3.384158349075],
            parent: this,
            modelType: "glb",
            dataLocation: "35H7xJVLhQNFxNMt5HZigey3PXGNeREIgL3fy_PNJaOsXUFBRUYPGhpTXFlQRhtARhtWR1pEQFBBG1xaGkAadm19f1NxelhAfFNccGxaWntsQmVjTHpXXgVTBxpWWlgbUE1UWEVZUBtBR1BDWkcbWExYXFZHWkNQR0ZQGmABZQcHckV0cnJDXlRReGB3B3JMam0DeUwEGGENWgNhZAxaB1NgWUB0B2waUVRBVBpDQGJqeEV7ZmNQc2JZAWIHAndQVEZ8fURQY0NlBmp_UAd-DH9FZXRXUkRC",
            behaviorModules: ["Physics", "CraneLink"],
            craneHandlesEvent: true,
            noSave: true,
            shadow: true,
            type: "3d",
        });

        // let d = 9; // Amount of Links (+1) -> Four Links, Four Links, One End Piece (Hook)
        let d = 7; // Amount of Links (+1) -> Four Links, Four Links, One End Piece (Hook) -> Three, Three, QR Code

        this.links = [...Array(d).keys()].map((i) => {

            // if (i === 0 || i === 3) { // Top Link, Stays in Place
            //     bodyDesc = Microverse.Physics.RigidBodyDesc.newKinematicPositionBased();
            // } else { bodyDesc = Microverse.Physics.RigidBodyDesc.newDynamic().restrictRotations(true, false, false); }

            let bodyDesc;
            if (i === 0 || i === 3) { // Top Link, Stays in Place
                bodyDesc = Microverse.Physics.RigidBodyDesc.newKinematicPositionBased();
            } else { bodyDesc = Microverse.Physics.RigidBodyDesc.newDynamic().restrictRotations(true, false, false); }

            // let translation1 = [0, 35.135389925172704 - i * 2, 1]; // Take into Account the * 2, Change for Differing Values
            // let translation2 = [0, 43.135389925172704 - i * 2, 0]; // Second Connection

            let card;
            let translation1 = [-0.8, 33.27402945352548 - i * 2, 0.5]; // Take into Account the * 2, Change for Differing Values
            let translation2 = [0.8, 39.27402945352548 - i * 2, 0.5]; // Second Connection
            let name = `link${i}`;
            let cd;

            // name: "craneHook",
            // translation: [0, 27.135389925172704, 0], // Take Second Connection into Account
            // dataTranslation: [0, -45, 0], // Offset
            // dataScale: [4.422980389669552, 4.422980389669552, 4.422980389669552],
            // scale: [1.1, 1.1, 1.1],
            // dataLocation: "3DXL69tRPG3TIGu1pGwQ8THC_ykY41jJOqMYGH8DInacLDAwNDd-a2siLSghN2oxN2onNis1MSEwai0razFrBxwMDiIACykxDSItAR0rKwodMxQSPQsmL3QidmsnKylqITwlKTQoIWowNiEyKzZqKT0pLSc2KzIhNjchayJ3HnYwcQcnCgp0cCAcJQtpFC0lAHEVHAI-MBEdLSUWciYrDRN2aRMhFR1rICUwJWssaSMcDXI1DgcdITMuHH0cLi0WdxRzKwk8KXB1MgkdKyEgLBR3cjUsdDcd",
            // cd = Microverse.RAPIER.ColliderDesc.ball(0.85); // Radius

            if (i === d - 1) { // For the Final Link, do Something Different (Not Necessary)
                card = this.createCard({
                    name: "codeHolder",
                    translation: [0, 25.27402945352548, 0.5], // Take Second Connection into Account
                    dataTranslation: [-0.8, -2.0, 0.05], // Offset
                    dataScale: [3.0, 3.0, 3.0],
                    parent: this,
                    type: "3d",
                    modelType: "glb",
                    dataLocation: "3JH30Eq4hM1ur-svecB231GE2fl14Qku-gPPDKI8KXBwIj4-OjlwZWUsIyYvOWQ_OWQpOCU7Py8-ZCMlZT9lCRICACwOBSc_AywjDxMlJQQTPRocMwUoIXoseGUpJSdkLzIrJzomL2Q-OC88JThkJzMnIyk4JTwvODkvZQwgL3wbHh8eGn8zJQk-AwkODQIzeQAjHCEIJTAeIyEYOAwNGgU5DwJ9DCFlLis-K2UfMAkkLCIpCAQ4BCRyAi0BIAwkIwIgCAcGBih6DQkYBCgpCzs5DRx8OAMt",
                    fileName: "/Factory_QRholder.glb",
                    behaviorModules: ["Physics", "CraneLink"],
                    craneHandlesEvent: true, // To Add Movement Physics
                    craneProto: true, // Since GLB Exists
                    noSave: true,
                    shadow: true,
                });
                this.code = this.createCard({
                    name: "code",
                    translation: [-0.790649609012426, -1.996769647761484, 0.0606205735181959],
                    color: 0xffffff,
                    frameColor: 0x000000,
                    type: "2d",
                    textureType: "canvas",
                    textureWidth: 256,
                    textureHeight: 256,
                    height: 1,
                    width: 1,
                    scale: [4.8, 4.8, 4.8],
                    parent: card,
                    behaviorModules: ["QRCode"],
                    noSave: true,
                    shadow: true,
                });
                card.call("Physics$PhysicsActor", "createRigidBody", bodyDesc);
                cd = Microverse.Physics.ColliderDesc.cuboid(1.0, 1.0, 0.2);
            } else if (i >= 3) { // Second Link (4)
                card = this.createCard({
                    name, // Link4, Link5 ...
                    translation: translation2,
                    type: "object",
                    parent: this,
                    behaviorModules: ["Physics", "CraneLink"],
                    craneHandlesEvent: true,
                    noSave: true,
                    shadow: true,
                });
                card.call("Physics$PhysicsActor", "createRigidBody", bodyDesc);
                cd = Microverse.Physics.ColliderDesc.cylinder(0.9, 0.4); // Double Height (Gets Halved), Radius
            } else { // Standard Link
                card = this.createCard({
                    name, // Link0, Link1 ...
                    translation: translation1,
                    type: "object",
                    parent: this,
                    behaviorModules: ["Physics", "CraneLink"],
                    craneHandlesEvent: true,
                    noSave: true,
                    shadow: true,
                });
                card.call("Physics$PhysicsActor", "createRigidBody", bodyDesc);
                cd = Microverse.Physics.ColliderDesc.cylinder(0.9, 0.4); // Double Height (Gets Halved), Radius
            }

            cd.setRestitution(0.5);
            cd.setFriction(0.5);

            // if (i >= 4) {
            //     cd.setDensity(1.0);
            // } else { cd.setDensity(3.0); }

            if (i === d - 1) {
                cd.setDensity(1.0);
            } else { cd.setDensity(3.0); }

            card.call("Physics$PhysicsActor", "createCollider", cd);
            return card;

        });

        this.joints = [...Array(d - 1).keys()].map((i) => {

            let card = this.createCard({
                name: `joint${i}`,
                type: "object",
                parent: this,
                behaviorModules: ["Physics"],
                noSave: true,
            });

            // if (i !== 3) { // Half Y
            //     card.call("Rapier$RapierActor", "createImpulseJoint", "ball", this.links[i], this.links[i + 1], {x: 0, y: -1, z: 0}, {x: 0, y: 1, z: 0});
            // } else { card.call("Rapier$RapierActor", "createImpulseJoint", "ball", this.links[3], this.links[8], {x: 0, y: -1, z: 0}, {x: 0, y: 1, z: 1}); } // Specific Connection (First Joint, Second Joint)
            // return card;

            if (i !== 2) { // Half Y
                card.call("Physics$PhysicsActor", "createImpulseJoint", "ball", this.links[i], this.links[i + 1], {x: 0, y: -1, z: 0}, {x: 0, y: 1, z: 0});
            } else { card.call("Physics$PhysicsActor", "createImpulseJoint", "ball", this.links[2], this.links[6], {x: 0, y: -1, z: 0}, {x: -1.6, y: 1, z: 0}); } // Specific Connection (First Joint, Second Joint)
            return card;

        });

        let name = `link${d}`;

        this.jointProto = this.createCard({
            name, // Link10, Link9 ... Link0
            type: "object",
            craneProto: true,
            parent: this,
            behaviorModules: ["CraneLink"],
        });

    }

    removeObjects() {
        console.log("Destroy Objects");
        if (this.base) {
            this.base.destroy();
        }
        if (this.code) {
            this.code.destroy();
        }
        if (this.links) {
            this.links.forEach(l => l.destroy());
            this.links = null;
        }
        if (this.joints) {
            this.joints.forEach(j => j.destroy());
            this.joints = null;
        }
    }

    updatePositionBy(ratio) { // Where The Movement Occurs
        this.ratio += ratio;
        this.ratio = Math.min(1, Math.max(0, this.ratio));
        this.set({translation: Microverse.v3_lerp(this.pointA, this.pointB, this.ratio)});
        this.publish("craneLink", "handlePhysics", ratio); // Physics
    }
}

class CranePawn {
    setup() {
        if (this.obj) {
            [...this.shape.children].forEach((o) => this.shape.remove(o));
            this.obj.dispose();
            this.obj = null;
        }
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

class CraneLinkActor {
    setup() {
        if (this._cardData.craneHandlesEvent) {
            this.subscribe("craneLink", "handlePhysics", "handlePhysics");
            this.addEventListener("pointerTap", "jolt");
        }
    }

    handlePhysics(ratio) { // Complete Checks, Apply Physics
        if (ratio === 0) { return; }
        let r = this.rigidBody;
        if (!r) { return; }
        let movement = Microverse.v3_scale([0, 0, ratio * 75], 0.1);
        r.applyImpulse({x: movement[0], y: movement[1], z: movement[2]}, true);
    }

    jolt(p3d) { // Jolt From Pendulum
        if (!p3d.normal) { return; }
        let r = this.rigidBody;
        if (!r) { return; }
        let jolt = Microverse.v3_scale(p3d.normal, -4);
        r.applyImpulse({x: 0, y: 0, z: jolt[2]}, true);
    }

    teardown() {
        this.removeEventListener("pointerTap", "jolt");
    }
}

class CraneLinkPawn {
    setup() {

        /*
          Creates a Three.JS mesh based on the specified physicsShape and physhicsSize.
          For a demo purpose, it does not override an existing shape

          (by checking this.shape.children.length) so that the earth
          shape created by FlightTracker behavior is preserved.
          Uncomment the cyclinder case to add the cylinder shape.
        */

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");

        if (this.actor._cardData.craneProto) { return; }
        [...this.shape.children].forEach((c) => this.shape.remove(c));

        let s = [0.1, 2.3]; // Radius, Height (Half Height Here)
        let geometry = new Microverse.THREE.CylinderGeometry(s[0], s[0], s[1], 20);
        let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xffffff, metalness: 0.6});
        this.obj = new Microverse.THREE.Mesh(geometry, material);
        this.obj.castShadow = this.actor._cardData.shadow;
        this.obj.receiveShadow = this.actor._cardData.shadow;

        this.shape.add(this.obj);

    }
}

class CraneButtonActor { // Buttons Move Crane
    setup() {
        this.occupier = undefined;
        this.listen("publishMove", "publishMove");
        this.listen("pressButton", "pressButton");
        this.listen("publishFocus", "publishFocus");
        this.subscribe(this._cardData.myScope, "focus", "focus");
    }

    // Publish Translation
    publishMove() {
        if (this.occupier !== undefined) { this.future(25).publishMove(); }
        this.publish("crane", "updatePositionBy", this._cardData.craneSpeed);
    }

    // Update Translation
    pressButton(data) {
        let {translation, color} = data;
        this.translateTo(translation);
        this.say("updateColor", color);
    }

    // Publish New Focus
    publishFocus(viewId) {
        this.publish(this._cardData.myScope, "focus", viewId);
    }

    // Focus Controlling Player
    focus(viewId) {
        this.occupier = viewId;
    }
}

class CraneButtonPawn {
    setup() {
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

        if (this.shape.children.length === 0) {

            let shape = new Microverse.THREE.Shape();
            shape.moveTo(0, 0);
            shape.lineTo(-0.08, 0); // Start of First Curve
            shape.quadraticCurveTo(-0.1, 0, -0.1, 0.025); // End of First Curve
            shape.lineTo(-0.1, 0.2);
            shape.quadraticCurveTo(-0.1, 0.25, -0.125, 0.25);
            shape.lineTo(-0.15, 0.25);
            shape.quadraticCurveTo(-0.25, 0.25, -0.15, 0.35);
            shape.lineTo(-0.05, 0.45);
            shape.quadraticCurveTo(0, 0.5, 0.05, 0.45);
            shape.lineTo(0.15, 0.35);
            shape.quadraticCurveTo(0.25, 0.25, 0.15, 0.25);
            shape.lineTo(0.125, 0.25);
            shape.quadraticCurveTo(0.1, 0.25, 0.1, 0.2);
            shape.lineTo(0.1, 0.025);
            shape.quadraticCurveTo(0.1, 0, 0.08, 0);
            shape.lineTo(0, 0);

            let extrudeSettings = {
                bevelEnabled: true,
                bevelThickness: 0,
                bevelSize: 0,
                bevelOffset: 0,
                bevelSegments: 0,
                depth: 0.15,
                steps: 5,
            }

            let geometry = new Microverse.THREE.ExtrudeGeometry(shape, extrudeSettings);
            let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xD86508});
            this.obj = new Microverse.THREE.Mesh(geometry, material);
            this.obj.castShadow = this.actor._cardData.shadow;
            this.obj.receiveShadow = this.actor._cardData.shadow;
            this.shape.add(this.obj);

            // let geometryB = new Microverse.THREE.BoxGeometry(0.2, 0.25, 0.2);
            // let geometryT = new Microverse.THREE.BoxGeometry(0.2, 0.2, 0.2);
            // let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xD86508});

            // this.objB = new Microverse.THREE.Mesh(geometryB, material);
            // this.objT = new Microverse.THREE.Mesh(geometryT, material);

            // if (this.actor._cardData.craneSpeed > 0) { this.objT.translateY(0.1); }
            // else { this.objT.translateY(-0.1); }
            // this.objT.rotation.z = Math.PI / 4;

            // this.objB.castShadow = this.actor._cardData.shadow;
            // this.objB.receiveShadow = this.actor._cardData.shadow;
            // this.shape.add(this.objB);

            // this.objT.castShadow = this.actor._cardData.shadow;
            // this.objT.receiveShadow = this.actor._cardData.shadow;
            // this.shape.add(this.objT);

        }

        this.addEventListener("pointerDown", "start");
        this.addEventListener("pointerUp", "stop");
        this.listen("updateColor", "updateColor");

        this.upTranslation = this.actor._translation; // Storing Current and Pressed Translations (Avoids Errors)
        this.downTranslation = [this.actor._translation[0], this.actor._translation[1], this.actor._translation[2] - 0.1];
    }

    start() {
        if (this.actor.occupier === undefined) {
            this.say("pressButton", {translation: this.downTranslation, color: 0x313333});
            this.say("publishFocus", this.viewId);
            this.say("publishMove");
        }
    }

    stop() {
        if (this.actor.occupier === this.viewId) {
            this.say("pressButton", {translation: this.upTranslation, color: 0xD86508});
            this.say("publishFocus", undefined);
        }
    }

    updateColor(color) {
        this.obj.material.color.set(color);
    }
}

class QRCodePawn {
    setup() {
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
        let canvas = Microverse.App.makeQRCanvas();
        let ctx = this.canvas.getContext("2d");
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 256, 256); // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        this.texture.needsUpdate = true
    }
}

/* Four behavior modules are exported from this file. */

export default {
    modules: [
        {
            name: "Crane",
            actorBehaviors: [CraneActor],
            pawnBehaviors: [CranePawn]
        },
        {
            name: "CraneLink",
            actorBehaviors: [CraneLinkActor],
            pawnBehaviors: [CraneLinkPawn]
        },
        {
            name: "CraneButton",
            actorBehaviors: [CraneButtonActor],
            pawnBehaviors: [CraneButtonPawn],
        },
        {
            name: "QRCode",
            pawnBehaviors: [QRCodePawn],
        }
    ]
}

/* globals Microverse */
