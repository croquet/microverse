// To do:
// Add drag in plane
// Add scale
// Add display of values
// Add double click to set angle to 0
// Add detents on rotation

class GizmoActor {
    setup() {
        this.fixWorldcore();
        let box = this.target.editBox;
        let scale = this.target.scale;
        this.isGizmoManipulator = true;
        this.editScale = Math.max(scale[0] * (box[3] - box[0]), scale[2] * (box[5] - box[2]));
        this.editFloor = scale[1] * box[1] - 0.1;
        this.addHorizontalDragGizmo();
        this.addVerticalDragGizmo();
        this.addSpinGizmo();
        this.addStandardGizmo();
        this.addPropertySheetButton();
        this.addInfoCard();
        this.subscribe(this.target.id, "translationSet", "translateTarget");
        this.subscribe(this.target.id, "rotationSet", "rotateTarget");
        this.subscribe(this.target.id, "scaleSet", "scaleTarget");
        this.subscribe(this.sessionId, "view-exit", "goodBye");
        this.listen("goodBye", "goodBye");
    }

    fixWorldcore(){
            // This is a fix for Worldcore
        Window.m4_getRotation = function(m) {
            const s0 = Microverse.v3_magnitude([m[0], m[4], m[8]]);
            const s1 = Microverse.v3_magnitude([m[1], m[5], m[9]]);
            const s2 = Microverse.v3_magnitude([m[2], m[6], m[10]]);
        
            const m00 = m[0] / s0;
            const m01 = m[1] / s1;
            const m02 = m[2] / s2;
        
            const m10 = m[4] / s0;
            const m11 = m[5] / s1;
            const m12 = m[6] / s2;
        
            const m20 = m[8] / s0;
            const m21 = m[9] / s1;
            const m22 = m[10] / s2;
        
            let t;
            let x;
            let y;
            let z;
            let w;
        
            if (m22 < 0) {
                if (m00 > m11) {
                    t = 1 + m00 - m11 - m22;
                    x = t;
                    y = m01+m10;
                    z = m20+m02;
                    w = m12-m21;
                } else {
                    t = 1 - m00 + m11 - m22;
                    x = m01+m10;
                    y = t;
                    z = m12+m21;
                    w = m20-m02;
                }
            } else {
                if (m00 < -m11) {
                    t = 1 - m00 - m11 + m22;
                    x = m20+m02;
                    y = m12+m21;
                    z = t;
                    w = m01-m10;
                } else {
                    t = 1 + m00 + m11 + m22;
                    x = m12-m21;
                    y = m20-m02;
                    z = m01-m10;
                    w = t;
                }
            }
        
            const f = 0.5 / Math.sqrt(t);
            return [f*x, f*y, f*z, f*w];
        }

        Window.m4_toNormal4 = function(m4){
            let q = Window.m4_getRotation(m4);
            return Microverse.m4_rotationQ(q);
        }

        Window.q_toAxisAngle = function(quat) {
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
        let t = Microverse.m4_getTranslation(this.target.global);
        this.set({translation:t});
        this.standardGizmo.set({translation:t});
        let s = `${t[0].toFixed(2)}, ${t[1].toFixed(2)}, ${t[2].toFixed(2)}`;
        this.setInfo(s);
    }

    rotateTarget() {
        let rotation = this.target.rotation;
        this.standardGizmo.set({rotation: rotation});
        let y = Microverse.q_yaw(rotation)*180/Math.PI;
        let p = Microverse.q_pitch(rotation)*180/Math.PI;
        let r = Microverse.q_roll(rotation)*180/Math.PI;
        let s = `${y.toFixed(2)}, ${p.toFixed(2)}, ${r.toFixed(2)}`;
        this.setInfo(s);
    }

    scaleTarget() {
        console.log("scaleTarget")
        this.setInfo("scale")
    }

    addStandardGizmo(){
        this.standardGizmo = this.createCard({
            translation: Microverse.m4_getTranslation(this.target.global),
            rotation: Window.m4_getRotation(this.target.global),
            name: 'standardGizmo',
            behaviorModules: ["StandardGizmo"],
            type: "object",
            noSave: true,
        });
        this.standardGizmo.target = this.target;
        this.standardGizmo.creatorId = this.creatorId;
    }

    addInfoCard() {
        if (!this.infoCard) {
            const TEXT_SCALE = 0.0025; // 100px of text scales to 0.5 world units
            const PADDING = 0.05; // horizontal and vertical
            const MARGIN_FUDGE = 0.02; // compensate for text widget's small gap at the left
            const marginLeft = (PADDING - MARGIN_FUDGE) / TEXT_SCALE;
            const marginTop = PADDING * 1.1 / TEXT_SCALE;
            const options = {
                name: 'info',
                behaviorModules: ["Billboard"],
                //translation: [0, 1, -0.1], // above and slightly in front
                translation: [-1.25, this.editFloor - 0.25, 0],
                type: "text",
                depth: 0.02,
                margins: { left: marginLeft, top: marginTop },
                backgroundColor: 0x300079,
                frameColor: 0x400089,
                fullBright: true,
                opacity: 0.8,
                runs: [],
                width: 0.1,
                height: 0.1,
                textScale: TEXT_SCALE,
                readOnly: true,
                noDismissButton: true,
                noSave: true,
                avatarParts: true,
                parent: this
            };
            this.infoCard = this.createCard(options);
        }


    }

    setInfo(info){
        const TEXT_SCALE = 0.0025; // 100px of text scales to 0.5 world units
        const PADDING = 0.05; // horizontal and vertical
        const measurement = this.getTextFieldActorClass().defaultMeasurement(info);
        const signWidth = Math.min(measurement.width * TEXT_SCALE + 2 * PADDING, 2);
        const signHeight = Math.min(measurement.height * TEXT_SCALE + 2 * PADDING, 0.2);
        this.infoCard.load([{text: info, style: {color: 'white'}}]);
        this.infoCard.setExtent({width: signWidth / TEXT_SCALE, height: signHeight / TEXT_SCALE});
    }

    addHorizontalDragGizmo(){
        if(this.horzGizmo)this.horzGizmo.destroy();

        let dotCircle = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBkPSJNMjU2IDhDMTE5LjAzMyA4IDggMTE5LjAzMyA4IDI1NnMxMTEuMDMzIDI0OCAyNDggMjQ4IDI0OC0xMTEuMDMzIDI0OC0yNDhTMzkyLjk2NyA4IDI1NiA4em04MCAyNDhjMCA0NC4xMTItMzUuODg4IDgwLTgwIDgwcy04MC0zNS44ODgtODAtODAgMzUuODg4LTgwIDgwLTgwIDgwIDM1Ljg4OCA4MCA4MHoiLz48L3N2Zz4=";

        this.horzGizmo = this.createCard({
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
            axis: [0,1,0],
            color: 0x88ff88,
            frameColor: 0xaaaaaa
        });
    }

    addVerticalDragGizmo(){
        if(this.vertGizmo)this.vertGizmo.destroy();
        this.vertGizmo = this.createCard({
            name: "drag vertical gizmo",
            radius: 0.25,
            shadow:true,
            singleSided: true,
            translation:[0, this.editFloor - 0.25, 0],
            type:'object',
            fullBright: false,
            behaviorModules: ["PoseGizmo"],
            parent: this,
            noSave: true,
            action: 'dragVertical',
            color: 0xffff88,
            axis: [0,0,1]
        });
    }

    addSpinGizmo(){
        if (this.spinGizmo) this.spinGizmo.destroy();
        let cog = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODg4cHgiIGhlaWdodD0iODg4cHgiIHZpZXdCb3g9IjAgMCA4ODggODg4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPCEtLSBHZW5lcmF0b3I6IFNrZXRjaCA1My4xICg3MjYzMSkgLSBodHRwczovL3NrZXRjaGFwcC5jb20gLS0+CiAgICA8dGl0bGU+U2hhcGU8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iUGFnZS0xIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8cGF0aCBkPSJNNDgzLjE5MTg3Nyw4ODYuMjk0MDA5IEw1NDAuMjU2NDQ1LDgwNS4xMTg1NyBMNjMwLjU1NzY5Myw4NDcuMDIyMjgzIEM2NTQuNTE2OTkzLDgzNS45MTI5NDkgNjc3LjMxOTA4Nyw4MjIuNzI5OTcxIDY5OC43MzM1NTYsODA3LjcwMzc2OCBMNzA3LjYyODE1LDcwOC40MTQ4NTIgTDgwNy4xODA4MTQsNjk5LjQ3NzIyNCBDODIyLjEzOTAwNyw2NzguMjUxOTk0IDgzNS4yODM1ODMsNjU1LjY1NjgyIDg0Ni4zODkxNjUsNjMxLjkxNzA3OCBMODA0LjIyNjkzMSw1NDAuODYxMzg5IEw4ODYuMzA3NzAzLDQ4My4wMzQ5ODYgQzg4Ny40MjgwNjMsNDcwLjE3MjU4MiA4ODgsNDU3LjE1MzA4MyA4ODgsNDQ0IEM4ODgsNDMwLjk0ODg0NCA4ODcuNDM2ODkzLDQxOC4wMjkyMDggODg2LjMzMzY3OSw0MDUuMjY0MDg1IEw4MDQuMTY5MjIyLDM0Ny4zNTM5OTUgTDg0Ni4zODg3OTEsMjU2LjA4MjEyMyBDODM1LjMyNjI4MywyMzIuNDM0NTggODIyLjI0MDU4NSwyMDkuOTIyNzM2IDgwNy4zNTQ0NjEsMTg4Ljc2OTM1MyBMNzA3LjQ3MDQ4NiwxNzkuNzQyODIgTDY5OC40ODczNjYsODAuMTIzNjA3OSBDNjc3LjE0NDQxOCw2NS4xNjkwOTIyIDY1NC40MjUzNDEsNTIuMDQ0NTcgNjMwLjU1NzkxNSw0MC45Nzc4MTk5IEw1NDAuMDQxMDcyLDgyLjkzOTE0MjUgTDQ4Mi44OTMxNjEsMS42Nzk5NjYzIEM0NzAuMDc2ODgsMC41Njc3NDAyOTkgNDU3LjEwNDc0MSwwIDQ0NCwwIEM0MzAuNDI5NzUyLDAgNDE3LjAwMTY5NCwwLjYwODc5MTI2NiA0MDMuNzQxNjQ5LDEuODAwNTUxOTcgTDM0Ni43NDM1NTUsODIuODgxNDMwNSBMMjU2Ljk0MjUxNyw0MS4yMDk4MzYxIEMyMzIuNzY3NjYsNTIuNDU1Nzc0OCAyMDkuNzc0MTQ2LDY1LjgxNDA0NTUgMTg4LjE5OTE0NSw4MS4wNDc0NzYzIEwxNzkuMzcxODUsMTc5LjU4NTE0OCBMODAuODg2NzQ5MywxODguNDI2OTMzIEM2NS42NzQ2MjE1LDIxMC4wMDA0MTkgNTIuMzM2NDkwOCwyMzIuOTkwMDc1IDQxLjEwOTE1MDcsMjU3LjE1OTEwOSBMODIuNzczMDY5NCwzNDcuMTM4NjExIEwxLjc1ODM1NDQ0LDQwNC4yMTM5NzEgQzAuNTk0NDIyNTAzLDQxNy4zMjA1MzcgMCw0MzAuNTkwODUxIDAsNDQ0IEMwLDQ1Ny4zMDcxNiAwLjU4NTQxNDY3MSw0NzAuNDc3NTkgMS43MzE4OTUwOSw0ODMuNDg2OTQgTDgyLjgzMDc3ODQsNTQwLjY0NjAwNSBMNDEuMTA5MjcwNiw2MzAuODQxMTUgQzUyLjI5MzkzNzEsNjU0LjkxODI3OSA2NS41NzMzNzI1LDY3Ny44MjQ5ODIgODAuNzEzNDc0MSw2OTkuMzI3MTU2IEwxNzkuNTI5NTE0LDcwOC4yNTcxOCBMMTg4LjQ0NDk2NSw4MDcuMTI1OTY1IEMyMDkuOTQ4NzgzLDgyMi4yODczNzIgMjMyLjg1OTQ3MSw4MzUuNTg2OTM3IDI1Ni45NDI1NDgsODQ2Ljc5MDE3OCBMMzQ2Ljk1ODkyOCw4MDUuMDYwODU4IEw0MDQuMDQwODc2LDg4Ni4yMjYyNCBDNDE3LjIwMzY5NSw4ODcuNDAwMzMyIDQzMC41MzE4MTgsODg4IDQ0NCw4ODggQzQ1Ny4yMDY1NjQsODg4IDQ3MC4yNzg0NTcsODg3LjQyMzQwMyA0ODMuMTkxODc3LDg4Ni4yOTQwMDkgWiBNNDQzLjk0NDUwOSw3MTcuMzQ4MiBDMjkzLjcyMzA1Nyw3MTcuMzQ4MiAxNzEuOTQ0NTA5LDU5NS4zNzE4OTMgMTcxLjk0NDUwOSw0NDQuOTA2NDkzIEMxNzEuOTQ0NTA5LDI5NC40NDEwOTMgMjkzLjcyMzA1NywxNzIuNDY0Nzg2IDQ0My45NDQ1MDksMTcyLjQ2NDc4NiBDNTk0LjE2NTk2MSwxNzIuNDY0Nzg2IDcxNS45NDQ1MDksMjk0LjQ0MTA5MyA3MTUuOTQ0NTA5LDQ0NC45MDY0OTMgQzcxNS45NDQ1MDksNTk1LjM3MTg5MyA1OTQuMTY1OTYxLDcxNy4zNDgyIDQ0My45NDQ1MDksNzE3LjM0ODIgWiIgaWQ9IlNoYXBlIiBmaWxsPSIjM0YzRjNGIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjwvcGF0aD4KICAgIDwvZz4KPC9zdmc+";
        
        this.spinGizmo = this.createCard({
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
            axis: [0,1,0],
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
            this.standardGizmo.destroy();
            delete this.standardGizmo;
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
        if(this.dataLocation)
            this.getBuffer(dataLocation).then((buffer) => {
                assetManager.setCache(dataLocation, buffer, "global");
            });
        
        this.subscribe(this.actor.target.id, "interaction", "interaction");
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

class StandardGizmoActor{
    setup(){
        this.isGizmoManipulator = true;
        this.spinGizmo = [];
        this.addSpinGizmo(0xff5555, [0, 0, 0], [0, 0, 1] ,0); 
        this.addSpinGizmo(0x5555ff, [Math.PI / 2, 0, 0],[0, 1, 0] ,1);
        this.addSpinGizmo(0x55ff55, [0, Math.PI / 2, 0],[1, 0, 0] ,2);  
    }

    addSpinGizmo(color, rotation, axis, index){
        if (this.spinGizmo[index]) this.spinGizmo[index].destroy();        
        this.spinGizmo[index] = this.createCard({
            name: "spin gizmo "+index,
            dataLocation: "./assets/SVG/circle-outline.svg",
            fileName: "./assets/SVG/circle-outline.svg",
            modelType: "svg",
            shadow:true,
            singleSided: true,
            scale: [2,2,0.2],
            rotation: rotation,
            //translation: [0, this.editFloor - 0.5, 0],
            type: '2d',
            fullBright: false,
            behaviorModules: ["PoseGizmo"],
            parent: this,
            noSave: true,
            action: "spinAxis",
            axis: axis,
            color: color,
            frameColor: 0xaaaaaa
        });
    }
}

class StandardGizmoPawn {
    setup() {
        let moduleName = this._behavior.module.externalName;
        this.addUpdateRequest([`${moduleName}$StandardGizmoPawn`, "update"]);
    }

    update(){
        const render = this.service("ThreeRenderManager");

        const cameraMatrix = render.camera.matrix;
        const cameraXYZ = [...new Microverse.THREE.Vector3().setFromMatrixPosition(cameraMatrix)];
        const gadgetXYZ = Microverse.m4_getTranslation(this.global);
        const camRelative = Microverse.v3_sub(cameraXYZ, gadgetXYZ);
        const distance = Microverse.v3_magnitude(camRelative);
        if (distance===0) return; // never going to happen during movement.  could happen on setup.
        let s = distance/4;
        this._scale = [s,s,s];
        this.onLocalChanged();
        
    }

    teardown() {
        let moduleName = this._behavior.module.externalName;
        this.removeUpdateRequest([`${moduleName}$StandardGizmoPawn`, "update"]);
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
        this.publish(this.parent.actor.target.id, "interaction");
    }

    unhilite() {
        this.entered = false;
        this.setColor();
        this.publish(this.parent.actor.target.id, "interaction");
    }

    openPropertySheet(event) {
        let avatar = Microverse.GetPawn(event.avatarId);
        this.publish(this.actor.id, "openPropertySheet", {avatar: event.avatarId, distance: avatar.targetDistance});
        this.destroy();
    }
}

class PoseGizmoActor {
    setup() {
       //console.log("PoseGizmo", this.id);
        this.isGizmoManipulator = true;
        if (this._cardData.action === "dragHorizontal" || this._cardData.action === "dragVertical") {
            this.listen("translateTarget", "translateTarget");
        } else if (this._cardData.action === "spinHorizontal" || this._cardData.action === "spinAxis") {
            this.listen("spinTarget", "spinTarget");
        }
        this.listen("startSpin", "startSpin");
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

    startSpin(){
        // current target rotation (could have changed with other interactions)
        this.baseRotation = [...this.parent.target.rotation];
        this.gizmoRotation = [...this.parent.rotation];
        let globalNorm = Window.m4_toNormal4(this.parent.target.global);
        this.baseInverse = Microverse.m4_invert(globalNorm);
    }

    spinTarget(rot){
        // this is done in local coordinates
        let r = Microverse.q_multiply(rot.target, this.baseRotation);
        this.parent.target.set({rotation: r});

        if(rot.gizmo){
            r = Microverse.q_multiply(rot.gizmo, this.gizmoRotation);
            this.parent.set({rotation: r});
        }
        else {
            r = Microverse.q_multiply(rot.target, this.gizmoRotation);
            this.parent.set({rotation: r});
        }
    }
}

class PoseGizmoPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;
        this.action = this.actor._cardData.action;
        let isMine = this.parent?.actor.creatorId === this.viewId;
        let THREE = Microverse.THREE;
        this.baseVector = new THREE.Vector3();
        this.vec = new THREE.Vector3();
        this.vec2 = new THREE.Vector3();
        this.toVector = new THREE.Vector3();
        this.globalAxis = new THREE.Vector3();
        this.newRotation = Microverse.q_identity();
        this.target = this.actor.parent.target;
        this.baseAngle = 0;

        if (isMine) {
            if (this.action === "spinHorizontal" || this.action === "spinAxis") {
                //console.log("spin horizontal pose")
                this.addEventListener("pointerDown", "startDrag");
                this.addEventListener("pointerMove", "spin");
                this.addEventListener("pointerUp", "endDrag");
            }else if (this.action === "dragHorizontal") {
                //console.log("drag horizontal pose")
                this.addEventListener("pointerDown", "startDrag");
                this.addEventListener("pointerMove", "drag");
                this.addEventListener("pointerUp", "endDrag");
            } else if (this.action === "dragVertical") {
                //console.log("drag pose")
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
        //console.log("modelLoaded")
        this.gizmo3d = this.shape.children[0];
        this.constructOutline(10000);
    }

    constructOutline(renderOrder){

        let outlineMat = new Microverse.THREE.MeshStandardMaterial({
            color: 0x444444,
            opacity: 0.2,
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
        this.outline3d.visible = true;
        this.outline3d.traverse((m) => {
            if (m.material) {
                m.material = outlineMat;
                if (!Array.isArray(m.material)) {
                    m.material = outlineMat;
                } else {
                    let mArray = m.material.map((_m) => outlineMat);
                    m.material = mArray;
                }
            }
        });
        this.outline3d.renderOrder = renderOrder;
        this.shape.add(this.outline3d);
    }

    makeRay(r) {
        let origin = new Microverse.THREE.Vector3(...r.origin);
        let direction = new Microverse.THREE.Vector3(...r.direction);
        return new Microverse.THREE.Ray(origin, direction);
    }

    startDrag(pEvt) {
        // initiate drag for horizontal drag and for rotation around Y
        this.say("startSpin"); // alert actor that this is a new interaction
        let THREE = Microverse.THREE;
        let avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.addFirstResponder("pointerMove", {}, this);

        this.startAngle = this.baseAngle;
        this.targetCenterVector = new THREE.Vector3(...Microverse.m4_getTranslation(this.target.global));
        this.centerVector = new THREE.Vector3(...Microverse.m4_getTranslation(this.actor.global));
        let ray = this.makeRay(pEvt.ray);
        if(this.action === "spinAxis"){
            // local rotation around each axis for standardGizmo
            // convert the axis vector into global coordinates of the target
            let globalNorm = Window.m4_toNormal4(this.target.global);
            this.axis = Microverse.v3_transform(this.actor._cardData.axis, globalNorm);

            this.vec.copy(this.centerVector);
            this.vec.normalize();
            this.vec2.set(...this.axis);
            let cos = this.vec2.dot(this.vec);
            // this plane is perpendicular to the rotated axis and goes through the centerVector
            //console.log(this.vec2, this.centerVector)
            this.plane = new THREE.Plane( this.vec2, -cos * this.centerVector.length());
        }
        else {
            // forced world coordinates for simple gizmo
            this.axis = [0,1,0];
            this.plane = new THREE.Plane(new THREE.Vector3(...this.axis), -this.centerVector.y);
        }
        this.globalAxis.set(...this.axis); // need this as a THREE.Vector
        // determine where the intersection of the initial ray with the new plane is.
        let intersectPoint = ray.intersectPlane( this.plane, this.toVector );
        this.baseVector.copy(intersectPoint);

        // this needs to go away before deployment
        //let scene = this.service("ThreeRenderManager").scene;
        //this.planeHelper = new THREE.PlaneHelper( this.plane, 20, 0xffff00 );
        //scene.add( this.planeHelper );

        this.startRotation = this.newRotation;
        this.publish(this.target.id, "interaction");
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
        this.targetCenterVector = new THREE.Vector3(...Microverse.m4_getTranslation(this.actor.parent.target.global));
        this.publish(this.target.id, "interaction");
    }

    drag(pEvt) {
        let ray = this.makeRay(pEvt.ray);
        let intersectionPoint = ray.intersectPlane( this.plane, this.toVector );
        if(!intersectionPoint)return; // not touching the plane...
        this.vec.copy( this.toVector );
        this.vec.sub( this.baseVector );
        this.vec.add(this.targetCenterVector);
        this.say("translateTarget", this.vec.toArray());
        this.publish(this.target.id, "interaction");
    }

    endDrag(pEvt){
        // this needs to go away before deployment
        //if(this.planeHelper){
        //    this.planeHelper.removeFromParent();
        //    delete this.planeHelper;
        //}
        const avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.removeFirstResponder("pointerMove", {}, this);
        this.publish(this.target.id, "interaction");
    }

    spin(pEvt) {
        // toVector gets the point where the laser intercepts that plane
        let ray = this.makeRay(pEvt.ray);
        let intersectPoint = ray.intersectPlane( this.plane, this.toVector );
        // vec is now given the world position of the centre of the rotator
        //this.getWorldPosition(this.vec);
        if(!intersectPoint)return;

        // angle is an angular delta, which will be used as a constant angular
        // step until it is reset by another onPointerMove, or until cancelled
        // by a click.
        this.angle = this.computeAngle(this.centerVector, this.baseVector, this.toVector);
        // then dragVector takes the most recent value of toVector
        // this.dragVector.copy(this.toVector);
        // ESLint complained about isNaN.  See https://stackoverflow.com/questions/46677774/eslint-unexpected-use-of-isnan
        if (Number.isNaN(this.angle)) { console.log(this.vec, this.dragVector, this.toVector); this.angle = 0; return false;}

        // axis is in global coordinates - need to use local
        let localAxis;
        if(this.action === "spinAxis"){
            // local rotation around each axis for standardGizmo
            localAxis = this.actor._cardData.axis;
            let axisAngle = Microverse.q_axisAngle(localAxis, this.angle);
            this.say("spinTarget", {target: axisAngle});
        } else {
            // compute axis in local coordinates - use the predefined baseInverse
            localAxis = Microverse.v3_transform(this.axis, this.actor.baseInverse);
            let axisAngle = Microverse.q_axisAngle(localAxis, this.angle);
            let gizmoAA = Microverse.q_axisAngle(this.axis, this.angle);
            this.say("spinTarget", {target:axisAngle, gizmo: gizmoAA});
        }

        this.publish(this.target.id, "interaction");
        //this.newRotation = nextRotation; // prep for next startDrag
        return true;
    }

    computeAngle(c, v1, v2) {
        let THREE = Microverse.THREE;
        // c = vec (position of centre); v1 = dragVector (previous used point in this drag, or pointer-down location); v2 = toVector (current hit position)
        c = new THREE.Vector3().copy(c); // take copies that can be mutated
        v1 = new THREE.Vector3().copy(v1);
        v2 = new THREE.Vector3().copy(v2);
        let vCross = new THREE.Vector3();
        // did we rotate much at all?
        let test = new THREE.Vector3().copy(v1);
        test.sub(v2);
        if(test.length() < 0.0000000001) return 0;
        //c.y = v1.y = v2.y = 0; // don't want the y
        v1.sub(c); // vector from center to previous hit point
        if (v1.length() === 0) return 0; // don't die if we are in the center
        v2.sub(c); // vector from center to new hit point
        if (v2.length() === 0) return 0;

        v1.normalize();
        v2.normalize();
        vCross.crossVectors(v1, v2);
        let angle = Math.acos(v1.dot(v2)); // how far the hit point has rotated

        // the "globalAxis" is the original axis transformed in global coordinates.
        // The cross product of the two vectors defining the rotation will be parallel to this axis, 
        // but may be pointing in the opposing direction - hence the sign of the dot product
        // tells us that the angle between the two axis is negative - or greater than PI.
        let sign = Math.sign(vCross.dot(this.globalAxis));
        return angle*sign; //*sign;
    }

    pointerEnter() {
        let hilite = this.actor._cardData.hiliteColor || 0xffaaa;
        this.doHilite(hilite); // hilite in yellow
    }

    pointerLeave() {
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
        },
        {
            name: "StandardGizmo",
            actorBehaviors:[StandardGizmoActor],
            pawnBehaviors:[StandardGizmoPawn]
        }
    ]
}

/* globals Microverse */
