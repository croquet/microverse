class GizmoActor {
    setup() {
        this.listen("cycleModes", "cycleModes");
        let box = this.target.editBox;
        let scale = this.target.scale;
        this.editScale = Math.max(scale[0]*(box[3]-box[0]), scale[2]*(box[5]-box[2]));
        this.editFloor = scale[1]*box[1]-0.1;
        //this.cycleModes();
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
        this.poseGizmo = this.createCard({
            name: "drag horizontal gizmo",
            dataLocation:`./assets/SVG/dot-circle.svg`,
            fileName:`./assets/SVG/dot-circle.svg`,
            modelType: 'svg',
            shadow:true,
            singleSided: true,
            scale:[1,1,0.25],
            rotation:[Math.PI/2, 0, 0],
            translation:[0,this.editFloor-0.5, 0],
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
            translation:[0,this.editFloor-0.25,0],
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
        if(this.spinGizmo)this.spinGizmo.destroy();
        this.vspinGizmo = this.createCard({
            name: "spin horizontal gizmo",
            dataLocation:`./assets/SVG/cog.svg`,
            fileName:`./assets/SVG/cog.svg`,
            modelType: 'svg',
            shadow:true,
            singleSided: true,
            scale:[2,2,0.25],
            rotation:[Math.PI/2, 0, 0 ],
            translation:[0,this.editFloor-0.5,0],
            type:'2d',
            fullBright: false,
            behaviorModules: ["PoseGizmo"],
            parent: this,
            noSave: true,
            action: 'spinHorizontal',
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
            translation:[1.25,this.editFloor-0.25, 0],
            parent: this
        });

        this.subscribe(this.propertySheetButton.id, "openPropertySheet", "openPropertySheet");
    }

    openPropertySheet(toWhom) {
        this.target.showControls(toWhom);
    }

    cycleModes() {
        console.log("cycling modes, before: ", this.gizmoMode);
        if (!this.gizmoMode || this.gizmoMode === "scale") {
            if (this.gizmoMode === "scale") {
                this.scaleX.destroy();
                this.scaleY.destroy();
                this.scaleZ.destroy();
            }

            this.gizmoMode = "move";
            let s = this.target.parent ? this.getScale(this.target.parent.global) : [1, 1, 1];
            //this.set({rotation: [0, 0, 0, 1], scale: [1 / s[0], 1 / s[1], 1 / s[2]]});

            this.moveX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisX',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [1, 0, 0],
                color: 0xff0000,
                hoverColor: 0xffff00
            });

            this.moveY = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisY',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 1, 0],
                color: 0x00ff00,
                hoverColor: 0xffff00
            });

            this.moveZ = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisZ',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 0, 1],
                color: 0x0000ff,
                hoverColor: 0xffff00
            });

            this.moveNX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisX',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [-1, 0, 0],
                color: 0xff0000,
                hoverColor: 0xffff00
            });

            this.moveNY = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisY',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, -1, 0],
                color: 0x00ff00,
                hoverColor: 0xffff00
            });

            this.moveNZ = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoAxisZ',
                behaviorModules: ["GizmoAxis"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 0, -1],
                color: 0x0000ff,
                hoverColor: 0xffff00
            });
        } else if (this.gizmoMode === "move") {
            this.gizmoMode = "rotate";

            this.moveX.destroy();
            this.moveY.destroy();
            this.moveZ.destroy();
            this.moveNX.destroy();
            this.moveNY.destroy();
            this.moveNZ.destroy();

            if (this.propertySheetButton) {
                this.propertySheetButton.destroy();
            }

            let s = this.target.parent ? this.getScale(this.target.parent.global) : [1, 1, 1];
            this.set({rotation: this.target.rotation, scale: [1 / s[0], 1 / s[1], 1 / s[2]]});

            this.rotateX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoRotorX',
                behaviorModules: ["GizmoRotor"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [1, 0, 0],
                color: 0xff0000,
                hoverColor: 0xffff00
            });

            this.rotateY = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoRotorY',
                behaviorModules: ["GizmoRotor"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 1, 0],
                color: 0x00ff00,
                hoverColor: 0xffff00
            });

            this.rotateZ = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoRotorZ',
                behaviorModules: ["GizmoRotor"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 0, 1],
                color: 0x0000ff,
                hoverColor: 0xffff00
            });

        } else if (this.gizmoMode === "rotate") {
            this.gizmoMode = "scale";

            this.rotateX.destroy();
            this.rotateY.destroy();
            this.rotateZ.destroy();

            this.scaleX = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoScalerX',
                behaviorModules: ["GizmoScaler"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [1, 0, 0],
                color: 0xff0000,
                hoverColor: 0xffff00
            });

            this.scaleY = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoScalerY',
                behaviorModules: ["GizmoScaler"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 1, 0],
                color: 0x00ff00,
                hoverColor: 0xffff00
            });

            this.scaleZ = this.createCard({
                translation: [0, 0, 0],
                name: 'gizmoScalerZ',
                behaviorModules: ["GizmoScaler"],
                parent: this,
                type: "object",
                noSave: true,
                axis: [0, 0, 1],
                color: 0x0000ff,
                hoverColor: 0xffff00
            });
        }
        console.log("cycled modes, now: ", this.gizmoMode);
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

