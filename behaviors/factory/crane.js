/*

    Important Note: When changing the height or width of the links and joints,
    you must account for many things. This includes the collider, the translations
    of the links, the impulse joint creation, and the actual size of the material. 
    Some of these need to be doubled and others need to be halved or even fourthed,
    so look into the documentation to help figure it out. I've provided some comments
    below to help assist you in changing these values. Also, the code is somewhat
    modified for two connections, so see previous commits for the one connection code.
    
    (cd = Microverse.RAPIER.ColliderDesc.ball(0.85))
    (let translation = [0, 34.135389925172704 - i * 2, 0])
    (card.call("Rapier$RapierActor", "createImpulseJoint", "ball" ...))
    (let s = [0.1, 2.3])

*/

class CraneActor {
    setup() { // Start With Logic, Continue With Physics Implementation
        this.pointA = [-1.4447057496318962, -5.504611090090481, 29.225081241195];
        this.pointB = [-1.4447057496318962, -5.504611090090481, -6.8406291023593755];
        this.subscribe("crane", "updatePositionBy", "updatePositionBy");
        if (this.ratio === undefined) this.ratio = 0.2;
        this.updatePositionBy(0);
        
        this.createCard({ // Create Base
            name: "craneBase",
            translation: [0, -4.6239610018586506, 0.35],
            scale: [0.9, 0.9, 0.9],
            dataScale: [3.384158349075, 3.384158349075, 3.384158349075],
            parent: this,
            modelType: "glb",
            dataLocation: "35H7xJVLhQNFxNMt5HZigey3PXGNeREIgL3fy_PNJaOsXUFBRUYPGhpTXFlQRhtARhtWR1pEQFBBG1xaGkAadm19f1NxelhAfFNccGxaWntsQmVjTHpXXgVTBxpWWlgbUE1UWEVZUBtBR1BDWkcbWExYXFZHWkNQR0ZQGmABZQcHckV0cnJDXlRReGB3B3JMam0DeUwEGGENWgNhZAxaB1NgWUB0B2waUVRBVBpDQGJqeEV7ZmNQc2JZAWIHAndQVEZ8fURQY0NlBmp_UAd-DH9FZXRXUkRC",
            behaviorModules: ["Rapier", "CraneLink"],
            craneHandlesEvent: true,
            noSave: true,
            shadow: true,
            type: "3d",
        });

        let d = 9; // Amount of Links (+1) -> Four Links, Four Links, One End Piece (Hook)
        this.removeObjects(); // Reset

        this.links = [...Array(d).keys()].map((i) => {

            let bodyDesc;
            if (i === 0 || i === 4) { bodyDesc = Microverse.RAPIER.RigidBodyDesc.newKinematicPositionBased(); } // Top Link, Stays in Place
            else { bodyDesc = Microverse.RAPIER.RigidBodyDesc.newDynamic(); }

            let card;
            let translation1 = [0, 35.135389925172704 - i * 2, 1]; // Take into Account the * 2, Change for Differing Values
            let translation2 = [0, 43.135389925172704 - i * 2, 0]; // Second Connection
            let name = `link${i}`;
            let cd;

            if (i === d - 1) { // For the Final Link, do Something Different (Not Necessary)
                card = this.createCard({
                    name: "craneHook",
                    translation: [0, 27.135389925172704, 0], // Take Second Connection into Account
                    dataTranslation: [0, -45, 0], // Offset
                    dataScale: [4.422980389669552, 4.422980389669552, 4.422980389669552],
                    scale: [1.1, 1.1, 1.1],
                    parent: this,
                    type: "3d",
                    modelType: "glb",
                    dataLocation: "3DXL69tRPG3TIGu1pGwQ8THC_ykY41jJOqMYGH8DInacLDAwNDd-a2siLSghN2oxN2onNis1MSEwai0razFrBxwMDiIACykxDSItAR0rKwodMxQSPQsmL3QidmsnKylqITwlKTQoIWowNiEyKzZqKT0pLSc2KzIhNjchayJ3HnYwcQcnCgp0cCAcJQtpFC0lAHEVHAI-MBEdLSUWciYrDRN2aRMhFR1rICUwJWssaSMcDXI1DgcdITMuHH0cLi0WdxRzKwk8KXB1MgkdKyEgLBR3cjUsdDcd",
                    behaviorModules: ["Rapier", "CraneLink"],
                    craneHandlesEvent: true, // To Add Movement Physics
                    craneProto: true, // Since GLB Exists
                    noSave: true,
                    shadow: true,
                });
                card.call("Rapier$RapierActor", "createRigidBody", bodyDesc);
                cd = Microverse.RAPIER.ColliderDesc.ball(0.85); // Radius
            } 

            else if (i >= 4) { // Second Link
                card = this.createCard({
                    name, // Link4, Link5 ...
                    translation: translation2,
                    type: "object",
                    parent: this,
                    behaviorModules: ["Rapier", "CraneLink"],
                    craneHandlesEvent: true,
                    noSave: true,
                    shadow: true,
                });
                card.call("Rapier$RapierActor", "createRigidBody", bodyDesc);
                cd = Microverse.RAPIER.ColliderDesc.cylinder(0.9, 0.4); // Double Height (Gets Halved), Radius
            }

            else { // Standard Link
                card = this.createCard({
                    name, // Link0, Link1 ...
                    translation: translation1,
                    type: "object",
                    parent: this,
                    behaviorModules: ["Rapier", "CraneLink"],
                    craneHandlesEvent: true,
                    noSave: true,
                    shadow: true,
                });
                card.call("Rapier$RapierActor", "createRigidBody", bodyDesc);
                cd = Microverse.RAPIER.ColliderDesc.cylinder(0.9, 0.4); // Double Height (Gets Halved), Radius
            }

            cd.setRestitution(0.5);
            cd.setFriction(1);

            if (i >= 4) { cd.setDensity(6.0); }
            else { cd.setDensity(15.0); }

            card.call("Rapier$RapierActor", "createCollider", cd);
            return card;

        });

        this.joints = [...Array(d - 1).keys()].map((i) => {

            let card = this.createCard({
                name: `joint${i}`,
                type: "object",
                parent: this,
                behaviorModules: ["Rapier"],
                noSave: true,
            });

            if (i !== 3) { card.call("Rapier$RapierActor", "createImpulseJoint", "ball", this.links[i], this.links[i + 1], {x: 0, y: -1, z: 0}, {x: 0, y: 1, z: 0}); } // Half Y
            else { card.call("Rapier$RapierActor", "createImpulseJoint", "ball", this.links[3], this.links[8], {x: 0, y: -1, z: 0}, {x: 0, y: 1, z: 1}); } // Specific Connection (First Joint, Second Joint)
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
            this.shape.children.forEach((o) => this.shape.remove(o));
            this.shape.children = [];
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
        let movement = Microverse.v3_scale([0, 0, ratio * 60], 30);
        r.applyForce({x: movement[0], y: movement[1], z: movement[2]}, true);
    }

    jolt(p3d) { // Jolt From Pendulum
        if (!p3d.normal) { return; }
        let r = this.rigidBody;
        if (!r) { return; }
        let jolt = Microverse.v3_scale(p3d.normal, 250);
        r.applyForce({x: jolt[0], y: jolt[1], z: jolt[2]}, true);
    }

    teardown() {
        this.removeEventListener("pointerTap", "jolt");
    }
}

class CraneLinkPawn {
    setup() {

        /*

          Creates a Three.JS mesh based on the specified rapierShape and rapierSize.
          
          For a demo purpose, it does not override an existing shape
          (by checking this.shape.children.length) so that the earth
          shape created by FlightTracker behavior is preserved.
          
          Uncomment the cyclinder case to add the cylinder shape.
        
        */

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");

        if (this.actor._cardData.craneProto) { return; }
        this.shape.children.forEach((c) => this.shape.remove(c));
        this.shape.children = [];

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
        if (this.occupier !== undefined) { this.future(60).publishMove(); }
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

/* Three behavior modules are exported from this file. */

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
        }
    ]
}

/* globals Microverse */
