class GizmoActor {
    setup() {
        console.log("actor", this.parent);

        this.listen("cycleModes", this.cycleModes);
        this.cycleModes();
    }

    cycleModes() {
        if (!this.gizmoMode || this.gizmoMode === "scale") {
            if (this.gizmoMode === "scale") {

            }

            this.gizmoMode = "move";

            this.moveX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxis',
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
                name: 'gizmoAxis',
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
                name: 'gizmoAxis',
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
                name: 'gizmoRotor',
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
                name: 'gizmoRotor',
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
                name: 'gizmoRotor',
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
        this.shape.add(new Microverse.THREE.ArrowHelper(
            new Microverse.THREE.Vector3(...this.actor._cardData.axis),
            new Microverse.THREE.Vector3(0, 0, 0),
            3,
            this.originalColor
        ));

        this.dragStart = undefined;
        this.positionAtDragStart = undefined;
        this.movementEnabled = false;
        this.addEventListener("pointerDown", "startDrag");
        this.addEventListener("pointerMove", "drag");
        this.addEventListener("pointerUp", "endDrag");
        this.addEventListener("pointerEnter", "pointerEnter");
        this.addEventListener("pointerLeave", "pointerLeave");
    }

    startDrag(event) {
        console.log("start on axis", event);
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.dragStart = [...event.xy];
        this.positionAtDragStart = [...this.actor.parent.parent._translation];
    }

    drag(event) {
        if (this.dragStart) {
            console.log("drag on axis", event);
            const delta2D = [
                (event.xy[0] - this.dragStart[0]),
                (event.xy[1] - this.dragStart[1]),
            ]

            const nextPosition = this.actor._cardData.axis[0] == 1 ? [
                0.01 * delta2D[0] + this.positionAtDragStart[0],
                this.positionAtDragStart[1],
                this.positionAtDragStart[2]
            ] : this.actor._cardData.axis[1] == 1 ? [
                this.positionAtDragStart[0],
                -0.01 * delta2D[1] + this.positionAtDragStart[1],
                this.positionAtDragStart[2]
            ] : [
                this.positionAtDragStart[0],
                this.positionAtDragStart[1],
                -0.01 * delta2D[0] + this.positionAtDragStart[2],
            ];
            this.publish(this.actor.id, "translateTarget", nextPosition)
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
        this.shape.children[0].setColor(this.actor._cardData.hoverColor);
    }

    pointerLeave() {
        this.shape.children[0].setColor(this.originalColor);
    }
}

class GizmoRotorActor {
    setup() {
        this.listen("rotateTarget", "rotateTarget");
    }

    rotateTarget(rotation) {
        console.log("rotating target", rotation);
        this.parent.parent.rotateTo(rotation)
    }
}



class GizmoRotorPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;
        this.shape.add(this.createCircle(this.actor._cardData.color, this.actor._cardData.axis));

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
            1.0, 1.0,          // x radius, y radius
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

    startDrag(event) {
        console.log("start on axis", event);
        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.dragStart = [...event.xy];
        this.rotationAtDragStart = [...(this.actor.parent.parent._rotation || this.actor.worldcoreKernel.q_identity())];
    }

    drag(event) {
        if (this.dragStart) {
            const delta2D = [
                (event.xy[0] - this.dragStart[0]),
                (event.xy[1] - this.dragStart[1]),
            ]

            const nextRotation = this.actor.worldcoreKernel.q_multiply(
                this.rotationAtDragStart,
                this.actor.worldcoreKernel.q_axisAngle(
                    this.actor.worldcoreKernel.v3_rotate(this.actor._cardData.axis, this.rotationAtDragStart),
                    0.1 * delta2D[0]
                )
            );

            console.log("drag on axis", event, nextRotation, this.rotationAtDragStart,);
            this.publish(this.actor.id, "rotateTarget", nextRotation)
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
        this.shape.children[0].material.color.set(this.actor._cardData.hoverColor);
    }

    pointerLeave() {
        this.shape.children[0].material.color.set(this.originalColor);
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
        }
    ]
}