class GizmoAxisActor {
    setup() {
        this.subscribe(this.parent.id, "translateTarget", "translateTarget");
    }

    translateTarget(translation) {
        this.parent.target.set({translation});
    }
}

class GizmoAxisPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;

        let isMine = this.parent?.actor.creatorId === this.viewId;

        this.shape.add(this.makeAxisHelper(isMine));

        if (isMine) {
            this.addEventListener("pointerDown", "startDrag");
            this.addEventListener("pointerMove", "drag");
            this.addEventListener("pointerUp", "endDrag");
            this.addEventListener("pointerEnter", "pointerEnter");
            this.addEventListener("pointerLeave", "pointerLeave");
        }
    }

    makeAxisHelper(isMine) {
        this.axis = this.actor._cardData.axis;
        let arrow = new Microverse.THREE.ArrowHelper(
            new Microverse.THREE.Vector3(...this.axis),
            new Microverse.THREE.Vector3(0, 0, 0),
            3,
            isMine ? this.originalColor : 0xffffff
        );
        this.parent.call("Gizmo$GizmoPawn", "forceOnTop", arrow);
        return arrow;
    }

    startDrag(event) {
        let avatar = Microverse.GetPawn(event.avatarId);
        let target = this.actor.parent.target;

        if (!event.ray) {return;}

        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);

        let {THREE, m4_invert, v3_normalize, v3_sub, m4_identity, v3_cross} = Microverse;
        // ensure the plane is parallel to the arrow
        let direction = event.ray.direction;
        let up = v3_cross(this.axis, direction);
        direction = v3_cross(up, this.axis);

        let parentGlobal = target._parent ? target._parent.global : m4_identity();
        this.gizmoParentInvert = m4_invert(parentGlobal);
        this.gizmoPositionAtDragStart = target.translation;
        this.gizmoDragStart = event.xyz;

        // if we are dragging along the Y axis
        this.intersectionPlane = new Microverse.THREE.Plane();

        this.intersectionPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(...v3_sub([0, 0, 0], v3_normalize(direction))),
            new Microverse.THREE.Vector3(...this.gizmoDragStart)
        );

        this.publish(this.parent.id, "interaction");
    }

    drag(event) {
        if (!this.gizmoDragStart || !event.ray) {return;}

        let origin = new Microverse.THREE.Vector3(...event.ray.origin);
        let direction = new Microverse.THREE.Vector3(...event.ray.direction);
        let ray = new Microverse.THREE.Ray(origin, direction);
        let intersectionPoint = ray.intersectPlane(
            this.intersectionPlane,
            new Microverse.THREE.Vector3()
        );

        if (!intersectionPoint) {return;}

        let globalHere = intersectionPoint.toArray();
        let globalStart = this.gizmoDragStart;

        let localHere = Microverse.v3_transform(globalHere, this.gizmoParentInvert);
        let localStart = Microverse.v3_transform(globalStart, this.gizmoParentInvert);
        let delta3D = Microverse.v3_sub(localHere, localStart);

        let nextPosition = [...this.gizmoPositionAtDragStart];
        if (this.actor._cardData.axis[0] === 1 || this.actor._cardData.axis[0] === -1) {
            nextPosition[0] += delta3D[0];
        } else if (this.actor._cardData.axis[1] === 1 || this.actor._cardData.axis[1] === -1) {
            nextPosition[1] += delta3D[1];
        } else if (this.actor._cardData.axis[2] === 1 || this.actor._cardData.axis[2] === -1) {
            nextPosition[2] += delta3D[2];
        }
        // console.log(nextPosition);
        this.publish(this.parent.actor.id, "translateTarget", nextPosition);
        this.publish(this.parent.id, "interaction");
        // this.set({translation: nextPosition})
    }

    endDrag(event) {
        delete this.gizmoDragStart;
        delete this.gizmoParentInvert;
        delete this.gizmoPositionAtDragStart;

        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.removeFirstResponder("pointerMove", {}, this);
        this.publish(this.parent.id, "interaction");
    }

    pointerEnter() {
        this.shape.children[0].setColor(this.actor._cardData.hoverColor);
        this.publish(this.parent.id, "interaction");
    }

    pointerLeave() {
        this.shape.children[0].setColor(this.originalColor);
        this.publish(this.parent.id, "interaction");
    }
}

