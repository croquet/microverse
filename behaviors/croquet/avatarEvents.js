// import { GetPawn, q_yaw } from "@croquet/worldcore-kernel";

class AvatarEventHandlerActor {
    setup() {
        this.listen("addOrCycleGizmo", this.addOrCycleGizmo);
        this.listen("removeGizmo", this.removeGizmo);
    }

    addOrCycleGizmo(target) {
        if (!this.gizmo) {
            this.gizmo = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmo',
                behaviorModules: ["Gizmo"],
                parent: target,
                type: "object",
                noSave: true,
            });
        } else {
            this.publish(this.gizmo.id, "cycleModes")
        }
    }

    removeGizmo() {
        this.gizmo?.destroy();
    }
}

class AvatarEventHandlerPawn {
    setup() {
        if (!this.isMyPlayerPawn) {return;}

        this.addFirstResponder("pointerTap", {ctrlKey: true, altKey: true, shiftKey: true}, this);
        this.addEventListener("pointerTap", this.pointerTap);

        this.addFirstResponder("pointerDown", {ctrlKey: true, altKey: true, shiftKey: true}, this);
        this.addLastResponder("pointerDown", {}, this);
        this.addEventListener("pointerDown", this.pointerDown);

        this.addFirstResponder("pointerMove", {ctrlKey: true, altKey: true, shiftKey: true}, this);
        this.addLastResponder("pointerMove", {}, this);
        this.addEventListener("pointerMove", this.pointerMove);

        this.addLastResponder("pointerUp", {ctrlKey: true, altKey: true, shiftKey: true}, this);
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

    pointerTap(_e) {
        if (this.editPawn) { // this gets set in pointerDown
            this.editPawn.unselectEdit();
            this.editPawn.showControls({avatar: this.actor.id,distance: this.targetDistance});
            this.editPawn = null;
            this.editPointerId = null;
        }
    }

    pointerDown(e) {
        const render = this.service("ThreeRenderManager");
        const rc = this.pointerRaycast(e.xy, render.threeLayerUnion('pointer'));
        this.targetDistance = rc.distance;
        let p3e = this.pointerEvent(rc, e);
        let pawn = this.actor.worldcoreKernel.GetPawn(p3e.targetId);

        if (this.gizmoTargetPawn && pawn !== this.gizmoTargetPawn) {
            this.gizmoTargetPawn.unselectEdit();
            this.gizmoTargetPawn = null;
            this.publish(this.actor.id, "removeGizmo");
        }

        if (e.ctrlKey || e.altKey) { // should be the first responder case
            p3e.lookNormal = this.actor.lookNormal;
            pawn = pawn || null;

            if (this.editPawn !== pawn) {
                if (this.editPawn) {
                    console.log('pointerDown clear old editPawn')
                    this.editPawn.unselectEdit();
                    this.editPawn = null;
                    this.editPointerId = null;
                }
                console.log('pointerDown set new editPawn', pawn)
                if (pawn) {
                    this.editPawn = pawn;
                    this.editPointerId = e.id;
                    this.editPawn.selectEdit();
                    this.buttonDown = e.button;
                    if (!p3e.normal) {p3e.normal = this.actor.lookNormal}
                    this.p3eDown = p3e;
                }
            } else {
                console.log("pointerDown in editMode");
            }
        } else if (e.shiftKey) {
            if (pawn) {
                this.gizmoTargetPawn = pawn;
                this.gizmoTargetPawn.selectEdit();
                this.publish(this.actor.id, "addOrCycleGizmo", this.gizmoTargetPawn.actor);
            }
        } else {
            if (!this.focusPawn) {
                // because this case is called as the last responder, facusPawn should be always empty
                this.dragWorld = this.xy2yp(e.xy);
                this.lookYaw = this.actor.worldcoreKernel.q_yaw(this._rotation);
            }
            let handlerModuleName = this.actor._cardData.avatarEventHandler;
            this.call(`${handlerModuleName}$AvatarEventHandlerPawn`, "handlingEvent", "pointerDown", this, e);
        }
    }

    pointerMove(e) {
        if (this.editPawn) {
            // a pawn is selected for draggging
            if (e.id === this.editPointerId) {
                if (this.buttonDown === 0) {
                    this.editPawn.dragPlane(this.setRayCast(e.xy), this.p3eDown);
                }else if (this.buttonDown == 2) {
                    this.editPawn.rotatePlane(this.setRayCast(e.xy), this.p3eDown);
                }
            }
        }else {
            // we should add and remove responders dynamically so that we don't have to check things this way
            if (!this.focusPawn && this.isPointerDown) {
                let yp = this.xy2yp(e.xy);
                let yaw = (this.lookYaw + (this.dragWorld[0] - yp[0]) * this.yawDirection);
                let pitch = this.lookPitch + this.dragWorld[1] - yp[1];
                pitch = pitch > 1 ? 1 : (pitch < -1 ? -1 : pitch);
                this.dragWorld = yp;
                this.lookTo(pitch, yaw);
            }
        }
    }

    pointerUp(_e) {
        if (this.editPawn) {
            this.editPawn.unselectEdit();
            this.editPawn = null;
            this.editPointerId = null;
            this.p3eDown = null;
            this.buttonDown = null;
        }

        // Below is a workaround to support an incomplete user program.
        // If there are left over first responders (pointer capture) from a user object,
        // delete them here.
        if (this.firstResponders) {
            for (let [_eventType, array] of this.firstResponders) {
                for (let i = array.length - 1; i >= 0; i--) {
                    let obj = array[i];
                    if (obj.pawn !== this) {
                        array.splice(i, 1);
                    }
                }
            }
        }
    }

    pointerWheel(e) {
        let z = this.lookOffset[2];
        z += Math.max(1,z) * e.deltaY / 1000.0;
        z = Math.min(100, Math.max(z,0));
        this.lookOffset = [this.lookOffset[0], z, z];
        let pitch = (this.lookPitch * 11 + Math.max(-z / 2, -Math.PI / 4)) / 12;
        this.lookTo(pitch, this.actor.worldcoreKernel.q_yaw(this._rotation), this.lookOffset); //,
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

    handlingEvent(_type, _target, _event) {}

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
            name: "AvatarEventHandler",
            actorBehaviors: [AvatarEventHandlerActor],
            pawnBehaviors: [AvatarEventHandlerPawn],
        }
    ]
}

/* globals Microverse */
