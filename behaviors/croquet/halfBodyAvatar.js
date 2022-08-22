class AvatarActor {
    setup() {
        this._cardData.animationClipIndex = 9;
        this.say("animationStateChanged");
        this.listen("poseAvatarRequest", "poseAvatar");
    }

    poseAvatar(data) {
        this.lastPose = data;
        this.say("avatarPosed", data);
    }
}

class AvatarPawn {
    setup() {
        this.subscribe(this.id, "3dModelLoaded", "modelLoaded");
        this.listen("avatarPosed", "avatarPosed");
        if (this.avatarModel) {
            this.modelLoaded();
        }

        if (!this.isMyPlayerPawn) {return;}

        this.addFirstResponder("pointerTap", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerTap", this.pointerTap);

        this.addFirstResponder("pointerDown", {ctrlKey: true, altKey: true}, this);
        this.addLastResponder("pointerDown", {}, this);
        this.addEventListener("pointerDown", this.pointerDown);

        this.addFirstResponder("pointerMove", {ctrlKey: true, altKey: true}, this);
        this.addLastResponder("pointerMove", {}, this);
        this.addEventListener("pointerMove", this.pointerMove);

        this.addLastResponder("pointerUp", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerUp", this.pointerUp);

        this.addLastResponder("pointerWheel", {ctrlKey: true, altKey: true}, this);
        this.addEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.addEventListener("pointerDoubleDown", this.addSticky);

        this.addLastResponder("keyDown", {ctrlKey: true}, this);
        this.addEventListener("keyDown", this.keyDown);

        this.addLastResponder("keyUp", {ctrlKey: true}, this);
        this.addEventListener("keyUp", this.keyUp);
    }

    startMotion(dx, dy) {
        this.spin = Microverse.q_identity();
        this.velocity = Microverse.v3_zero();
        this.say("startFalling");
        if (dx || dy) this.updateMotion(dx, dy);
    }

    endMotion(_dx, _dy) {
        this.activeMMotion = false;
        this.spin = Microverse.q_identity();
        this.velocity = Microverse.v3_zero();
    }

    updateMotion(dx, dy) {
        const JOYSTICK_V = 0.000030;
        const MAX_V = 0.015;
        const MAX_SPIN = 0.0004;

        let v = dy * JOYSTICK_V;
        v = Math.min(Math.max(v, -MAX_V), MAX_V);

        const yaw = dx * (this.isMobile ? -2.5 * MAX_SPIN : -MAX_SPIN);
        this.spin = Microverse.q_euler(0, yaw ,0);
        this.velocity = [0, 0, v];
        this.maybeLeavePresentation();
    }

    handlingEvent(type, target, event) {
        if (type.startsWith("pointer")) {
            const render = this.service("ThreeRenderManager");
            const rc = this.pointerRaycast(event.xy, render.threeLayerUnion('pointer', "walk"));
            let p3e = this.pointerEvent(rc, event);
            this.move(type, p3e.xyz);
        }
    }

    modelLoaded() {
        this.avatarModel = this.shape.children[0];
        let found = false;
        if (this.avatarModel) {
            this.bones = new Map();
            this.avatarModel.traverse((mesh) => {
                if (mesh.isBone) {
                    this.bones.set(mesh.name, mesh);
                    if (mesh.name === "Spine") {
                        found = true;
                    }
                }
            });
        }

        if (found) {
            console.log("ready player me avatar found");
        }

        this.addFoot();

        this.handedness = this.actor._cardData.handedness === "Left" ? "Left" : "Right";
        this.otherHandName = this.actor._cardData.handedness === "Left" ? "RightHand" : "LeftHand";

        let otherHand = this.bones.get(this.otherHandName);
        if (otherHand) {
            otherHand.position.set(0, -10000, 0);
        }

        this.moveHand([0, 1, -100]);

        if (this.actor.lastPose) {
            this.avatarPosed(this.actor.lastPose);
        }
        /*
        [
            "Hips", "Spine", "Neck", "Head", "RightEye", "LeftEye",
            "RightHand", "RightHandIndex1", "RightHandIndex2", "RightHandIndex3", "RightHandMiddle1",
            "RightHandMiddle2", "RightHandMiddle3", "RightHandRing1", "RightHandRing2", "RightHandRing3",
            "RightHandPinky1", "RightHandPinky2", "RightHandPinky3", "RightHandThumb1", "RightHandThumb2",
            "RightHandThumb3",
            "LeftHand", "LeftHandIndex1", "LeftHandIndex2", "LeftHandIndex3", "LeftHandMiddle1",
            "LeftHandMiddle2", "LeftHandMiddle3", "LeftHandRing1", "LeftHandRing2", "LeftHandRing3",
            "LeftHandPinky1", "LeftHandPinky2", "LeftHandPinky3", "LeftHandThumb1", "LeftHandThumb2",
            "LeftHandThumb3"
        ];
        */
    }

    addFoot() {
        let foot = this.shape.children.find((c) => c.name === "ghostfoot");
        if (foot) {foot.removeFromParent();}

        let circle = new Microverse.THREE.CircleGeometry(0.3, 32);
        circle.rotateX(-Math.PI / 2);
        let material = new Microverse.THREE.MeshBasicMaterial({color: 0x666666});
        foot = new Microverse.THREE.Mesh(circle, material);
        foot.position.set(0, -1.6, 0);
        foot.name = "ghostfoot";

        this.shape.add(foot);
    }

    move(type, xyz) {
        if (!xyz) {return;}
        this.say("poseAvatarRequest", {type, coordinates: xyz}, 30);
    }

    avatarPosed(data) {
        if (!this.bones) {return;}
        let {type, coordinates} = data;
        if (type === "pointerMove") {
            this.moveHead(coordinates);
        }
        if (type === "keyDown" || type === "pointerDown" || type === "pointerUp" || type === "pointerTap") {
            this.moveHand(coordinates);
        }
    }

    moveHead(xyz) {
        let {
            THREE,
            q_lookAt, q_pitch, q_euler, q_yaw, q_roll, q_multiply, q_slerp, q_identity,
            v3_normalize
        } = Microverse;

        let head = this.bones.get("Head");
        let neck = this.bones.get("Neck");
        let global = neck.matrixWorld.clone();

        let dataRotation = new THREE.Matrix4();
        dataRotation.makeRotationY(-Math.PI);
        let headOffset = new THREE.Matrix4();
        headOffset.makeTranslation(...head.position.toArray());

        global.multiply(dataRotation);
        global.multiply(headOffset);
        global.invert();

        let local = new Microverse.THREE.Vector3(...xyz);
        local.applyMatrix4(global);
        let normLocal = v3_normalize(local.toArray());
        let normHere = [0, 0, -1];

        let allQ = q_lookAt(normHere, [0, 1, 0], normLocal);

        if (Number.isNaN(allQ[0]) || Number.isNaN(allQ[1]) || Number.isNaN(allQ[2]) || Number.isNaN(allQ[3])) {
            console.log("nande?");
            return;
        }

        let halfQ = q_slerp(q_identity(), allQ, 0.5);
        let leftEye = this.bones.get("LeftEye");
        let rightEye = this.bones.get("RightEye");

        head.rotation.set(-q_pitch(halfQ), q_yaw(halfQ), q_roll(halfQ));

        let eyeQ = q_multiply(q_euler(-1.57, 0, Math.PI), halfQ);
        leftEye.rotation.set(q_pitch(eyeQ), q_yaw(eyeQ), q_roll(eyeQ));
        rightEye.rotation.set(q_pitch(eyeQ), q_yaw(eyeQ), q_roll(eyeQ));
    }

    moveHand(xyz) {
        let {
            THREE,
            q_euler, q_pitch, q_yaw, q_roll, q_lookAt, q_multiply,// q_identity,
            v3_normalize, v3_rotate, v3_add} = Microverse;
        let len = 0.6582642197608948 * 0.4;
        let hFactor = this.handedness === "Left" ? -1 : 1;
        let elbowPos = [-len * hFactor, 0, 0.2];
        let handPos = [0, 0, hFactor * len * 0.6];

        let hand = this.bones.get(`${this.handedness}Hand`);
        let spine = this.bones.get("Spine");
        let global = spine.matrixWorld.clone();

        let dataRotation = new THREE.Matrix4();
        dataRotation.makeRotationY(-Math.PI);

        let elbowOffset = new THREE.Matrix4();
        elbowOffset.makeTranslation(...elbowPos);

        global.multiply(dataRotation);
        global.multiply(elbowOffset);

        global.invert();

        let local = new Microverse.THREE.Vector3(...xyz);
        local.applyMatrix4(global);
        let normLocal = v3_normalize(local.toArray());
        let normHere = [0, 0, -1];

        let allQ = q_lookAt(normHere, [0, 1, 0], normLocal);

        // console.log("hand", q_pitch(allQ), q_yaw(allQ), q_roll(allQ));

        let tQ = q_euler(-q_pitch(allQ), q_roll(allQ), -q_yaw(allQ));

        let handQ = q_multiply(q_euler(Math.PI / 2 - 0.2, hFactor * 1.3, 0), tQ);
        hand.rotation.set(q_pitch(handQ), q_yaw(handQ), q_roll(handQ));
        hand.position.set(...v3_add(elbowPos, v3_rotate(handPos, tQ)));

    }

    up(p3d) {
        this._plane = null;
        let avatar = Microverse.GetPawn(p3d.avatarId);
        avatar.removeFirstResponder("pointerMove", {}, this);
    }

    walkLook() {
        let {m4_translation, q_axisAngle, m4_rotationQ, m4_multiply} = Microverse;
        const pitchRotation = q_axisAngle([1,0,0], this.lookPitch);
        const m0 = m4_translation(this.lookOffset);
        const m1 = m4_translation([0, 0.2, 0]); // needs to be eye height;
        const tr = m4_multiply(m1, m0);

        const m2 = m4_rotationQ(pitchRotation);
        const m3 = m4_multiply(m2, tr);
        return m4_multiply(m3, this.global);
    }

    mapOpacity(opacity) {
        if (opacity === 0 || opacity === 1) {return opacity;}
        return 1;
    }

    teardown() {
        if (!this.isMyPlayerPawn) {return;}
        console.log("avatar event handler detached");
        this.removeFirstResponder("pointerTap", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerTap", this.pointerTap);

        this.removeFirstResponder("pointerDown", {ctrlKey: true, altKey: true}, this);
        this.removeLastResponder("pointerDown", {}, this);
        this.removeEventListener("pointerDown", this.pointerDown);

        this.removeFirstResponder("pointerMove", {ctrlKey: true, altKey: true}, this);
        this.removeLastResponder("pointerMove", {}, this);
        this.removeEventListener("pointerMove", this.pointerMove);

        this.removeLastResponder("pointerUp", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerUp", this.pointerUp);

        this.removeLastResponder("pointerWheel", {ctrlKey: true, altKey: true}, this);
        this.removeEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.removeFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.removeEventListener("pointerDoubleDown", this.addSticky);

        this.removeLastResponder("keyDown", {ctrlKey: true}, this);
        this.removeEventListener("keyDown", this.keyDown);

        this.removeLastResponder("keyUp", {ctrlKey: true}, this);
        this.removeEventListener("keyUp", this.keyUp);
    }
}

export default {
    modules: [
        {
            name: "HalfBodyAvatarEventHandler",
            actorBehaviors: [AvatarActor],
            pawnBehaviors: [AvatarPawn],
        }
    ]
}

/* globals Microverse */
