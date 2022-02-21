class Fly {
    setup() {
        if (this.flying) {return;}
        this.flying = true;
        this.fly();
        this.addEventListener("pointerDown", "toggle");
    }

    fly() {
        if (!this.flying) {return;}
        this.future(20).call("Fly", "fly");
        this.rotateTo(WorldCore.q_euler(0, this.now()/9000,0));
    }

    toggle() {
        this.flying = !this.flying;
        if (this.flying) {
           this.fly();
        }
    }
}
