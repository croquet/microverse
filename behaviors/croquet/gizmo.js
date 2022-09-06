class GizmoActor {
    setup() {
        console.log("actor", this.parent);

        this.listen("cycleModes", this.cycleModes);
        this.cycleModes();
    }

    cycleModes() {
        console.log("cycling modes, before: ", this.gizmoMode);
        if (!this.gizmoMode || this.gizmoMode === "scale") {
            if (this.gizmoMode === "scale") {
                this.scaleX.destroy();
                this.scaleY.destroy();
                this.scaleZ.destroy();
            }

            this.gizmoMode = "move";

            this.moveX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisX',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [1, 0, 0],
                color: 0xff0000,
                hoverColor: 0xff5555
            });

            this.moveY = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisY',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 1, 0],
                color: 0x00ff00,
                hoverColor: 0xaaffaa
            });

            this.moveZ = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisZ',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 0, 1],
                color: 0x0000ff,
                hoverColor: 0x5555ff
            });
        } else if (this.gizmoMode === "move") {
            this.moveX.destroy();
            this.moveY.destroy();
            this.moveZ.destroy();

            this.rotateX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoRotorX',
                behaviorModules: ["GizmoRotor"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [1, 0, 0],
                color: 0xff0000,
                hoverColor: 0xff5555
            });

            this.rotateY = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoRotorY',
                behaviorModules: ["GizmoRotor"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 1, 0],
                color: 0x00ff00,
                hoverColor: 0xaaffaa
            });

            this.rotateZ = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoRotorZ',
                behaviorModules: ["GizmoRotor"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 0, 1],
                color: 0x0000ff,
                hoverColor: 0x5555ff
            });

            this.gizmoMode = "rotate";
        } else if (this.gizmoMode == "rotate") {
            this.gizmoMode = "scale";

            console.log("before destroy")

            this.rotateX.destroy();
            this.rotateY.destroy();
            this.rotateZ.destroy();

            console.log("after destroy")

            this.scaleX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoScalerX',
                behaviorModules: ["GizmoScaler"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [1, 0, 0],
                color: 0xff0000,
                hoverColor: 0xff5555
            });

            this.scaleY = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoScalerY',
                behaviorModules: ["GizmoScaler"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 1, 0],
                color: 0x00ff00,
                hoverColor: 0xaaffaa
            });

            this.scaleZ = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoScalerZ',
                behaviorModules: ["GizmoScaler"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 0, 1],
                color: 0x0000ff,
                hoverColor: 0x5555ff
            });
        }
        console.log("cycled modes, now: ", this.gizmoMode);
    }
}

class GizmoPawn {
    setup() {
        console.log("pawn", this.parent)
    }
}

class GizmoAxisActor {
    setup() {
        this.listen("translateTarget", "translateTarget");
    }

    translateTarget(translation) {
        console.log("translating target", translation);
        this.parent.parent.set({translation})
    }
}

class GizmoAxisPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;

        const gyro = new THREE.Gyroscope({rotationInvariant: true, scaleInvariant: true});
        this.shape.add(gyro);
        gyro.add(
            this.makeAxisHelper()
        );

        this.dragStart = undefined;
        this.positionAtDragStart = undefined;
        this.movementEnabled = false;
        this.addEventListener("pointerDown", "startDrag");
        this.addEventListener("pointerMove", "drag");
        this.addEventListener("pointerUp", "endDrag");
        this.addEventListener("pointerEnter", "pointerEnter");
        this.addEventListener("pointerLeave", "pointerLeave");
    }

    makeAxisHelper() {
        return new Microverse.THREE.ArrowHelper(
            new Microverse.THREE.Vector3(...this.actor._cardData.axis),
            new Microverse.THREE.Vector3(0, 0, 0),
            3,
            this.originalColor
        )
    }

    startDrag(event) {
        console.log("start on axis", event);
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.dragStart = [...event.xyz];
        this.positionAtDragStart = [...this.actor.parent.parent._translation];
    }

    drag(event) {
        if (this.dragStart) {
            console.log("drag on axis", event);

            // if we are dragging along the Y axis
            let intersectionPlane = new Microverse.THREE.Plane();

            if (
                this.actor._cardData.axis[0] == 1 ||
                this.actor._cardData.axis[1] == 1
            ) {
                // intersect with the XY plane
                intersectionPlane.setFromNormalAndCoplanarPoint(
                    new Microverse.THREE.Vector3(0, 0, 1),
                    new Microverse.THREE.Vector3(...this.positionAtDragStart)
                );
            } else {
                // intersect with the YZ plane
                intersectionPlane.setFromNormalAndCoplanarPoint(
                    new Microverse.THREE.Vector3(1, 0, 0),
                    new Microverse.THREE.Vector3(...this.positionAtDragStart)
                );
            }

            console.log(intersectionPlane);

            let intersectionPoint = event.ray.intersectPlane(
                intersectionPlane,
                new Microverse.THREE.Vector3()
            );

            console.log("intersectionPoint", intersectionPoint);

            const delta3D = intersectionPoint
                .clone()
                .sub(new Microverse.THREE.Vector3(...this.dragStart));

            console.log("delta3D", delta3D);

            const nextPosition =
                this.actor._cardData.axis[0] == 1
                    ? [
                          delta3D.x + this.positionAtDragStart[0],
                          this.positionAtDragStart[1],
                          this.positionAtDragStart[2],
                      ]
                    : this.actor._cardData.axis[1] == 1
                    ? [
                          this.positionAtDragStart[0],
                          delta3D.y + this.positionAtDragStart[1],
                          this.positionAtDragStart[2],
                      ]
                    : [
                          this.positionAtDragStart[0],
                          this.positionAtDragStart[1],
                          delta3D.z + this.positionAtDragStart[2],
                      ];
            this.publish(this.actor.id, "translateTarget", nextPosition);
            // this.set({translation: nextPosition})
        }
    }

    endDrag(event) {
        console.log("end on axis", event);
        this.dragStart = undefined;
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.removeFirstResponder("pointerMove", {}, this);
    }

    pointerEnter() {
        console.log("hover");
        this.shape.children[0].children[0].setColor(this.actor._cardData.hoverColor);
    }

    pointerLeave() {
        this.shape.children[0].children[0].setColor(this.originalColor);
    }
}

