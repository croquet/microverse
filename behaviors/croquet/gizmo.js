class GizmoActor {
    setup() {
        this.target = this._cardData.target;
        let targetParent = this._cardData.targetParent;
        this.creatorId = this._cardData.creatorId;

        this.set({parent: targetParent});
        this.set({translation: this.target.translation});

        this.listen("cycleModes", "cycleModes");
        this.isGizmoManipulator = true;
        this.cycleModes();
        this.addPropertySheetButton();
        this.subscribe(this.target.id, "translationSet", "translateTarget");
        this.subscribe(this.target.id, "rotationSet", "rotateTarget");
        this.subscribe(this.target.id, "scaleSet", "scaleTarget");
    }

    /*
    initializeGizmo(data) {
        let {parent, target, creatorId} = data;
        if (parent) {
            this.set({parent});
        }
        this.target = target;
        this.set({translation: target.translation});
        this.creatorId = creatorId;
    }
    */

    getScale(m) {
        let x = [m[0], m[1], m[2]];
        let y = [m[4], m[5], m[6]];
        let z = [m[8], m[9], m[10]];

        let length = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

        return [length(x), length(y), length(z)];
    }

    translateTarget() {
        let t = this.target.translation;
        let s = this.target.parent ? this.getScale(this.target.parent.global) : [1, 1, 1];
        this.set({translation: t, scale: [1 / s[0], 1 / s[1], 1 / s[2]]});
    }

    rotateTarget() {
        // in this case, gizmo itself should not rotate but the gyro should rotate so the three rings
        // show the euler angle of them in a sane way.

        if (this.gizmoMode === "move") {
            this.set({rotation: [0, 0, 0, 1]});
        } else {
            let r = this.target.rotation;
            this.set({rotation: r});
        }
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

    addPropertySheetButton() {
        if (this.propertySheetButton) {
            this.propertySheetButton.destroy();
        }

        let t = this.closestCorner(this.creatorId);

        this.dataLocation = "3ryPlwPIvSHXjABwnuJjrMQYPp1JH2OnghLGR_cdAbCEGgYGAgFIXV0UGx4XAVwHAVwRAB0DBxcGXBsdXQddNRYkEAseOwEzGSMRMCoWQTUKEwQLBSc5JSsrQF0bHVwRAB0DBxcGXB8bEQAdBBcAARddBRckQ0E8AEUcRwABPTExOhMCHEMeNENFIAglOitFNBg0OjNGPiYQIl81Sl0WEwYTXUMeCgYrHDc7HkECPScbJxYKOSE6RCgXK0YgFwYgCzAYPioRCkEkAEYVLRU";

        this.propertySheetButton = this.createCard({
            name: "property sheet button",
            dataLocation: this.dataLocation,
            fileName: "/prop-plain.svg",
            modelType: "svg",
            shadow: true,
            singleSided: true,
            scale: [0.5, 0.5, 0.5],
            type: "2d",
            fullBright: true,
            behaviorModules: ["GizmoPropertySheetButton", "Billboard"],
            parent: this,
            noSave: true,
            translation: t,
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
            this.set({rotation: [0, 0, 0, 1], scale: [1 / s[0], 1 / s[1], 1 / s[2]]});

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
        this.isMine = this.actor.creatorId === this.viewId;

        if (this.isMine && !this.interval) {
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

            let avatar = this.getMyAvatar();
            if ((!avatar.actor.gizmo) || avatar.actor.gizmo.id !== this.actor.id) {return;}
            this.publish(avatar.actor.id, "goodByeGizmo", this.actor.id);
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
        this.isGizmoManipulator = true;
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
        this.isMine = isMine;

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
        this.isGizmoManipulator = true;
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
        this.isMine = isMine;
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

        let nSign;
        if (this.actor._cardData.axis[0] === 1) {
            nSign = normal[0] < 0 ? 1 : -1;
        } else if (this.actor._cardData.axis[1] === 1) {
            nSign = normal[1] < 0 ? 1 : -1;
        } else if (this.actor._cardData.axis[2] === 1) {
            nSign = normal[2] < 0 ? 1 : -1;
        }

        let dot = v3_dot(projStartDirection, projNewDirection);
        let cross = v3_cross(projNewDirection, projStartDirection);

        let dotCross = v3_dot(cross, normal);
        let acos = Math.acos(dot);
        let sign = Math.sign(dotCross);

        let axisAngle = q_axisAngle(this.actor._cardData.axis, acos * sign * nSign);

        let nextRotation = q_multiply(axisAngle, this.gizmoRotationAtDragStart);

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
        this.isGizmoManipulator = true;
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
        this.isMine = isMine;

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

class GizmoPropertySheetButtonActor {
    setup() {
        this.isGizmoManipulator = true;
    }
}

class GizmoPropertySheetButtonPawn {
    setup() {
        let isMine = this.parent?.actor.creatorId === this.viewId;
        this.isMine = isMine;

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
        let avatarPawn = Microverse.GetPawn(event.avatarId);
        let avatar = avatarPawn.actor;

        if (!event.shiftKey) {
            this.say("openPropertySheet", {avatar: avatar.id, distance: avatarPawn.targetDistance});
            this.destroy(); // remove button
        } else {
            let target = this.actor.parent.target;
            let targetPawn = Microverse.GetPawn(target.id);
            let args = {target, targetPawn, avatar, avatarPawn};
            // log func name and args by default (and reminder that func can be set)
            let fn = window.microverseShiftClickPropFunc;
            let keepGizmo = false;
            if (fn) {
                keepGizmo = fn(args);
            } else {
                console.log("microverseShiftClickPropFunc (not set)", args);
            }
            if (!keepGizmo) {
                this.publish(avatar.actor.id, "goodByeGizmo", this.actor.id);
            }
        }
        // this.say("openPropertySheet", {avatar: avatar.id, distance: avatarPawn.targetDistance});
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
            actorBehaviors: [GizmoPropertySheetButtonActor],
            pawnBehaviors: [GizmoPropertySheetButtonPawn],
        }
    ]
}

/* globals Microverse */
