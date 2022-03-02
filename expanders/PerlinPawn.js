class PerlinPawn {
    setup() {
        this.scriptListen("updatePerlin", "updatePerlin");
        this.scriptListen("showMe", "showMe");
        this.scriptListen("hilite", "hilite");
        this.isConstructed = false;

        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("pointerEnter", "onPointerEnter");
        this.addEventListener("pointerLeave", "onPointerLeave");
        this.addEventListener("click", "click");
        
        this.addEventListener("pointerMove", "_nop");

        this.maxHeight = 8;
        this.barScale = 0.25;

        if (this.perlinGroup) {
            this.shape.remove(this.perlinGroup);
            this.perlinGroup = null;
        }

        if (this.perlinGroup) {
            this.shape.remove(this.perlinGroup);
            this.perlinGroup = null;
        }

        if (this.buttonSphere) {
            this.shape.remove(this.buttonSphere);
            this.buttonSphere = null;
        }

        this.constructPerlin();
    }

    onPointerDown(p3d) {
        this.say("hiliteRequest", p3d);
    }
    onPointerUp(p3d) {
        this.say("unhiliterequest", p3d);
    }
    onPointerEnter(p3d) {
        this.say("enterHiliteRequest", p3d);
    }
    onPointerLeave(p3d) {
        this.say("leaveHiliteRequest", p3d);
    }

    click(p3d) {
        this.say("showHideRequest");
    }

    updatePerlin(row) {
        const r = this.actor.rows;
        const s = this.barScale;

        let rg = this.rowGeometry.shift();
        this.rowGeometry.push(rg);
        for(let i = 0; i < rg.children.length; i++) {
            this.setBar(rg.children[i], row[i], r, i);
        }
        for(let i = 0; i < r; i++) {
            this.rowGeometry[i].position.set(0, s / 4, (i - r / 2) * s);
        }
    }

    constructPerlin() {
        const data = this.actor.data;
        const r = this.actor.rows;
        const c = this.actor.columns;
        const s = this.barScale;

        this.perlinGroup = new WorldCore.THREE.Group();
       
        this.buttonSphere = new WorldCore.THREE.Mesh(
            new WorldCore.THREE.SphereGeometry(0.5,32,16), 
            new WorldCore.THREE.MeshStandardMaterial());
        this.buttonSphere.name = "buttonSphere";
        this.buttonSphere.position.y = 3;
        this.shape.add(this.buttonSphere);

        this.color = new WorldCore.THREE.Color();
        this.base = new WorldCore.THREE.Mesh(
            new WorldCore.THREE.BoxGeometry((r + 2) * s, s / 2, (c + 2) * s, 2, 10, 2),
            new WorldCore.THREE.MeshStandardMaterial({color: this.color.getHex()}));
        this.base.position.set(-s / 2, 0, -s / 2);
        this.bar = new WorldCore.THREE.Mesh(
            new WorldCore.THREE.BoxGeometry(s, s, s, 1, 10, 1 ),
            new WorldCore.THREE.MeshStandardMaterial({color: this.color.getHex()}));
        this.base.layers.enable(1); // use this for raycasting
        this.base.castShadow = true;
        this.base.receiveShadow = true;
        this.perlinGroup.add(this.base);

        this.rowGeometry = [];
        for(let i = 0; i < r; i++) {
            let rGroup = new WorldCore.THREE.Group();
            rGroup.position.set(0, s / 4, (i - r / 2) * s);
            for ( let j = 0; j < c; j++) {
                let bar = this.bar.clone();
                bar.material = bar.material.clone();
                let d = data[i][j];
                this.setBar(bar, d, r, j);
                rGroup.add(bar);
            }
            this.rowGeometry.push(rGroup);
            this.perlinGroup.add(rGroup);
        }
        this.shape.name = "perlin";
        this.isConstructed = true;
    }

    setBar(bar, d, rlength, j) {
        const s = this.barScale;
        //bar.material.color.setRGB((1-d)/2, 1-d*d, (1+d)/2);
        let b = Math.cos((1 - d) * Math.PI);
        b = Math.min(1, (b + 1) / 1.25);
        let g = Math.sin(d * Math.PI);
        g = (g + 1) / 2.2;
        let r = Math.cos(d * Math.PI);
        r = Math.min(1, (r + 1) / 1.25);

        bar.material.color.setRGB(r, g, b);
        d = d * this.maxHeight;
        bar.position.set((j - rlength / 2) * s, s * d / 2, 0);
        bar.scale.set(1, d, 1);
    }

    hilite(color) { 
        this.buttonSphere.material.emissive = new WorldCore.THREE.Color(color);
    }

    showMe(visible) {
        if (visible) {
            this.shape.add(this.perlinGroup);
        } else {
            this.shape.remove(this.perlinGroup);
        }
    }
}

/* globals WorldCore */