class GizmoRotorActor {
    setup() {
        this.listen("rotateTarget", "rotateTarget");
    }

    rotateTarget(rotation) {
        console.log("rotating target", rotation);
        this.parent.parent.set({rotation})
    }
}

class GizmoRotorPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;
        const gyro = new THREE.Gyroscope({scaleInvariant: true});
        this.shape.add(gyro);
        gyro.add(this.createCircle(this.actor._cardData.color, this.actor._cardData.axis));

        this.dragStart = undefined;
        this.rotationAtDragStart = undefined;
        this.movementEnabled = false;
        this.addEventListener("pointerDown", "startDrag");
        this.addEventListener("pointerMove", "drag");
        this.addEventListener("pointerUp", "endDrag");
        this.addEventListener("pointerEnter", "pointerEnter");
        this.addEventListener("pointerLeave", "pointerLeave");
    }

    createCircle(color, axis) {
        const curve = new Microverse.THREE.EllipseCurve(
            0.0, 0.0,            // Center x, y
            2.0, 2.0,          // x radius, y radius
            0.0, 2.0 * Math.PI,  // Start angle, stop angle
        );

        const pts = curve.getSpacedPoints(256);
        const geo = new Microverse.THREE.BufferGeometry().setFromPoints(pts);

        if (axis[1] == 1) {
            geo.rotateX(Math.PI / 2);
        } else if (axis[0] == 1) {
            geo.rotateY(Math.PI / 2);
        }

        console.log(geo);

        const mat = new Microverse.THREE.LineBasicMaterial({ color });
        const circle = new Microverse.THREE.LineLoop(geo, mat);
        return circle
    }

    localRotationAxis() {
        return Microverse.v3_rotate(this.actor._cardData.axis, this.rotationAtDragStart);
    }

    rotationInteractionPlane() {
        const interactionPlane = new Microverse.THREE.Plane();
        interactionPlane.setFromNormalAndCoplanarPoint(new Microverse.THREE.Vector3(...this.localRotationAxis()), new Microverse.THREE.Vector3(...this.actor.parent.parent._translation));
        return interactionPlane;
    }

    startDrag(event) {
        console.log("start on axis", event);
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.rotationAtDragStart = [...(this.actor.parent.parent._rotation || Microverse.q_identity())];

        this.dragStart = event.ray.intersectPlane(
            this.rotationInteractionPlane(),
            new Microverse.THREE.Vector3()
        );

    }

    drag(event) {
        if (this.dragStart) {
            const newDragPoint = event.ray.intersectPlane(
                this.rotationInteractionPlane(),
                new Microverse.THREE.Vector3()
            );

            const startDirection = new Microverse.THREE.Vector3(...this.dragStart)
                .sub(new Microverse.THREE.Vector3(...this.actor.parent.parent._translation))
                .normalize();
            const newDirection = new Microverse.THREE.Vector3(...newDragPoint)
                .sub(new Microverse.THREE.Vector3(...this.actor.parent.parent._translation))
                .normalize();

            const normal = new Microverse.THREE.Vector3(...this.localRotationAxis());

            const angle = Math.atan2(startDirection.clone().cross(newDirection).dot(normal), startDirection.dot(newDirection))

            const nextRotation = Microverse.q_multiply(
                this.rotationAtDragStart,
                Microverse.q_axisAngle(this.localRotationAxis(), angle)
            );

            console.log("drag on axis", event, angle);
            this.publish(this.actor.id, "rotateTarget", nextRotation)
        }
    }

    endDrag(event) {
        console.log("end on axis", event);
        this.dragStart = undefined;
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.removeFirstResponder("pointerMove", {}, this);
    }

    pointerEnter() {
        console.log("hover");
        this.shape.children[0].children[0].material.color.set(this.actor._cardData.hoverColor);
    }

    pointerLeave() {
        this.shape.children[0].children[0].material.color.set(this.originalColor);
    }
}

