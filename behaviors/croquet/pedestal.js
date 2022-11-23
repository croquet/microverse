class GizmoActor {
    setup() {
        let box = this.target.editBox;
        let scale = this.target.scale;
        this.isGizmoManipulator = true;
        this.editScale = Math.max(scale[0] * (box[3] - box[0]), scale[2] * (box[5] - box[2]));
        this.editFloor = scale[1] * box[1] - 0.1;
        this.addHorizontalDragGizmo();
        this.addVerticalDragGizmo();
        this.addSpinGizmo();
        this.addPropertySheetButton();
        this.subscribe(this.target.id, "translationSet", "translateTarget");
        this.subscribe(this.target.id, "rotationSet", "rotateTarget");
        this.subscribe(this.target.id, "scaleSet", "scaleTarget");
        this.subscribe(this.sessionId, "view-exit", "goodBye");
        this.listen("goodBye", "goodBye");
    }

    goodBye(viewId) {
        let avatar = [...this.service("ActorManager").actors].find(([_k, actor]) => {
            return actor.playerId === viewId;
        });
        if (avatar) {
            avatar = avatar[1];
        }
        if (!avatar) {return;}
        avatar.removeGizmo();
    }

    getScale(m) {
        let x = [m[0], m[1], m[2]];
        let y = [m[4], m[5], m[6]];
        let z = [m[8], m[9], m[10]];

        let length = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

        return [length(x), length(y), length(z)];
    }

    translateTarget() {
        //let t = Microverse.m4_getTranslation(this.actor.parent.target.global);
        //let s = this.target.parent ? this.getScale(this.target.parent.global) : [1, 1, 1];
        // this.set({translation: t}); //, scale: [1 / s[0], 1 / s[1], 1 / s[2]]});
        // this.target.set({translation:t});
    }

    rotateTarget() {
        // in this case, gizmo itself should not rotate but the gyro should rotate so the three rings
        // show the euler angle of them in a sane way.
        //let r = this.target.rotation;

        // this.set({rotation: r});
        /*
        if (this.gizmoMode === "move") {
            this.set({rotation: [0, 0, 0, 1]});
        } else {
            let r = this.target.rotation;
            this.set({rotation: r});
        }*/
    }

    scaleTarget() {}

    closestCorner(creatorId) {
        let avatar = [...this.service("ActorManager").actors].find(([_k, actor]) => {
            return actor.playerId === creatorId;
        });
        if (avatar) {
            avatar = avatar[1];
        }
        if (!avatar) {return;}
        let {m4_identity, v3_transform, v3_magnitude, v3_sub, v3_add} = Microverse;
        let target = this.target;
        let parentGlobal = target._parent ? target._parent.global : m4_identity();
        let t = target.translation;
        let g = v3_transform(t, parentGlobal);

        let a = avatar.translation;

        let offsets = [
            [ 2,  1,  2],
            [-2,  1,  2],
            [ 2, -1,  2],
            [-2, -1,  2],
            [ 2,  1, -2],
            [-2,  1, -2],
            [ 2, -1, -2],
            [-2, -1, -2]
        ];

        let locals = offsets.map((o) => v3_add(t, o));
        let parents = locals.map((l) => v3_transform(l, parentGlobal));

        let dist = Number.MAX_VALUE;
        let min = -1;

        for (let i = 0; i < parents.length; i++) {
            let thisDist = v3_magnitude(v3_sub(a, parents[i]));
            if (thisDist <= dist && parents[i][1] > g[1]) {
                dist = thisDist;
                min = i;
            }
        }

        return offsets[min];
    }

    addHorizontalDragGizmo(){
        if(this.horzGizmo)this.horzGizmo.destroy();

        let dotCircle = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBkPSJNMjU2IDhDMTE5LjAzMyA4IDggMTE5LjAzMyA4IDI1NnMxMTEuMDMzIDI0OCAyNDggMjQ4IDI0OC0xMTEuMDMzIDI0OC0yNDhTMzkyLjk2NyA4IDI1NiA4em04MCAyNDhjMCA0NC4xMTItMzUuODg4IDgwLTgwIDgwcy04MC0zNS44ODgtODAtODAgMzUuODg4LTgwIDgwLTgwIDgwIDM1Ljg4OCA4MCA4MHoiLz48L3N2Zz4=";

        this.poseGizmo = this.createCard({
            name: "drag horizontal gizmo",
            dataLocation: dotCircle,
            fileName:`./assets/SVG/dot-circle.svg`,
            modelType: 'svg',
            shadow:true,
            singleSided: true,
            scale:[1,1,0.25],
            rotation:[Math.PI / 2, 0, 0],
            translation:[0, this.editFloor - 0.5, 0],
            type:'2d',
            fullBright: false,
            behaviorModules: ["PoseGizmo"],
            parent: this,
            noSave: true,
            action: 'dragHorizontal',
            plane: [0,1,0],
            color: 0x88ff88,
            frameColor: 0xaaaaaa
        });
    }

    addVerticalDragGizmo(){
        if(this.vertGizmo)this.vertGizmo.destroy();
        this.vertGizmo = this.createCard({
            name: "drag vertical gizmo",
            //dataLocation:`./assets/SVG/arrows-alt.svg`,
            //fileName:`./assets/SVG/arrows-alt.svg`,
            //modelType: 'svg',
            radius: 0.25,
            shadow:true,
            singleSided: true,
            //scale:[1,1,0.25],
            //rotation:[0, Math.PI/2, 0 ],
            translation:[0, this.editFloor - 0.25, 0],
            type:'object',
            fullBright: false,
            behaviorModules: ["PoseGizmo"],
            parent: this,
            noSave: true,
            action: 'dragVertical',
            color: 0xffff88,
            plane: [0,0,1]
        });
    }

    addSpinGizmo(){
        if (this.spinGizmo) this.spinGizmo.destroy();
        let cog = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODg4cHgiIGhlaWdodD0iODg4cHgiIHZpZXdCb3g9IjAgMCA4ODggODg4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPCEtLSBHZW5lcmF0b3I6IFNrZXRjaCA1My4xICg3MjYzMSkgLSBodHRwczovL3NrZXRjaGFwcC5jb20gLS0+CiAgICA8dGl0bGU+U2hhcGU8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iUGFnZS0xIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8cGF0aCBkPSJNNDgzLjE5MTg3Nyw4ODYuMjk0MDA5IEw1NDAuMjU2NDQ1LDgwNS4xMTg1NyBMNjMwLjU1NzY5Myw4NDcuMDIyMjgzIEM2NTQuNTE2OTkzLDgzNS45MTI5NDkgNjc3LjMxOTA4Nyw4MjIuNzI5OTcxIDY5OC43MzM1NTYsODA3LjcwMzc2OCBMNzA3LjYyODE1LDcwOC40MTQ4NTIgTDgwNy4xODA4MTQsNjk5LjQ3NzIyNCBDODIyLjEzOTAwNyw2NzguMjUxOTk0IDgzNS4yODM1ODMsNjU1LjY1NjgyIDg0Ni4zODkxNjUsNjMxLjkxNzA3OCBMODA0LjIyNjkzMSw1NDAuODYxMzg5IEw4ODYuMzA3NzAzLDQ4My4wMzQ5ODYgQzg4Ny40MjgwNjMsNDcwLjE3MjU4MiA4ODgsNDU3LjE1MzA4MyA4ODgsNDQ0IEM4ODgsNDMwLjk0ODg0NCA4ODcuNDM2ODkzLDQxOC4wMjkyMDggODg2LjMzMzY3OSw0MDUuMjY0MDg1IEw4MDQuMTY5MjIyLDM0Ny4zNTM5OTUgTDg0Ni4zODg3OTEsMjU2LjA4MjEyMyBDODM1LjMyNjI4MywyMzIuNDM0NTggODIyLjI0MDU4NSwyMDkuOTIyNzM2IDgwNy4zNTQ0NjEsMTg4Ljc2OTM1MyBMNzA3LjQ3MDQ4NiwxNzkuNzQyODIgTDY5OC40ODczNjYsODAuMTIzNjA3OSBDNjc3LjE0NDQxOCw2NS4xNjkwOTIyIDY1NC40MjUzNDEsNTIuMDQ0NTcgNjMwLjU1NzkxNSw0MC45Nzc4MTk5IEw1NDAuMDQxMDcyLDgyLjkzOTE0MjUgTDQ4Mi44OTMxNjEsMS42Nzk5NjYzIEM0NzAuMDc2ODgsMC41Njc3NDAyOTkgNDU3LjEwNDc0MSwwIDQ0NCwwIEM0MzAuNDI5NzUyLDAgNDE3LjAwMTY5NCwwLjYwODc5MTI2NiA0MDMuNzQxNjQ5LDEuODAwNTUxOTcgTDM0Ni43NDM1NTUsODIuODgxNDMwNSBMMjU2Ljk0MjUxNyw0MS4yMDk4MzYxIEMyMzIuNzY3NjYsNTIuNDU1Nzc0OCAyMDkuNzc0MTQ2LDY1LjgxNDA0NTUgMTg4LjE5OTE0NSw4MS4wNDc0NzYzIEwxNzkuMzcxODUsMTc5LjU4NTE0OCBMODAuODg2NzQ5MywxODguNDI2OTMzIEM2NS42NzQ2MjE1LDIxMC4wMDA0MTkgNTIuMzM2NDkwOCwyMzIuOTkwMDc1IDQxLjEwOTE1MDcsMjU3LjE1OTEwOSBMODIuNzczMDY5NCwzNDcuMTM4NjExIEwxLjc1ODM1NDQ0LDQwNC4yMTM5NzEgQzAuNTk0NDIyNTAzLDQxNy4zMjA1MzcgMCw0MzAuNTkwODUxIDAsNDQ0IEMwLDQ1Ny4zMDcxNiAwLjU4NTQxNDY3MSw0NzAuNDc3NTkgMS43MzE4OTUwOSw0ODMuNDg2OTQgTDgyLjgzMDc3ODQsNTQwLjY0NjAwNSBMNDEuMTA5MjcwNiw2MzAuODQxMTUgQzUyLjI5MzkzNzEsNjU0LjkxODI3OSA2NS41NzMzNzI1LDY3Ny44MjQ5ODIgODAuNzEzNDc0MSw2OTkuMzI3MTU2IEwxNzkuNTI5NTE0LDcwOC4yNTcxOCBMMTg4LjQ0NDk2NSw4MDcuMTI1OTY1IEMyMDkuOTQ4NzgzLDgyMi4yODczNzIgMjMyLjg1OTQ3MSw4MzUuNTg2OTM3IDI1Ni45NDI1NDgsODQ2Ljc5MDE3OCBMMzQ2Ljk1ODkyOCw4MDUuMDYwODU4IEw0MDQuMDQwODc2LDg4Ni4yMjYyNCBDNDE3LjIwMzY5NSw4ODcuNDAwMzMyIDQzMC41MzE4MTgsODg4IDQ0NCw4ODggQzQ1Ny4yMDY1NjQsODg4IDQ3MC4yNzg0NTcsODg3LjQyMzQwMyA0ODMuMTkxODc3LDg4Ni4yOTQwMDkgWiBNNDQzLjk0NDUwOSw3MTcuMzQ4MiBDMjkzLjcyMzA1Nyw3MTcuMzQ4MiAxNzEuOTQ0NTA5LDU5NS4zNzE4OTMgMTcxLjk0NDUwOSw0NDQuOTA2NDkzIEMxNzEuOTQ0NTA5LDI5NC40NDEwOTMgMjkzLjcyMzA1NywxNzIuNDY0Nzg2IDQ0My45NDQ1MDksMTcyLjQ2NDc4NiBDNTk0LjE2NTk2MSwxNzIuNDY0Nzg2IDcxNS45NDQ1MDksMjk0LjQ0MTA5MyA3MTUuOTQ0NTA5LDQ0NC45MDY0OTMgQzcxNS45NDQ1MDksNTk1LjM3MTg5MyA1OTQuMTY1OTYxLDcxNy4zNDgyIDQ0My45NDQ1MDksNzE3LjM0ODIgWiIgaWQ9IlNoYXBlIiBmaWxsPSIjM0YzRjNGIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjwvcGF0aD4KICAgIDwvZz4KPC9zdmc+";
        
        this.vspinGizmo = this.createCard({
            name: "spin horizontal gizmo",
            dataLocation: cog,
            fileName: "./assets/SVG/cog.svg",
            modelType: "svg",
            shadow:true,
            singleSided: true,
            scale: [2,2,0.25],
            rotation: [Math.PI / 2, 0, 0 ],
            translation: [0, this.editFloor - 0.5, 0],
            type: '2d',
            fullBright: false,
            behaviorModules: ["PoseGizmo"],
            parent: this,
            noSave: true,
            action: "spinHorizontal",
            plane: [0,0,1],
            color: 0x8888ff,
            frameColor: 0xaaaaaa
        });
    }

    addPropertySheetButton() {
        if (this.propertySheetButton) {
            this.propertySheetButton.destroy();
        }

        //        let t = this.closestCorner(this.creatorId);

        this.dataLocation = "3ryPlwPIvSHXjABwnuJjrMQYPp1JH2OnghLGR_cdAbCEGgYGAgFIXV0UGx4XAVwHAVwRAB0DBxcGXBsdXQddNRYkEAseOwEzGSMRMCoWQTUKEwQLBSc5JSsrQF0bHVwRAB0DBxcGXB8bEQAdBBcAARddBRckQ0E8AEUcRwABPTExOhMCHEMeNENFIAglOitFNBg0OjNGPiYQIl81Sl0WEwYTXUMeCgYrHDc7HkECPScbJxYKOSE6RCgXK0YgFwYgCzAYPioRCkEkAEYVLRU";

        this.propertySheetButton = this.createCard({
            name: "property sheet button",
            dataLocation: this.dataLocation,
            fileName: "/prop-plain.svg",
            modelType: "svg",
            shadow: true,
            singleSided: true,
            scale: [0.25, 0.25, 0.25],
            type: "2d",
            fullBright: true,
            behaviorModules: ["GizmoPropertySheetButton", "Billboard"],
            noSave: true,
            translation:[1.25, this.editFloor - 0.25, 0],
            parent: this
        });

        this.subscribe(this.propertySheetButton.id, "openPropertySheet", "openPropertySheet");
    }

    openPropertySheet(toWhom) {
        console.log(toWhom);
        this.target.showControls(toWhom);
    }

    teardown() {
        if (this.target) {
            this.target.sayUnselectEdit();
        }
    }
}

