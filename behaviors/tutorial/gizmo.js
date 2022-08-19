class GizmoActor {
    setup() {
        this.gizmo = undefined;
        this.listen("enableGizmo", "enableGizmo");
        this.listen("disableGizmo", "disableGizmo");
    }

    enableGizmo() {
        console.log("enableGizmo");
        this.gizmo = this.createCard({
            translation: [0, 0, 0],
            name: 'axisGizmo',
            behaviorModules: ["AxisGizmo"],
            parent: this,
            type: "object",
            noSave: true,
        });
    }

    disableGizmo() {
        console.log("disableGizmo");
        this.gizmo?.destroy();
    }
}

class GizmoPawn {
    setup() {
        this.dragStart = undefined;
        this.positionAtDragStart = undefined;
        this.movementEnabled = false;
        this.addEventListener("pointerDown", "startDrag");
        this.addEventListener("pointerMove", "drag");
        this.addEventListener("pointerUp", "endDrag");
    }

    startDrag(event) {
        console.log("start", event, this._translation);
        if (event.shiftKey) {
            this.movementEnabled = !this.movementEnabled;
            if (this.movementEnabled && !this.gizmo) {
                this.publish(this.actor.id, "enableGizmo");
            } else {
                this.publish(this.actor.id, "disableGizmo");
            }
        }
        // if (this.movementEnabled) {
        //     const avatar = Microverse.GetPawn(event.avatarId);
        //     avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        //     avatar.addFirstResponder("pointerMove", {}, this);
        //     this.dragStart = [...event.xy];
        //     this.positionAtDragStart = [...this._translation];
        // }
    }

    drag(event) {
        if (this.dragStart) {
            const delta2D = [
                (event.xy[0] - this.dragStart[0]),
                (event.xy[1] - this.dragStart[1]),
            ]
            const nextPosition = [
                0.01 * delta2D[0] + this.positionAtDragStart[0],
                -0.01 * delta2D[1] + this.positionAtDragStart[1],
                this.positionAtDragStart[2]
            ];
            console.log("drag", event, delta2D, nextPosition);
            this.set({translation: nextPosition})
        }
    }

    endDrag(event) {
        console.log("end", event);
        // this.dragStart = undefined;
        // const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        // avatar.removeFirstResponder("pointerMove", {}, this);
    }
}

class AxisGizmoActor {
    setup() {
        this.listen("translateParent", "translateParent");
    }

    translateParent(translation) {
        console.log("translating parent", translation);
        this.parent.set({translation})
    }
}

class AxisGizmoPawn {
    setup() {
        this.originalColor = 0xff0000;
        this.shape.add(new Microverse.THREE.ArrowHelper(
            new Microverse.THREE.Vector3(1, 0, 0),
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
        avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.dragStart = [...event.xy];
        this.positionAtDragStart = [...this.actor.parent._translation];
    }

    drag(event) {
        if (this.dragStart) {
            console.log("drag on axis", event);
            const delta2D = [
                (event.xy[0] - this.dragStart[0]),
                (event.xy[1] - this.dragStart[1]),
            ]
            const nextPosition = [
                0.01 * delta2D[0] + this.positionAtDragStart[0],
                this.positionAtDragStart[1],
                this.positionAtDragStart[2]
            ];
            this.publish(this.actor.id, "translateParent", nextPosition)
            // this.set({translation: nextPosition})
        }
    }

    endDrag(event) {
        console.log("end on axis", event);
        this.dragStart = undefined;
        const avatar = Microverse.GetPawn(event.avatarId);
        avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.removeFirstResponder("pointerMove", {}, this);
    }

    pointerEnter() {
        console.log("hover");
        this.shape.children[0].setColor(0xff5555);
    }

    pointerLeave() {
        this.shape.children[0].setColor(this.originalColor);
    }
}

export default {
    modules: [
        {
            name: "HasGizmo",
            actorBehaviors: [GizmoActor],
            pawnBehaviors: [GizmoPawn],
        },
        {
            name: "AxisGizmo",
            actorBehaviors: [AxisGizmoActor],
            pawnBehaviors: [AxisGizmoPawn],
        }
    ]
}