class PerlinActor {
    setup() {
        this.visible = false;
        this.initPerlin();
        this.updatePerlin();

        this.scriptListen("hiliteRequest", "hilite");
        this.scriptListen("unhiliteRequest", "unhilite");
        this.scriptListen("showHideRequest", "showHide");
        this.scriptListen("enterHiliteRequest", "enterHilite");
        this.scriptListen("leaveHiliteRequest", "leaveHilite");
    }

    hilite(p3d) {
        this.say("hilite", 0x081808);
        this.downTargetId = p3d.targetId;
    }

    unhilite(p3d) {
        console.log("onPointerUp")
        this.say("hilite", 0x000000);
    }

    enterHilite(p3d) {
        this.say("hilite", 0x181808);
    }
    leaveHilite(p3d) {
        this.say("hilite", 0x000000);
    }

    initPerlin() {
        let r = this.currentRow = this.rows = 20;
        let c = this.columns = 20;
        let d = this.delta = 0.1;

        this.data = [...Array(this.rows).keys()].map(i => {
            return [...Array(this.columns).keys()].map(j => {
                return this.call("PerlinNoise", "noise2D", i * d, j * d);
            });
        });
    }

    updatePerlin() {
        this.data.shift(); // dump the first row
        let d = this.delta;

        let row = [...Array(this.columns).keys()].map(i => {
            return this.call("PerlinNoise", "noise2D", this.currentRow * d, i * d);
        });
        this.data.push(row); 
        this.currentRow++;
        this.say("updatePerlin", row);
        this.future(100).call("PerlinActor", "updatePerlin");
    }

    showHide() {
        this.visible = !this.visible;
        this.say("showMe", this.visible);
    }
}
    