class GizmoPawn {
    setup() {
        this.lastTime = this.now();
        if (!this.interval) {
            this.interval = setInterval(() => this.checkInteraction(), 1000);
        }

        let assetManager = this.service("AssetManager").assetManager;
        let dataLocation = this.actor.dataLocation;
        this.getBuffer(dataLocation).then((buffer) => {
            assetManager.setCache(dataLocation, buffer, "global");
        });

        this.subscribe(this.id, "interaction", "interaction");
    }

    checkInteraction() {
        let now = this.now();
        if (now - this.lastTime > 15000) {
            if (this.interval) {
                clearInterval(this.interval);
            }
            this.say("goodBye", this.viewId);
        }
    }

    interaction() {
        this.lastTime = this.now();
    }

    forceOnTop(obj3d) {
        obj3d.traverse((obj) => {
            if (obj.geometry) {
                obj.renderOrder = 10000; // draw last
                let m = obj.material;
                let mat;
                mat = Array.isArray(m) ? m : [m];
                mat.forEach(m => {
                    m.opacity = 0.9999;
                    m.transparent = true;
                    m.depthTest = false;
                    m.depthWrite = false;
                });
            }
        });
    }
}

class GizmoPropertySheetButtonPawn {
    setup() {
        let isMine = this.parent?.actor.creatorId === this.viewId;

        this.subscribe(this.id, "2dModelLoaded", "svgLoaded");
        this.parent.call("Gizmo$GizmoPawn", "forceOnTop", this.shape);
        if (isMine) {
            this.addEventListener("pointerMove", "nop");
            this.addEventListener("pointerEnter", "hilite");
            this.addEventListener("pointerLeave", "unhilite");
            this.addEventListener("pointerTap", "openPropertySheet");
            // effectively prevent propagation
            this.addEventListener("pointerDown", "nop");
            this.addEventListener("pointerUp", "nop");
        }
    }