class GizmoRotorActor {
    setup() {
        this.subscribe(this.parent.id, "rotateTarget", "rotateTarget");
    }

    rotateTarget(rotation) {
        this.parent.target.set({rotation})
    }
}

class GizmoRotorPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;

        let isMine = this.parent?.actor.creatorId === this.viewId;
        this.shape.add(this.createCircle(isMine ? this.actor._cardData.color : 0xffffff, this.actor._cardData.axis));

        if (isMine) {
            this.addEventListener("pointerDown", "startDrag");
            this.addEventListener("pointerMove", "drag");
            this.addEventListener("pointerUp", "endDrag");
            this.addEventListener("pointerEnter", "pointerEnter");
            this.addEventListener("pointerLeave", "pointerLeave");
        }
    }

    createCircle(color, axis) {
        const curve = new Microverse.THREE.EllipseCurve(
            0.0, 0.0,            // Center x, y
            2.0, 2.0,          // x radius, y radius
            0.0, 2.0 * Math.PI,  // Start angle, stop angle
        );

        const pts = curve.getSpacedPoints(256);
        const geo = new Microverse.THREE.BufferGeometry().setFromPoints(pts);

        if (axis[1] === 1) {
            geo.rotateX(Math.PI / 2);
        } else if (axis[0] === 1) {
            geo.rotateY(Math.PI / 2);
        }

        const mat = new Microverse.THREE.LineBasicMaterial({color, toneMapped: false, linewidth: 2});
        const circle = new Microverse.THREE.LineLoop(geo, mat);
        this.parent.call("Gizmo$GizmoPawn", "forceOnTop", circle);
        return circle;
    }

    localRotationAxis() {
        return Microverse.v3_rotate(this.actor._cardData.axis, this.gizmoRotationAtDragStart); // wrong?
    }

    rotationInteractionPlane(_event) {
        let {THREE} = Microverse;
        let interactionPlane = new THREE.Plane();

        interactionPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(...this.localRotationAxis()),
            new THREE.Vector3(...this.gizmoGlobalTranslationAtStart));

        /*
        if (window.planeHelper) {
            this.shape.parent.remove(window.planeHelper);
            window.planeHelper = undefined;
        }
        window.planeHelper = new Microverse.THREE.PlaneHelper( interactionPlane, 10, 0xffff00 )
        this.shape.parent.add(window.planeHelper);
        */
        return interactionPlane;
    }

    startDrag(event) {
        let avatar = Microverse.GetPawn(event.avatarId);
        let target = this.parent.actor.target;

        if (!event.ray) {return;}

        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.addFirstResponder("pointerMove", {}, this);

        let {THREE, v3_normalize, v3_transform, m4_getTranslation, m4_invert} = Microverse;

        this.gizmoTargetInvert = m4_invert(target.global);
        this.gizmoRotationAtDragStart = target.rotation;
        this.gizmoGlobalTranslationAtStart = m4_getTranslation(target.global);

        let origin = new THREE.Vector3(...event.ray.origin);
        let direction = new THREE.Vector3(...event.ray.direction);
        let ray = new THREE.Ray(origin, direction);

        let dragPoint = ray.intersectPlane(
            this.rotationInteractionPlane(),
            new Microverse.THREE.Vector3()
        );

        if (dragPoint) {
            let localPoint = v3_transform(dragPoint.toArray(), this.gizmoTargetInvert);
            let dir = v3_normalize(localPoint);
            this.dragStart = dir;
        }

        this.publish(this.parent.id, "interaction");
    }

    drag(event) {
        if (!this.dragStart || !event.ray) {return;}

        let {THREE, v3_transform, v3_normalize, v3_cross, v3_dot, q_multiply, q_axisAngle} = Microverse;

        let origin = new THREE.Vector3(...event.ray.origin);
        let direction = new THREE.Vector3(...event.ray.direction);
        let ray = new THREE.Ray(origin, direction);

        let newDragPoint;

        let dragPoint = ray.intersectPlane(
            this.rotationInteractionPlane(),
            new Microverse.THREE.Vector3()
        );

        if (dragPoint) {
            let localPoint = v3_transform(dragPoint.toArray(), this.gizmoTargetInvert);
            let dir = v3_normalize(localPoint);
            newDragPoint = dir;
        }

        if (!newDragPoint) {return;}

        let projStartDirection = this.dragStart;
        let projNewDirection = newDragPoint;
        let normal = this.localRotationAxis();

        let sign;
        if (this.actor._cardData.axis[0] === 1) {
            sign = normal[0] < 0 ? -1 : 1;
        } else if (this.actor._cardData.axis[1] === 1) {
            sign = normal[1] < 0 ? -1 : 1;
        } else if (this.actor._cardData.axis[2] === 1) {
            sign = normal[2] < 0 ? -1 : 1;
        }

        let angle = Math.atan2(v3_dot(v3_cross(projStartDirection, projNewDirection), normal), v3_dot(projStartDirection, projNewDirection)) * sign;

        let axisAngle = q_axisAngle(this.actor._cardData.axis, angle);
        const nextRotation = q_multiply(axisAngle, this.gizmoRotationAtDragStart);

        this.publish(this.parent.actor.id, "rotateTarget", nextRotation)
        this.publish(this.parent.id, "interaction");
    }

    endDrag(event) {
        delete this.gizmoTargetInvert;
        delete this.gizmoRotationAtDragStart;
        delete this.gizmoGlobalTranslationAtStart;

        const avatar = Microverse.GetPawn(event.avatarId);
        // avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.removeFirstResponder("pointerMove", {}, this);
        this.publish(this.parent.id, "interaction");
    }

    pointerEnter() {
        this.shape.children[0].material.color.set(this.actor._cardData.hoverColor);
        this.publish(this.parent.id, "interaction");
    }

    pointerLeave() {
        this.shape.children[0].material.color.set(this.originalColor);
        this.publish(this.parent.id, "interaction");
    }
}