class GizmoScalerActor {
    setup() {
        this.listen("scaleTarget", "scaleTarget");
    }

    translateTarget(scale) {
        console.log("scale target", scale);
        // this.parent.parent.set({translation})
    }
}

// TODO: lots of duplication here with GizmoAxisPawn until behaviour classes can reference/extend each other
class GizmoScalerPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;

        const gyro = new THREE.Gyroscope({scaleInvariant: true});
        this.shape.add(gyro);
        gyro.add(
            this.makeAxisHelper()
        );

        this.dragStart = undefined;
        this.positionAtDragStart = undefined;
        this.movementEnabled = false;
        this.addEventListener("pointerDown", "startDrag");
        this.addEventListener("pointerMove", "drag");
        this.addEventListener("pointerUp", "endDrag");
        this.addEventListener("pointerEnter", "pointerEnter");
        this.addEventListener("pointerLeave", "pointerLeave");
    }

    makeAxisHelper() {
        const points = [];
        points.push(new Microverse.THREE.Vector3(0, 0, 0));
        points.push((new Microverse.THREE.Vector3(...this.actor._cardData.axis)).multiplyScalar(3));

        const geometry = new Microverse.THREE.BufferGeometry().setFromPoints( points );
        const material = new Microverse.THREE.LineBasicMaterial({color: this.originalColor});

        const line = new Microverse.THREE.Line(geometry, material);

        const boxGeometry = new Microverse.THREE.BoxGeometry(0.3, 0.3, 0.3);
        const boxMaterial = new Microverse.THREE.MeshBasicMaterial({color: this.originalColor});
        const box = new Microverse.THREE.Mesh(boxGeometry, boxMaterial);
        box.translateOnAxis(new Microverse.THREE.Vector3(...this.actor._cardData.axis), 3);

        const group = new Microverse.THREE.Group();
        group.add(line);
        group.add(box);
        return group;
    }

    startDrag(event) {
        console.log("start on axis", event);
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.dragStart = [...event.xyz];
        this.positionAtDragStart = [...this.actor.parent.parent._translation];
    }

    drag(event) {
        if (this.dragStart) {
            console.log("drag on axis", event);

            // if we are dragging along the Y axis
            let intersectionPlane = new Microverse.THREE.Plane();

            if (
                this.actor._cardData.axis[0] == 1 ||
                this.actor._cardData.axis[1] == 1
            ) {
                // intersect with the XY axis
                intersectionPlane.setFromNormalAndCoplanarPoint(
                    new Microverse.THREE.Vector3(0, 0, 1),
                    new Microverse.THREE.Vector3(...this.positionAtDragStart)
                );
            } else {
                // intersect with the XZ axis
                intersectionPlane.setFromNormalAndCoplanarPoint(
                    new Microverse.THREE.Vector3(0, 1, 0),
                    new Microverse.THREE.Vector3(...this.positionAtDragStart)
                );
            }

            console.log(intersectionPlane);

            let intersectionPoint = event.ray.intersectPlane(
                intersectionPlane,
                new Microverse.THREE.Vector3()
            );

            console.log("intersectionPoint", intersectionPoint);

            const delta3D = intersectionPoint
                .clone()
                .sub(new Microverse.THREE.Vector3(...this.dragStart));

            console.log("delta3D", delta3D);

            const nextPosition =
                this.actor._cardData.axis[0] == 1
                    ? [
                          delta3D.x + this.positionAtDragStart[0],
                          this.positionAtDragStart[1],
                          this.positionAtDragStart[2],
                      ]
                    : this.actor._cardData.axis[1] == 1
                    ? [
                          this.positionAtDragStart[0],
                          delta3D.y + this.positionAtDragStart[1],
                          this.positionAtDragStart[2],
                      ]
                    : [
                          this.positionAtDragStart[0],
                          this.positionAtDragStart[1],
                          delta3D.z + this.positionAtDragStart[2],
                      ];
            this.publish(this.actor.id, "translateTarget", nextPosition);
            // this.set({translation: nextPosition})
        }
    }

    endDrag(event) {
        console.log("end on axis", event);
        this.dragStart = undefined;
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.removeFirstResponder("pointerMove", {}, this);
    }

    pointerEnter() {
        console.log("hover");
        this.shape.children[0].children[0].setColor(this.actor._cardData.hoverColor);
    }

    pointerLeave() {
        this.shape.children[0].children[0].setColor(this.originalColor);
    }
}

export default {
    modules: [
        {
            name: "Gizmo",
            actorBehaviors: [GizmoActor],
            pawnBehaviors: [GizmoPawn],
        },
        {
            name: "GizmoAxis",
            actorBehaviors: [GizmoAxisActor],
            pawnBehaviors: [GizmoAxisPawn],
        },
        {
            name: "GizmoRotor",
            actorBehaviors: [GizmoRotorActor],
            pawnBehaviors: [GizmoRotorPawn],
        },
        {
            name: "GizmoScaler",
            actorBehaviors: [GizmoScalerActor],
            pawnBehaviors: [GizmoScalerPawn],
        }
    ]
}