    svgLoaded() {
        if (this.shape.children[0]) {
            this.parent.call("Gizmo$GizmoPawn", "forceOnTop", this.shape.children[0]);
        }
    }

    setColor() {
        let svg = this.shape.children[0];
        let backdrop;
        if (svg) {
            backdrop = svg.children[0];
        }
        let baseColor = this.entered ? 0x888888 : 0x4a4a4a;
        if (backdrop.material && backdrop.material[0]) {
            backdrop.material && backdrop.material[0].color.setHex(baseColor);
        }
    }

    hilite() {
        this.entered = true;
        this.setColor();
        this.publish(this.parent.id, "interaction");
    }

    unhilite() {
        this.entered = false;
        this.setColor();
        this.publish(this.parent.id, "interaction");
    }

    openPropertySheet(event) {
        let avatar = Microverse.GetPawn(event.avatarId);
        this.publish(this.actor.id, "openPropertySheet", {avatar: event.avatarId, distance: avatar.targetDistance});
        this.destroy();
    }
}

class PoseGizmoActor {
    setup() {
        console.log("PoseGizmo", this.id);
        this.isGizmoManipulator = true;

        if (this._cardData.action === "dragHorizontal" || this._cardData.action === "dragVertical") {
            this.subscribe(this.parent.id, "translateTarget" + this.id, "translateTarget");
        } else if (this._cardData.action === "spinHorizontal") {
            this.subscribe(this.parent.id, "spinTarget" + this.id, "spinTarget");
        }
        this.baseRotation = [...this.parent.target.rotation];
    }