class GizmoScalerActor {
    setup() {
        this.subscribe(this.parent.id, "scaleTarget", "scaleTarget");
    }

    scaleTarget(scale) {
        this.parent.target.set({scale});
    }
}

class GizmoScalerPawn {
    setup() {
        this.originalColor = this.actor._cardData.color;
        let isMine = this.parent?.actor.creatorId === this.viewId;

        this.targetScaleSet();

        this.subscribe(this.actor.parent.target.id, "scaleSet", "targetScaleSet");

        if (isMine) {
            this.addEventListener("pointerDown", "startDrag");
            this.addEventListener("pointerMove", "drag");
            this.addEventListener("pointerUp", "endDrag");
            this.addEventListener("pointerEnter", "pointerEnter");
            this.addEventListener("pointerLeave", "pointerLeave");
        }
    }

    getGlobalLength() {
        let {THREE, GetPawn, m4_invert, v3_transform, v3_multiply} = Microverse;

        let target = this.actor.parent?.target;
        let targetPawn = GetPawn(target.id);
        let invert = m4_invert(target.global);

        let box = new THREE.Box3().setFromObject(targetPawn.shape);

        let min = v3_transform(box.min.toArray(), invert);
        let max = v3_transform(box.max.toArray(), invert);

        let s = this.actor.parent.call("Gizmo$GizmoActor", "getScale", target.global);

        min = v3_multiply(min, s);
        max = v3_multiply(max, s);

        return {min, max};
    }

