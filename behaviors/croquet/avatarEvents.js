class AvatarPawn {
    setup() {
        if (!this.isMyPlayerPawn) {return;}
        
        this.addFirstResponder("pointerTap", {ctrlKey: true}, this);
        this.addEventListener("pointerTap", this.pointerTap);

        this.addFirstResponder("pointerDown", {ctrlKey: true}, this);
        this.addLastResponder("pointerDown", {}, this);
        this.addEventListener("pointerDown", this.pointerDown);

        this.addFirstResponder("pointerMove", {ctrlKey: true}, this);
        this.addLastResponder("pointerMove", {}, this);
        this.addEventListener("pointerMove", this.pointerMove);

        this.addLastResponder("pointerUp", {ctrlKey: true}, this);
        this.addEventListener("pointerUp", this.pointerUp);

        this.addLastResponder("pointerWheel", {}, this);
        this.addEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.addEventListener("pointerDoubleDown", this.addSticky);

        this.addLastResponder("keyDown", {}, this);
        this.addEventListener("keyDown", this.keyDown);

        this.addLastResponder("keyUp", {}, this);
        this.addEventListener("keyUp", this.keyUp);
    }

    destroy() {
        if (!this.isMyPlayerPawn) {return;}
        console.log("avatar event handler destroyed");
        this.removeFirstResponder("pointerTap", {ctrlKey: true}, this);
        this.removeEventListener("pointerTap", this.pointerTap);

        this.removeFirstResponder("pointerDown", {ctrlKey: true}, this);
        this.removeLastResponder("pointerDown", {}, this);
        this.removeEventListener("pointerDown", this.pointerDown);

        this.removeFirstResponder("pointerMove", {ctrlKey: true}, this);
        this.removeLastResponder("pointerMove", {}, this);
        this.removeEventListener("pointerMove", this.pointerMove);

        this.removeLastResponder("pointerUp", {ctrlKey: true}, this);
        this.removeEventListener("pointerUp", this.pointerUp);

        this.removeLastResponder("pointerWheel", {}, this);
        this.removeEventListener("pointerWheel", this.pointerWheel);

        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.removeFirstResponder("pointerDoubleDown", {shiftKey: true}, this);
        this.removeEventListener("pointerDoubleDown", this.addSticky);

        this.removeLastResponder("keyDown", {}, this);
        this.removeEventListener("keyDown", this.keyDown);

        this.removeLastResponder("keyUp", {}, this);
        this.removeEventListener("keyUp", this.keyUp);
    }
}

export default {
    modules: [
        {
            name: "AvatarEventHandler",
            pawnBehaviors: [AvatarPawn],
        }
    ]
}