    translateTarget(translation) {
        let target = this.parent.target;
        if(target.parent){
            let mInverse = Microverse.m4_invert(target.parent.global);
            let t = Microverse.v3_transform(translation, mInverse);
            target.set({translation: t});

        }else target.set({translation: translation});
        this.parent.set({translation: translation});
    }

    q_toAxisAngle(quat) {
        let q = Microverse.q_normalize(quat);
        let angle = 2 * Math.acos(q[3]);
        let axis = [];
        let s = Math.sqrt( 1 - q[3] * q[3]);
        // assuming quaternion normalised then w is less than 1, so term always positive.
        if (s < 0.001) { // test to avoid divide by zero, s is always positive due to sqrt
            // if s is close to zero then direction of axis not important
            axis[0] = 0;
            axis[1] = 1;
            axis[2] = 0;
        } else {
            axis[0] = q[0] / s; // normalise axis
            axis[1] = q[1] / s;
            axis[2] = q[2] / s;
        }
        return {axis: axis, angle:angle};
    }

    spinTarget(rotation){
        let target = this.parent.target;
        let r;
        if(target.parent){
            // compute the axis of the rotation so we can transform that into the target frame
            let axisAngle = this.q_toAxisAngle(rotation);
            let mNormal = Microverse.m4_toNormal4(target.parent.global);
            let mInverse = Microverse.m4_invert(mNormal);
            let axis = Microverse.v3_transform(axisAngle.axis, mInverse);
            axis = Microverse.v3_normalize(axis);
            // axis is now in the frame of the target object - the rest is easy
            let r = Microverse.q_axisAngle(axis, axisAngle.angle);
            r = Microverse.q_multiply(this.baseRotation, r);
            target.set({rotation: r});

        }else {
            r = Microverse.q_multiply(this.baseRotation, rotation);
            target.set({rotation: r});
        }
        this.parent.set({rotation: rotation});
    }
}

class PoseGizmoPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;
        this.action = this.actor._cardData.action;
        this.plane = this.actor._cardData.plane;
        let isMine = this.parent?.actor.creatorId === this.viewId;
        let THREE = Microverse.THREE;
        this.baseVector = new THREE.Vector3();
        this.vec = new THREE.Vector3();
        this.vec2 = new THREE.Vector3();
        this.toVector = new THREE.Vector3();

        this.deltaYaw = 0;
        this.newRotation = Microverse.q_euler(0, this.deltaYaw, 0);

        if (isMine) {
            if (this.action === "spinHorizontal") {
                console.log("spin horizontal pose")
                this.addEventListener("pointerDown", "startDrag");
                this.addEventListener("pointerMove", "hSpin");
                this.addEventListener("pointerUp", "endDrag");
            }else if (this.action === "dragHorizontal") {
                console.log("drag horizontal pose")
                this.addEventListener("pointerDown", "startDrag");
                this.addEventListener("pointerMove", "drag");
                this.addEventListener("pointerUp", "endDrag");
            } else if (this.action === "dragVertical") {
                console.log("drag pose")
                this.addEventListener("pointerDown", "startVDrag");
                this.addEventListener("pointerMove", "drag");
                this.addEventListener("pointerUp", "endDrag");
            }
            this.addEventListener("pointerEnter", "pointerEnter");
            this.addEventListener("pointerLeave", "pointerLeave");
        }

        if (this.actor._cardData.radius) {
            this.makeSphere(this.actor._cardData.radius, this.actor._cardData.color);
        } else {
            this.subscribe(this.id, "2dModelLoaded", "modelLoaded");
        }
    }

    makeSphere(radius, color) {
        const geometry = new Microverse.THREE.SphereGeometry(radius, 32, 16);
        const material = new Microverse.THREE.MeshStandardMaterial({color: color || 0xffff00});
        this.gizmo3d = new Microverse.THREE.Mesh(geometry, material);
        this.shape.add(this.gizmo3d);
        this.constructOutline(10001);
    }

    modelLoaded(){
        console.log("modelLoaded")
        this.gizmo3d = this.shape.children[0];
        this.constructOutline(10000);
    }

    constructOutline(renderOrder){

        let outlineMat = new Microverse.THREE.MeshStandardMaterial({
            color: 0x444444,
            opacity: 0.25,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            // side: THREE.BackSide,
        });
        /*
        // leaving this here because it would be nice to make it work
        outlineMat.onBeforeCompile = (shader) => {
            const token = '#include <begin_vertex>';
            const customTransform = 'vec3 transformed = position + objectNormal*0.02;';
            shader.vertexShader =
                shader.vertexShader.replace(token,customTransform)
        }
        */
        this.outline3d = this.gizmo3d.clone(true);
        this.outline3d.traverse((m) => {
            if (m.material) {
                m.material = outlineMat;
                if (!Array.isArray(m.material)) {
                    console.log("single material")
                    m.material = outlineMat;
                } else {
                    console.log("multiple material", m.material.length);
                    let mArray = m.material.map((_m) => outlineMat);
                    m.material = mArray;
                }
            }
        });
        this.outline3d.renderOrder = renderOrder;
        console.log(this.outline3d);
        this.shape.add(this.outline3d);
    }

    makeRay(r) {
        let origin = new Microverse.THREE.Vector3(...r.origin);
        let direction = new Microverse.THREE.Vector3(...r.direction);
        return new Microverse.THREE.Ray(origin, direction);
    }

    startDrag(pEvt) {
        // initiate drag for horizontal drag and for rotation around Y
        let THREE = Microverse.THREE;
        let avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.baseVector.set(...pEvt.xyz);
        this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.baseVector.y);
        this.targetStartVector = new THREE.Vector3(...Microverse.m4_getTranslation(this.actor.parent.target.global));
        this.startRotation = this.newRotation;
        this.publish(this.parent.id, "interaction");
    }

    startVDrag(pEvt) {
        // initiate drag for vertical using avatar's look direction to define plane
        let THREE = Microverse.THREE;
        let avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.baseVector.set(...pEvt.xyz);
        let lookNorm = avatar.actor.lookNormal;
        this.vec.copy(this.baseVector);
        this.vec.normalize();
        this.vec2.set(...lookNorm);
        let cos = this.vec2.dot(this.vec);
        this.plane = new THREE.Plane( this.vec2, -cos * this.baseVector.length());
        this.targetStartVector = new THREE.Vector3(...Microverse.m4_getTranslation(this.actor.parent.target.global));
        this.publish(this.parent.id, "interaction");
    }

    drag(pEvt) {
        let ray = this.makeRay(pEvt.ray);
        let intersectionPoint = ray.intersectPlane( this.plane, this.toVector );
        if(!intersectionPoint)return; // not touching the plane...
        this.vec.copy( this.toVector );
        this.vec.sub( this.baseVector );
        this.vec.add(this.targetStartVector);
        this.publish(this.parent.actor.id, "translateTarget" + this.actor.id, this.vec.toArray());
        this.publish(this.parent.id, "interaction");
    }

    endDrag(pEvt){
        const avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.removeFirstResponder("pointerMove", {}, this);
        this.publish(this.parent.id, "interaction");
    }

    hSpin(pEvt) {
        this.vec.set(0, 1, 0);
        // make a horizontal plane through where we think the widget is (either
        // the point reported in the pointerDown pEvt, or the last point of
        // contact on pointerMove)
        //this.plane = new THREE.Plane(this.vec, -this.dragVector.y);
        // toVector gets the point where the laser intercepts that plane
        let ray = this.makeRay(pEvt.ray);
        let intersectPoint = ray.intersectPlane( this.plane, this.toVector );
        // vec is now given the world position of the centre of the rotator
        //this.getWorldPosition(this.vec);
        if(!intersectPoint)return;

        // angle is an angular delta, which will be used as a constant angular
        // step until it is reset by another onPointerMove, or until cancelled
        // by a click.

        this.angle = this.computeAngle(this.targetStartVector, this.baseVector, this.toVector);

        // then dragVector takes the most recent value of toVector
        // this.dragVector.copy(this.toVector);
        // ESLint complained about isNaN.  See https://stackoverflow.com/questions/46677774/eslint-unexpected-use-of-isnan
        if (Number.isNaN(this.angle)) { console.log(this.vec, this.dragVector, this.toVector); this.angle = 0; return false;}
        let axisAngle = Microverse.q_axisAngle([0,1,0], this.angle);
        //let targetAngle = Microverse.q_euler(0,this.targetStartAngle+this.angle,0);
        const nextRotation = Microverse.q_multiply( this.startRotation, axisAngle);
        this.publish(this.parent.actor.id, "spinTarget" + this.actor.id, nextRotation);
        this.publish(this.parent.id, "interaction");
        this.newRotation = nextRotation; // prep for next startDrag
        return true;
    }

    computeAngle(c, v1, v2) {
        let THREE = Microverse.THREE;
        // c = vec (position of centre); v1 = dragVector (previous used point in this drag, or pointer-down location); v2 = toVector (current hit position)
        c = new THREE.Vector3().copy(c); // take copies that can be mutated
        v1 = new THREE.Vector3().copy(v1);
        v2 = new THREE.Vector3().copy(v2);
        let test = new THREE.Vector3().copy(v1);
        test.sub(v2);
        if(test.length() < 0.0000000001) return 0;
        c.y = v1.y = v2.y = 0; // don't want the y
        v1.sub(c); // vector from center to previous hit point
        if (v1.length() === 0) return 0; // don't die if we are in the center
        v1.normalize();
        v2.sub(c); // vector from center to new hit point
        if (v2.length() === 0) return 0;
        v2.normalize();
        let angle = Math.acos(v1.dot(v2)); // how far the hit point has rotated
        let sign = Math.sign(v1.cross(v2).y); // whether a clockwise (+ve y) or anticlockwise rotation
        return angle * sign;
    }

    pointerEnter() {
        console.log("pointerEnter")
        let hilite = this.actor._cardData.hiliteColor || 0xffaaa;
        this.doHilite(hilite); // hilite in yellow
    }

    pointerLeave() {
        console.log("pointerLeave")
        this.doHilite(null);
    }

    doHilite(hval) {
        this.shape.traverse((m) => {
            if (m.material) {
                if (!Array.isArray(m.material)) {
                    this.setColor(m.material, hval);
                } else {
                    m.material.forEach((mm) => this.setColor(mm, hval));
                }
            }
        });
    }

    setColor(material, color){
        if(color){
            if(material.saveColor)return;
            let c =  new Microverse.THREE.Color(color);
            material.saveColor = material.color;
            material.color = c;
        }else{
            material.color = material.saveColor;
            delete material.saveColor;
        }
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
            name: "GizmoPropertySheetButton",
            pawnBehaviors: [GizmoPropertySheetButtonPawn],
        },
        {
            name: "PoseGizmo",
            actorBehaviors: [PoseGizmoActor],
            pawnBehaviors: [PoseGizmoPawn],
        }
    ]
}

/* globals Microverse */