    targetScaleSet(_data) {
        let isMine = this.parent?.actor.creatorId === this.viewId;
        let box = this.getGlobalLength();
        this.shape.add(this.makeScaleHandles(isMine, box, 1.2));
    }

    makeScaleHandles(isMine, box3, margin) {
        let points = [];
        let {THREE} = Microverse;

        if (this.handleGroup) {
            [...this.handleGroup.children].forEach((c) => {
                c.material.dispose();
                c.geometry.dispose();
                c.removeFromParent();
            });
            this.handleGroup.removeFromParent();
        }

        let group = new THREE.Group();
        this.handleGroup = group;

        points.push(new THREE.Vector3(0, 0, 0));

        let s = this.actor._cardData.axis.indexOf(1);
        points.push((new THREE.Vector3(...this.actor._cardData.axis)).multiplyScalar(box3.max[s] * margin));

        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        let material = new THREE.LineBasicMaterial({color: isMine ? this.originalColor : 0xffffff, toneMapped: false});

        let line = new THREE.Line(geometry, material);

        let boxGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        let boxMaterial = new THREE.MeshBasicMaterial({color: isMine ? this.originalColor : 0xffffff, toneMapped: false});
        let box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.translateOnAxis(new THREE.Vector3(...this.actor._cardData.axis), box3.max[s] * margin);

        group.add(line);
        group.add(box);

        this.parent.call("Gizmo$GizmoPawn", "forceOnTop", group);
        return group;
    }

