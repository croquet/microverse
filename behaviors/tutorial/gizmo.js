class GizmoActor {

}

class GizmoPawn {
    setup() {
        this.dragStart = undefined;
        this.positionAtDragStart = undefined;
        this.addEventListener("pointerDown", "startDrag");
        this.addEventListener("pointerMove", "drag");
        this.addEventListener("pointerUp", "endDrag");
    }

    startDrag(event) {
        console.log("start", event, this._translation);
        if (event.shiftKey) {
            this.dragStart = [...event.xy];
            this.positionAtDragStart = [...this._translation];
            const avatar = Microverse.GetPawn(event.avatarId);
            avatar.addFirstResponder("pointerMove", {}, this);
        }
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
        this.dragStart = undefined;
        const avatar = Microverse.GetPawn(event.avatarId);
        avatar.removeFirstResponder("pointerMove", {}, this);
    }
}

export default {
    modules: [
        {
            name: "HasGizmo",
            actorBehaviors: [GizmoActor],
            pawnBehaviors: [GizmoPawn],
        }
    ]
}