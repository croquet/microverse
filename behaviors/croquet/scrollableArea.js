class ScrollAreaActor {
    setup() {
        this.noSave = true;
        console.log("setup.scrollTop", this.scrollTop);
        this.subscribe(this.id, "scrollTop", "setScrollTop");
    }

    setTarget(card) {
        if (!this.scroller) {
            this.scroller = this.createCard({
                name: "scroll bar",
                type: "2d",
                parent: this,
                behaviorModules: ["ScrollBar"],
                noSave: true,
                fullBright: true,
                height: this._cardData.height,
                width: 0.1,
                depth: 0.01,
                backgroundColor: 0x606060,
                color: 0x808080,
            });
        }
        this.target = card;
        this.say("targetSet");
        if (this.scrollTop === undefined) this.scrollTop = 0; // [0..1]
        this.future(1).setScrollTop(this.scrollTop, 1, 2, 3);
    }

    setScrollTop(scrollTop) {
        // scrollTop = 0 -> (this._cardData.height - this.target._cardData.height) / 2
        // scrollTop = 1 -> this.target._cardData.height - this._cardData.height / 2

        this.scrollTop = scrollTop;

        let diff = this._cardData.height - this.target._cardData.height;
        let offset = ((-diff) * scrollTop + diff * (1 - scrollTop)) / 1.8;
        let t = this.target.translation;
        if (diff > 0) {
            this.target.set({translation: [t[0], diff / 2 - 0.1, t[2]]});
        } else {
            this.target.set({translation: [t[0], offset, t[2]]});
        }

        let width = this._cardData.width;

        if (!this.scroller) {return;}
        this.scroller.set({
            translation: [width / 2 + 0.05, 0, 0.01]
        });
        this.scroller.setCardData({
            width: 0.1,
            height: this._cardData.height,
        });
        this.say("updateDisplay");
    }
}

class ScrollAreaPawn {
    setup() {
        this.listen("targetSet", "targetSet");
        this.listen("updateDisplay", "updateDisplay");
        if (this.actor.target) {
            this.targetSet();
        }
        this.future(1000).updateDisplay();
    }

    targetSet() {
        //console.log("target set");
        this.initializeClipping();

        [...this.shape.children].forEach((c) => this.shape.remove(c));

        let geometry = this.roundedCornerGeometry(
            this.actor._cardData.width,
            this.actor._cardData.height,
            this.actor._cardData.depth,
            this.actor._cardData.cornerRadius || 0.01
        );

        let material = this.makePlaneMaterial(this.actor._cardData.depth, this.actor._cardData.color, this.actor._cardData.frameColor || 0xaaaaaa, true);

        let mesh = new Microverse.THREE.Mesh(geometry, material);
        this.shape.add(mesh);
    }

    initializeClipping() {
        let THREE = Microverse.THREE;
        this.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(0, 1, 0),  0),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)
        ];
    }

    updateDisplay() {
        // console.log("updateDisplay");
        let w = this.actor._cardData.width;
        let h = this.actor._cardData.height;

        let left = w / 2;
        let right = w / 2;
        let bottom = h / 2; //  * (1 - this.actor.scrollTop) - 0.5
        let top = h / 2;

        this.material[0].clippingPlanes = this.computeClippingPlanes([top, bottom, left, right]);

        let topLeft = [-left, top, 0];
        let bottomRight = [right, -bottom, 0];
        let globalTopLeft = Microverse.v3_transform(topLeft, this.global);
        let globalBottomRight = Microverse.v3_transform(bottomRight, this.global);

        let pawn = Microverse.GetPawn(this.actor.target.id);

        // let pawnInv = Microverse.m4_invert(pawn._global);
        // let pawnTopLeft = Microverse.v3_transform(globalTopLeft, pawnInv);
        // let pawnBottomRight = Microverse.v3_transform(globalBottomRight, pawnInv);

        let menu = [...pawn.children][0];

        let planes = menu.call("Menu$MenuPawn", "menuComputeClippingPlanes", [top, bottom, left, right]);
        menu.material.clippingPlanes = planes;

        if (!pawn) {return;}
        pawn.children.forEach((c) => {
            c.children.forEach((d) => {
                if (d.setTextRenderingBounds) {
                    let th = d.actor._cardData.height;
                    let textInv = Microverse.m4_invert(d.global);
                    let textTopLeft = Microverse.v3_transform(globalTopLeft, textInv);
                    let textBottomRight = Microverse.v3_transform(globalBottomRight, textInv);
                    let bTop = -(textTopLeft[1] - (th / 2)) / d.textScale();
                    let bBottom = -(textBottomRight[1] + (th / 2)) / d.textScale();

                    d.setTextRenderingBounds({left: 0, right: 1000, top: bTop, bottom: bBottom});
                }
            });
        });
    }

    computeClippingPlanes(ary) {
        //let [top, bottom, right, left] = ary; this is the order
        let planes = [];
        if (Number.isNaN(this.shape.matrixWorld.elements[0])) return [];
        for (let i = 0; i < 4; i++) {
            planes[i] = new Microverse.THREE.Plane();
            planes[i].copy(this.clippingPlanes[i]);
            planes[i].constant = ary[i];
            planes[i].applyMatrix4(this.shape.matrixWorld);
        }
        return planes;
    }
}

class ScrollBarActor {
    setup() {}
}
class ScrollBarPawn {
    setup() {
        this.addEventListener("pointerDown", "pointerDown");
        this.addEventListener("pointerUp", "pointerUp");
        this.addEventListener("pointerMove", "pointerMove");
    }

    pointerDown(evt) {
        if (!evt.xyz) {return;}
        if (!this._parent) {return;}

        let startScrollTop = this._parent.actor.scrollTop;
        let vec = new Microverse.THREE.Vector3(...evt.xyz);
        let inv = this.renderObject.matrixWorld.clone().invert();
        vec = vec.applyMatrix4(inv);

        let downInfo = {child: this, startScrollTop, downPosition: vec};
        this.downInfo = downInfo
        let avatar = this.service("PawnManager").get(evt.avatarId);
        if (avatar) {
            avatar.addFirstResponder("pointerMove", {}, this);
        }
    }

    pointerUp(evt) {
        if (this.downInfo) {
            delete this.downInfo;
            let avatar = this.service("PawnManager").get(evt.avatarId);
            if (avatar) {
                avatar.removeFirstResponder("pointerMove", {}, this);
            }
        }
    }

    pointerMove(evt) {
        if (!evt.xyz) {return;}
        if (!this.downInfo) {return;}
        let vec = new Microverse.THREE.Vector3(...evt.xyz);
        let pInv = this.renderObject.matrixWorld.clone().invert();
        vec = vec.applyMatrix4(pInv);

        let origDownPoint = this.downInfo.downPosition;
        let origScrollTop = this.downInfo.startScrollTop;

        let deltaY = origDownPoint.y - vec.y;

        let scrollTop = Math.min(Math.max(deltaY / this.actor._cardData.height + origScrollTop, 0), 1);

        this.publish(this.actor._parent.id, "scrollTop", scrollTop);
    }
}

export default {
    modules: [
        {
            name: "ScrollArea",
            actorBehaviors: [ScrollAreaActor],
            pawnBehaviors: [ScrollAreaPawn]
        },
        {
            name: "ScrollBar",
            actorBehaviors: [ScrollBarActor],
            pawnBehaviors: [ScrollBarPawn]
        }
    ]
}

/* globals Microverse */