    startDrag(event) {
        // avatar.addFirstResponder("pointerMove", {shiftKey: true}, this);
        let {THREE, m4_invert, v3_normalize, v3_sub, GetPawn} = Microverse;
        let avatar = GetPawn(event.avatarId);
        avatar.addFirstResponder("pointerMove", {}, this);
        let target = this.actor.parent.target;

        if (!event.ray) {return;}

        this.scaleAtDragStart = target.scale;
        this.dragStart = event.xyz;
        this.targetInvert = m4_invert(target.global);

        // if we are dragging along the Y axis
        this.intersectionPlane = new Microverse.THREE.Plane();

        this.intersectionPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(...v3_sub([0, 0, 0], v3_normalize(event.ray.direction))),
            new Microverse.THREE.Vector3(...this.dragStart)
        );
        this.publish(this.parent.id, "interaction");
    }

    drag(event) {
        if (!this.dragStart || !event.ray) {return;}

        let {THREE, v3_scale, v3_sub, v3_divide} = Microverse;

        let origin = new THREE.Vector3(...event.ray.origin);
        let direction = new THREE.Vector3(...event.ray.direction);
        let ray = new THREE.Ray(origin, direction);
        let intersectionPoint = ray.intersectPlane(
            this.intersectionPlane,
            new Microverse.THREE.Vector3()
        );

        if (!intersectionPoint) {return;}

        let globalHere = intersectionPoint.toArray();
        let globalStart = this.dragStart;

        let localHere = Microverse.v3_transform(globalHere, this.targetInvert);
        let localStart = Microverse.v3_transform(globalStart, this.targetInvert);
        let localOrigin = [0, 0, 0];

        let ratio = v3_divide(v3_sub(localHere, localOrigin), v3_sub(localStart, localOrigin));
        let nextScale = [...this.scaleAtDragStart];

        let s;
        if (this.actor._cardData.axis[0] === 1) {
            s = ratio[0];
        } else if (this.actor._cardData.axis[1] === 1) {
            s = ratio[1];
        } else if (this.actor._cardData.axis[2] === 1) {
            s = ratio[2];
        }

        let realNextScale = v3_scale(nextScale, s);
        this.publish(this.parent.actor.id, "scaleTarget", realNextScale);
        this.publish(this.parent.id, "interaction");
    }

    endDrag(event) {
        this.dragStart = undefined;
        let avatar = Microverse.GetPawn(event.avatarId);
        // avatar.removeFirstResponder("pointerMove", {shiftKey: true}, this);
        avatar.removeFirstResponder("pointerMove", {}, this);
        this.publish(this.parent.id, "interaction");
    }

    pointerEnter() {
        this.shape.children[0].children.forEach(child => child.material.color.set(this.actor._cardData.hoverColor));
    }

    pointerLeave() {
        this.shape.children[0].children.forEach(child => child.material.color.set(this.originalColor));
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

class PoseGizmoActor{
    setup() {
        console.log("PoseGizmo", this.id);

        if(this._cardData.action === 'dragHorizontal' || this._cardData.action === 'dragVertical')
            this.subscribe(this.parent.id, "translateTarget"+this.id, "translateTarget");
        else if(this._cardData.action === 'spinHorizontal')
            this.subscribe(this.parent.id, "spinTarget"+this.id, "spinTarget");
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
        let q=Microverse.q_normalize(quat);
        let angle = 2 * Math.acos(q[3]);
        let axis = [];
        let s = Math.sqrt(1-q[3]*q[3]); // assuming quaternion normalised then w is less than 1, so term always positive.
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

class PoseGizmoPawn{
    setup() {
        this.originalColor = this.actor._cardData.color;
        this.action = this.actor._cardData.action;
        this.plane = this.actor._cardData.plane;
        let isMine = this.parent?.actor.creatorId === this.viewId;
        let THREE=Microverse.THREE;
        this.baseVector = new THREE.Vector3();
        this.vec = new THREE.Vector3();
        this.vec2 = new THREE.Vector3();
        this.toVector = new THREE.Vector3();

        this.deltaYaw = 0;
        this.newRotation = Microverse.q_euler(0, this.deltaYaw, 0);

        if (isMine) {
            if(this.action === 'spinHorizontal'){
                console.log("spin horizontal pose")
                this.addEventListener("pointerDown", "startDrag");
                this.addEventListener("pointerMove", "hSpin");
                this.addEventListener("pointerUp", "endDrag");
            }else if(this.action === 'dragHorizontal'){
                console.log("drag horizontal pose")
                this.addEventListener("pointerDown", "startDrag");
                this.addEventListener("pointerMove", "drag");
                this.addEventListener("pointerUp", "endDrag");
            }else if(this.action === 'dragVertical'){
                console.log("drag pose")
                this.addEventListener("pointerDown", "startVDrag");
                this.addEventListener("pointerMove", "drag");
                this.addEventListener("pointerUp", "endDrag");
            } 
            this.addEventListener("pointerEnter", "pointerEnter");
            this.addEventListener("pointerLeave", "pointerLeave");
        }

       if(this.actor._cardData.radius)this.makeSphere(this.actor._cardData.radius, this.actor._cardData.color);
       else this.subscribe(this.id, "2dModelLoaded", "modelLoaded");

    }

    makeSphere(radius, color){
        const geometry = new Microverse.THREE.SphereGeometry( radius, 32, 16 );
        const material = new Microverse.THREE.MeshStandardMaterial( { color: color || 0xffff00 } );
        this.gizmo3d = new Microverse.THREE.Mesh( geometry, material );
        this.shape.add(this.gizmo3d);
        this.constructOutline(10001);
    }

    modelLoaded(){
        console.log("modelLoaded")
        this.gizmo3d = this.shape.children[0];
        this.constructOutline(10000);
    }

    constructOutline(renderOrder){

        let outlineMat = new Microverse.THREE.MeshStandardMaterial( { 
            color: 0x444444, 
            opacity: 0.25,
            transparent: true,
            depthTest: false,
            depthWrite: false,
           // side: THREE.BackSide,
        })
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
                    console.log("multiple material", m.material.length)
                    let mArray = [];
                    for(let i = 0; i< m.material.length; i++){
                        mArray.push(outlineMat);
                    }
                    m.material = mArray;
                }
            }
        });
        this.outline3d.renderOrder = renderOrder;
        console.log(this.outline3d);
        this.shape.add(this.outline3d);
    }

    makeRay(r){
        let origin = new Microverse.THREE.Vector3(...r.origin);
        let direction = new Microverse.THREE.Vector3(...r.direction);
        return new Microverse.THREE.Ray(origin, direction);
    }

    startDrag(pEvt){
        // initiate drag for horizontal drag and for rotation around Y 
        let THREE=Microverse.THREE;
        let avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.baseVector.set(...pEvt.xyz);
        this.plane = new THREE.Plane( new THREE.Vector3(0,1,0), -this.baseVector.y ); 
        this.targetStartVector = new THREE.Vector3(...Microverse.m4_getTranslation(this.actor.parent.target.global));
        this.startRotation = this.newRotation;
        this.publish(this.parent.id, "interaction");
    }

    startVDrag(pEvt){
        // initiate drag for vertical using avatar's look direction to define plane
        let THREE=Microverse.THREE;
        let avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.addFirstResponder("pointerMove", {}, this);
        this.baseVector.set(...pEvt.xyz);
        let lookNorm = avatar.actor.lookNormal;
        this.vec.copy(this.baseVector);
        this.vec.normalize();
        this.vec2.set(...lookNorm);
        let cos = this.vec2.dot(this.vec);
        this.plane = new THREE.Plane( this.vec2, -cos*this.baseVector.length());
        this.targetStartVector = new THREE.Vector3(...Microverse.m4_getTranslation(this.actor.parent.target.global));
        this.publish(this.parent.id, "interaction");
    }
    
    drag(pEvt){
        let ray = this.makeRay(pEvt.ray);
        let intersectionPoint = ray.intersectPlane( this.plane, this.toVector );
        if(!intersectionPoint)return; // not touching the plane...
        this.vec.copy( this.toVector );
        this.vec.sub( this.baseVector );
        this.vec.add(this.targetStartVector);
        this.publish(this.parent.actor.id, "translateTarget"+this.actor.id, this.vec.toArray());
        this.publish(this.parent.id, "interaction");
    }

    endDrag(pEvt){
        const avatar = Microverse.GetPawn(pEvt.avatarId);
        avatar.removeFirstResponder("pointerMove", {}, this);
        this.publish(this.parent.id, "interaction");
    }
    
    hSpin(pEvt){
        this.vec.set(0,1,0);
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
        this.publish(this.parent.actor.id, "spinTarget"+this.actor.id, nextRotation);
        this.publish(this.parent.id, "interaction");
        this.newRotation = nextRotation; // prep for next startDrag
        return true;
    }

    computeAngle(c, v1, v2){
        // c = vec (position of centre); v1 = dragVector (previous used point in this drag, or pointer-down location); v2 = toVector (current hit position)
        c = new THREE.Vector3().copy(c); // take copies that can be mutated
        v1 = new THREE.Vector3().copy(v1);
        v2 = new THREE.Vector3().copy(v2);
        let test = new THREE.Vector3().copy(v1);
        test.sub(v2);
        if(test.length()<0.0000000001)return 0;
        c.y = v1.y = v2.y = 0; // don't want the y
        v1.sub(c); // vector from center to previous hit point
        if(v1.length()===0)return 0; // don't die if we are in the center
        v1.normalize();
        v2.sub(c); // vector from center to new hit point
        if(v2.length()===0)return 0;
        v2.normalize();
        let angle = Math.acos(v1.dot(v2)); // how far the hit point has rotated
        let sign = Math.sign(v1.cross(v2).y); // whether a clockwise (+ve y) or anticlockwise rotation
        return angle*sign;
    }
    
    pointerEnter(){
        console.log("pointerEnter")
        let hilite = this.actor._cardData.hiliteColor || 0xffaaa;
        this.doHilite(hilite); // hilite in yellow
    }

    pointerLeave(){
        console.log("pointerLeave")
        this.doHilite(null);
    }

    doHilite(hval){
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
            name: "GizmoAxis",
            actorBehaviors: [GizmoAxisActor],
            pawnBehaviors: [GizmoAxisPawn],
        },
        {
            name: "GizmoRotor",
            actorBehaviors: [GizmoRotorActor],
            pawnBehaviors: [GizmoRotorPawn],
        },
        {
            name: "GizmoScaler",
            actorBehaviors: [GizmoScalerActor],
            pawnBehaviors: [GizmoScalerPawn],
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
