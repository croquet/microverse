// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {ModelService, ViewService} from "@croquet/worldcore-kernel";
import {THREE} from "../ThreeRender.js";
import {getTextGeometry, HybridMSDFShader, MSDFFontPreprocessor, getTextLayout} from "@croquet/hybrid-msdf-text";
import { CardActor, CardPawn } from "../card.js";
import loadFont from "load-bmfont";

import * as defaultFont from "../../assets/fonts/Roboto.json";

import {Doc, Warota, canonicalizeKeyboardEvent, fontRegistry} from "./warota.js";

// "Text Scale" to reconcile the bitmap font size, which is typically in the range of 50 pixels, and the 3D geometry size, which we tend to think one unit equates to a meter.
const TS = 0.0025;

const defaultModelMeasurer = new (getTextLayout(THREE))({font: defaultFont});

export class KeyFocusManager extends ViewService {
    constructor(name) {
        super(name || "KeyFocusManager");
        this.setKeyboardInput(null);

        this.hiddenInput = document.querySelector("#hiddenInput");
        this.copyElement = document.querySelector("#copyElement");

        if (!this.hiddenInput) {
            this.hiddenInput = document.createElement("input");
            this.hiddenInput.id = "hiddenInput";
            this.hiddenInput.style.setProperty("position", "absolute");

            this.hiddenInput.style.setProperty("left", "-120px"); //-120px
            this.hiddenInput.style.setProperty("top", "-120px");  // -120px
            this.hiddenInput.style.setProperty("transform", "scale(0)"); // to make sure the user never sees a flashing caret, for example on iPad/Safari

            this.hiddenInput.style.setProperty("width", "100px");
            this.hiddenInput.style.setProperty("height", "100px");
            document.body.appendChild(this.hiddenInput);

            this.hiddenInput.addEventListener("input", evt => {
                evt.stopPropagation();
                if (!this.keyboardInput) {return;}
                this.keyboardInput.input(evt);
            }, true);

            this.hiddenInput.addEventListener("keydown", evt => {
                evt.stopPropagation();
                if (!this.keyboardInput) {return;}
                this.keyboardInput.keyDown(evt);
            }, true);

            this.hiddenInput.addEventListener("copy", evt => {
                if (!this.keyboardInput) {return;}
                this.keyboardInput.copy(evt);
            });

            this.hiddenInput.addEventListener("paste", evt => {
                if (!this.keyboardInput) {return;}
                this.keyboardInput.paste(evt);
            });
        }

        if (!this.copyElement) {
            this.copyElement = document.createElement("input");
            this.copyElement.id = "copyElement";
            this.copyElement.style.setProperty("position", "absolute");

            this.copyElement.style.setProperty("left", "-120px"); //-120px
            this.copyElement.style.setProperty("top", "-120px");  // -120px
            this.copyElement.style.setProperty("transform", "scale(0)"); // to make sure the user never sees a flashing caret, for example on iPad/Safari

            this.copyElement.style.setProperty("width", "100px");
            this.copyElement.style.setProperty("height", "100px");
            document.body.appendChild(this.copyElement);
        }
    }

    setKeyboardInput(obj) {
        if (this.hiddenInput && !obj) {
            this.hiddenInput.blur();
        }
        this.keyboardInput = obj;
        if (obj) {
            this.hiddenInput.focus();
        }
    }

    destroy() {
        this.keyboardInput = null;

        this.hiddenInput = document.querySelector("#hiddenInput");

        if (this.hiddenInput) {
            this.hiddenInput.remove();
        }
        super.destroy();
    }
}

export class SyncedStateManager extends ViewService {
    constructor(name) {
        super(name || "SyncedStateManager");
        this.isSynced = false;
        this.subscribe(this.viewId, "synced", "synced");
    }

    synced(value) {
        console.log("synced manager", value);
        this.isSynced = value;
        // If a view object can handle synced, they can do it directly
        // so there is no need to indirect it from here.
        // this.publish(this.id, "synced", value);
    }
}

export class FontModelManager extends ModelService {
    static defaultFont() {return "Roboto";}
    init(name) {
        super.init(name || "FontModelManager");
        this.fonts = new Map();

        let {chars, common, info, kernings, pages} = defaultFont;
        this.askFont({name: info.face, font: {chars, common, info, kernings, pages}});
        this.subscribe(this.id, "askFont", this.askFont);

        this.loading = new Map();

        this.subscribe(this.id, "fontLoadStart", "fontLoadStart");
        this.subscribe(this.id, "fontLoadOne", "fontLoadOne");
        this.subscribe(this.id, "fontLoadDone", "fontLoadDone");

    }

    get(name) {
        return this.fonts.get(name);
    }

    keys() {
        return this.fonts.keys();
    }

    askFont(data) {
        if (data.font) {
            this.fonts.set(data.name, data.font);
        }
        this.publish(this.id, "fontAsked", data.name);
    }

    fontLoadStart({key, name}) {
        this.loading.set(key, {name, array: []});
    }

    fontLoadOne({key, buf}) {
        let data = this.loading.get(key);
        if (!data) {
            console.log("inconsistent message");
            return;
        }

        data.array.push(buf);
    }

    fontLoadDone(key) {
        let data = this.loading.get(key);
        if (!data) {
            console.log("inconsistent message");
            return;
        }

        let ary = data.array;

        let len = ary.reduce((acc, cur) => acc + cur.length, 0);

        let all = new Uint8Array(len);

        let ind = 0;

        for (let i = 0; i < ary.length; i++) {
            all.set(ary[i], ind);
            ind += ary[i].length;
        }

        let result = new TextDecoder("utf-8").decode(all);
        let font = JSON.parse(result);
        this.askFont({name: data.name, font});
        this.loading.delete(key);
    }
}

FontModelManager.register("FontModelManager");

export class FontViewManager extends ViewService {
    constructor(options, name) {
        super(name || "FontViewManager");
        this.fonts = new Map(); // {texture, _material}
        this.isLoading = {};
        this.fudgeFactors = new Map();
        this.fudgeFactors.set("Roboto", {yoffset: 30});
    }

    setModel(model) {
        this.model = model;
        for (let [name, font] of this.model.fonts.entries()) {
            this.askFont(name, font);
        }
    }

    get(name) {
        return this.fonts.get(name);
    }

    askFont(name, optFont) {
        if (this.fonts.get(name)) {return Promise.resolve(this.fonts.get(name));}
        if (this.isLoading[name]) {return this.isLoading[name];}

        let path = "./assets/fonts";
        let image = `${path}/${name}.png`;

        if (optFont) {
            this.isLoading[name] = Promise.resolve(optFont);
        } else {
            this.isLoading[name] = new Promise((resolve, reject) => {
                loadFont(`${path}/${name}.json`, (err, font) => {
                    if (err) reject(err);
                    resolve(font);
                })
            });
        }

        this.isLoading[name] = this.isLoading[name].then((font) => {
            let loader = new THREE.TextureLoader();
            return new Promise((resolve, reject) => {
                loader.load(
                    image,
                    (tex) => {
                        let preprocessor = new MSDFFontPreprocessor();
                        let cWidth = font.common ? font.common.scaleW : font.atlas.width;
                        let cHeight = font.common ? font.common.scaleH : font.atlas.height;
                        let img = new Image(cWidth, cHeight);
                        let canvas = document.createElement("canvas");
                        canvas.width = cWidth;
                        canvas.height = cHeight;
                        let ctx = canvas.getContext("2d");
                        ctx.drawImage(tex.image, 0, 0);
                        let inBitmap = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        let outImage = preprocessor.process(font, inBitmap.data);
                        ctx.putImageData(outImage, 0, 0);

                        let processedTexture = new THREE.Texture(outImage);
                        processedTexture.minFilter = THREE.LinearMipMapLinearFilter;
                        processedTexture.magFilter = THREE.LinearFilter;
                        processedTexture.generateMipmaps = true;
                        processedTexture.anisotropy = 1; // maxAni

                        img.src = canvas.toDataURL("image/png");
                        img.onload = () => {
                            processedTexture.needsUpdate = true;
                        };

                        this.fonts.set(name, {font, texture: processedTexture});
                        delete this.isLoading[name];

                        let maybeFont = this.model.fonts.get(name) ? null : font;
                        if (maybeFont) {
                            this.sendLargeFont(name, font);
                        } else {
                            this.publish(this.model.id, "askFont", {name});
                        }
                        resolve(this.fonts.get(name));
                    },
                    null,
                    () => {
                        this.isLoading[name] = false;
                        reject(new Error(`failed to load font: ${name}`));
                    });
            });
        });
        return this.isLoading[name];
    }

    sendLargeFont(name, font) {
        let string = JSON.stringify(font);

        let array = new TextEncoder().encode(string);

        let ind = 0;

        let key = Math.random();

        this.publish(this.model.id, "fontLoadStart", {key, name});
        while (ind < array.length) {
            let buf = array.slice(ind, ind + 2880);
            this.publish(this.model.id, "fontLoadOne", {key, buf});
            ind += 2880;
        }

        this.publish(this.model.id, "fontLoadDone", key);
    }

    destroy() {
        this.fonts.forEach((v, _k) => {
            if (v.material) {
                v.material.dispose();
                v.material = null;
            }
        });
    }
}

export class TextFieldActor extends CardActor {
    init(options) {
        this.fonts = this.service("FontModelManager");
        this.doc = new Doc({defaultFont: this.fonts.constructor.defaultFont(), defaultSize: 10});
        this.doc.load(options.runs || []);
        // this.doc.load([
        // {text: "ab c ke eke ekeke ekek eke ek eke ke ek eke ek ek ee  ke kee ke", style: {size: 24}},
        // ]);

        this.content = {runs: [], selections: {}, undoStacks: {}, timezone: 0, queue: [], editable: true};

        if (!options.textScale) {
            options.textScale =  TS;
        }

        super.init(options);
        this.subscribe(this.id, "load", "loadAndReset");
        this.subscribe(this.id, "editEvents", "receiveEditEvents");
        this.subscribe(this.id, "accept", "publishAccept");
        this.subscribe(this.id, "undoRequest", "undoRequest");
        this.subscribe(this.id, "setExtent", "setExtent");
        this.subscribe(this.sessionId, "view-exit", "viewExit");

        this.listen("dismiss", "dismiss");

        // the height part of this is optional, in the sense that the view may do something else

        let textWidth = options.width / options.textScale;
        let textHeight = options.height / options.textScale;
        this.setExtent({width: textWidth, height: textHeight});

        this.depth = options.depth || 0;

        if (!options.noDismissButton) {
            // that means that a change in readOnly should trigger this
            this.setupDismissButton();
        }

        if (options.readOnly) {
            let margins = options.margins;
            let marginsLeft = margins && margins.left !== undefined ? margins.left : 0;
            let marginsRight = margins && margins.right !== undefined ? margins.right : 0;

            let hMargin = marginsLeft + marginsRight;

            let measurement = defaultModelMeasurer.measureText(this.value);
            this.measurement = {
                width: (measurement.width + hMargin) * options.textScale,
                height: measurement.height * options.textScale
            };
        }
    }

    get pawn() {return TextFieldPawn;}

    static types() {
        return {"Warota.Doc": Doc};
    }

    load(stringOrArray) {
        let runs;
        if (typeof stringOrArray === "string") {
            runs = [{text: stringOrArray}];
        } else {
            runs = stringOrArray;
        }
        this.doc.load(runs);
        this.publishChanged();
        this.needsUpdate();
    }

    save() {
        return {runs: this.doc.runs, defaultFont: this.doc.defaultFont, defaultSize: this.doc.defaultSize};
    }

    setExtent(ext) {
        this.extent = ext;
    }

    loadAndReset(stringOrArray) {
        let runs;
        if (typeof stringOrArray === "string") {
            runs = [{text: stringOrArray}];
        } else {
            runs = stringOrArray;
        }
        this.content = {runs: runs, selections: {}, undoStacks: {}, timezone: 0, queue: [], editable: true};
        this.doc.load(runs);
        this.publishAccept();
        this.needsUpdate();
    }

    receiveEditEvents(events) {
        let [_timezone, hasDone] = this.doc.receiveEditEvents(events, this.content, this.doc);
        if (hasDone) {
            this.publishChanged();
        }

        this.needsUpdate();
    }

    publishAccept() {
        this.publish(this.id, "text", {id: this.id, text: this.doc.plainText()});
    }

    publishChanged() {
        this.publish(this.id, "changed", {id: this.id});
    }

    viewExit(viewId) {
        // we might have to clear the events of Warota in the view?
        delete this.content.selections[viewId];
        this.needsUpdate();
    }

    needsUpdate() {
        this.say("screenUpdate", this.content.timezone);
    }

    undoRequest(user) {
        let event;
        let queue = this.content.queue;
        for (let i = queue.length - 1; i >= 0; i--) {
            let e = queue[i];
            if (e.user.id === user.id && (e.type !== "snapshot" && e.type !== "select")) {
                event = queue[i];
                break;
            }
        }
        if (!event) {return;}

        this.doc.undoEvent(event, this.content, this.doc);
        this.needsUpdate();
    }

    setDefault(font, size) {
        return this.doc.setDefault(font, size);
    }

    styleAt(index) {
        return this.doc.styleAt(index);
    }

    updateOptions(options) {
        super.updateOptions(options);
        let textWidth = options.width / options.textScale;
        let textHeight = options.height / options.textScale;
        this.setExtent({width: textWidth, height: textHeight});
        if (this.dismissButton) {
            this.dismissButton.destroy();
        }
        if (!options.noDismissButton) {
            this.setupDismissButton();
        }
    }

    get value() {
        return this.doc.plainText();
    }

    set value(text) {
        return this.load(text);
    }

    setupDismissButton() {
        this.dismissButton = DismissButtonActor.create({
            type: "object",
            backgroundColor: this._cardData.backgroundColor,
            parent: this,
            translation: this.dismissButtonPosition(),
            noSave: true,
            color: 0x222222});
        /*

        this.createCard({
            translation: this.dismissButtonPosition(),
            name: 'dismiss text',
            behaviorModules: ["PropertySheetDismiss"],
            parent: this,
            type: "object",
            noSave: true,
            backgroundColor: this._cardData.backgroundColor,
            color: 0x222222
        });
        */

        this.subscribe(this.dismissButton.id, "dismiss", "dismiss");
    }

    dismissButtonPosition() {
        return [this._cardData.width / 2 - (0.072), this._cardData.height / 2 - (0.072), 0.06];
    }

    dismiss() {
        this.destroy();
    }
}

TextFieldActor.register("TextFieldActor");

export class TextFieldPawn extends CardPawn {
    constructor(actor) {
        super(actor);

        this.addToLayers("pointer");

        this.widgets = {};
        this.setupEditor();
        this.setupMesh();

        this.fonts = this.service("FontViewManager");

        this.listen("fontAsked", "fontAsked");
        this.listen("screenUpdate", "screenUpdate");

        this.setupFonts();
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerMove", "onPointerMove");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("keyDown", "keyDown");

        this.listen("cardDataSet", "cardDataUpdated");
    }

    destroy() {
        ["geometry", "material", "textGeometry", "textMaterial"].forEach((n) => {
            if (this[n]) {
                this[n].dispose();
            }
            this[n] = null;
        });
        super.destroy();
    }

    textScale() {
        return this.actor._cardData.textScale;
    }

    test() {
        // this.warota.insert(user, [{text: cEvt.key}]);
    }

    needsUpdate() {
        this.screenUpdate(this.warota.timezone);
    }

    randomColor(viewId) {
        let h = Math.floor(parseInt(viewId, 36) / (36 ** 10 / 360));
        let s = "40%";
        let l = "40%";
        return `hsl(${h}, ${s}, ${l})`;
    }

    cardDataUpdated(data) {
        if (data.o.backgroundColor !== data.v.backgroundColor || data.o.frameColor !== data.v.frameColor || data.o.fullBright !== data.v.fullBright) {
            let {depth, backgroundColor, frameColor, fullBright} = data.v;
            this.material = this.makePlaneMaterial(depth, backgroundColor, frameColor, fullBright);
            this.plane.material = this.material;
        }
    }

    changeMaterial(name, makeNew) {
        // we may still able to share the same material for all text instances
        // when we revive onbeforerender.
        if (this.textMaterial) {
            this.textMaterial.dispose();
        }
        let textMesh;
        if (!this.fonts.get(name)) {return;}
        let texture = this.fonts.get(name).texture;
        this.textMaterial = new THREE.RawShaderMaterial(HybridMSDFShader({
            map: texture,
            textureSize: texture.image.width,
            side: THREE.DoubleSide,
            transparent: true,
        }, THREE));

        if (makeNew) {
            textMesh = new THREE.Mesh(this.textGeometry, this.textMaterial);
            textMesh.name = "text";
        }
        return textMesh;
    }

    setupFonts() {
        let fontName = this.actor.doc.defaultFont;
        this.fontAsked(fontName).then(() => {
            let fonts = Array.from(this.actor.fonts.keys());
            let ps = fonts.map((v) => this.fonts.askFont(v));
            return Promise.all(ps);
        }).then(() => {
            this.warota.resetMeasurer();
            this.needsUpdate();
        });
    }

    setupTextMesh(name, font, color) {
        if (!this.textGeometry) {
            let TextGeometry = getTextGeometry(THREE);
            this.textGeometry = new TextGeometry({defaultColor: new THREE.Color(color)});

            this.textMesh = this.changeMaterial(name, true);
            this.plane.add(this.textMesh);
        }

        let layout = fontRegistry.hasLayout(name);
        if (!layout) {
            let TextLayout = getTextLayout(THREE);
            layout = new TextLayout({font});
            fontRegistry.addLayout(name, layout);
        }
    }

    setupScrollMesh() {
        let geom = new THREE.PlaneGeometry(0.1, 5);
        let mat = new THREE.MeshBasicMaterial({color: 0xFF0000, side: THREE.DoubleSide});
        this.scrollMesh = new THREE.Mesh(geom, mat);
        this.scrollMesh.name = "scroll";
        this.scrollMesh.position.set(2.5, 0, 0.001);

        let knobGeom = new THREE.PlaneGeometry(0.1, 0.1);
        let knobMat = new THREE.MeshBasicMaterial({color: 0x00FF00, side: THREE.DoubleSide});
        this.scrollKnobMesh = new THREE.Mesh(knobGeom, knobMat);
        this.scrollKnobMesh.name = "scrollKnob";

        this.scrollKnobMesh.position.set(0, 2.5, 0.001);
        this.scrollMesh.add(this.scrollKnobMesh);
        this.plane.add(this.scrollMesh);
    }

    updateMesh(stringInfo) {
        let {fontName, drawnStrings} = stringInfo;
        if (!this.fonts.get(fontName)) {return;}
        let font = this.fonts.get(fontName).font;

        let fudgeFactor = this.fonts.fudgeFactors.get(fontName);

        let layout = fontRegistry.hasLayout(fontName);
        if (!layout) {return;}

        let glyphs = layout.computeGlyphs({font, drawnStrings, fudgeFactor});

        this.textMesh.scale.x = this.textScale();
        this.textMesh.scale.y = -this.textScale();
        this.textGeometry.update({font, glyphs});
    }

    updateShape(options) {
        super.updateShape(options);
        ["geometry", "material", "textGeometry", "textMaterial"].forEach((n) => {
            if (this[n]) {
                this[n].dispose();
            }
            this[n] = null;
        });

        this.setupMesh();
        this.setupFonts();
    }

    setupMesh() {
        let depth = this.actor._cardData.depth || 0.01;
        let cornerRadius = this.actor._cardData.cornerRadius || 0.05;
        let {backgroundColor, frameColor, fullBright} = this.actor._cardData;

        if (!backgroundColor) {
            backgroundColor = 0xFFFFFF;
        }
        if (!frameColor) {
            frameColor = 0x666666;
        }
        if (fullBright === undefined) {
            fullBright = false;
        }
        if (depth === 0) {
            this.geometry = new THREE.PlaneGeometry(0, 0);
        } else {
            this.geometry = this.roundedCornerGeometry(0, 0, depth, cornerRadius);
        }

        let material = this.makePlaneMaterial(depth, backgroundColor, frameColor, fullBright);
        this.material = material;
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.plane.castShadow = true;
        this.plane.name = this.actor.name;
        this.shape.add(this.plane);

        this.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(0, 1, 0),  0),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)
        ];
    }

    setupEditor() {
        let font = this.actor.doc.defaultFont;
        let fontSize = this.actor.doc.defaultSize;
        let extent = this.actor.extent;
        let autoResize = this.actor._cardData.autoResize;
        let singleLine = this.actor._cardData.singleLine;
        let margins =  this.actor._cardData.margins;
        let options = {width: extent.width, height: extent.height, font, fontSize, autoResize, singleLine, margins};

        this.warota = new Warota(options, this.actor.doc);
        this.warota.width(extent.width);
        this.options = options;

        this.user = {id: this.viewId, color: this.randomColor(this.viewId)};
        this.selections = {}; // {user: {bar: mesh, boxes: [mesh]}}

        this.subscribe(this.viewId, "synced", "synced");
    }

    fontAsked(fontName) {
        return this.fonts.askFont(fontName).then((font) => {
            return this.setupTextMesh(fontName, font.font, this.actor._cardData.color || 0x000000);
        }).then(() => {
            this.warota.resetMeasurer();
            return this.screenUpdate(this.warota.timezone);
        });
    }

    computeClippingPlanes(ary) {
        //let [top, bottom, right, left] = ary; this is the order
        let planes = [];
        let text = this.plane;
        if (Number.isNaN(text.matrixWorld.elements[0])) return [];
        for (let i = 0; i < 4; i++) {
            planes[i] = new THREE.Plane();
            planes[i].copy(this.clippingPlanes[i]);
            planes[i].constant = ary[i];
            planes[i].applyMatrix4(text.matrixWorld);
        }
        return planes;
    }

    setWidth(pixels) {
        this.publish(this.actor.id, "setWidth", pixels);
        this.width(pixels);
    }

    width(pixels) {
        this.warota.width(pixels);
        this.screenUpdate(this.warota.timezone);
    }

    synced(value) {
        this.isSynced = value;
        if (!this.isSynced) {return;}
        this.warota.resetMeasurer();
        this.screenUpdate(this.warota.timezone);
    }

    getSynced() {
        let sm = this.service("SyncedStateManager");
        if (sm) {
            return sm.isSynced;
        }

        return this.isSynced;
    }

    accept() {
        this.publish(this.actor.id, "accept");
    }

    cookEvent(evt) {
        if (!evt.xyz) {return;}
        let vec = new THREE.Vector3(...evt.xyz);
        let inv = this.renderObject.matrixWorld.clone().invert();
        let vec2 = vec.applyMatrix4(inv);

        let width = this.plane.geometry.parameters.width;
        let height = this.plane.geometry.parameters.height;

        let x = ((width / 2) + vec2.x) / this.textScale();
        let y = ((height / 2) - vec2.y) / this.textScale();

        return {x, y};
    }

    onPointerDown(evt) {
        if (this.actor._cardData.readOnly) {return;}
        let fm = this.service("KeyFocusManager");
        fm.setKeyboardInput(this);

        let cooked = this.cookEvent(evt);
        if (!cooked) {return;}
        this.warota.mouseDown(cooked.x, cooked.y, cooked.y, this.user);
    }

    onPointerMove(evt) {
        if (this.actor._cardData.readOnly) {return;}
        let cooked = this.cookEvent(evt);
        if (!cooked) {return;}
        this.warota.mouseMove(Math.max(cooked.x, 0), cooked.y, cooked.y, this.user);
        this.changed();
    }

    onPointerUp(evt) {
        if (this.actor._cardData.readOnly) {return;}
        let cooked = this.cookEvent(evt);
        if (!cooked) {return;}
        this.warota.mouseUp(cooked.x, cooked.y, cooked.y, this.user);
        this.changed();
    }

    newCanonicalizeEvent(evt) {
        if (evt.type === "input" && evt.inputType === "insertText" && !evt.isComposing) {
            let fm = this.service("KeyFocusManager");
            let key = fm.hiddenInput.value;
            fm.hiddenInput.value = "";
            let spec = {
                keyCombo: "",
                key: key,
                shiftKey: false,
                altKey: false,
                ctrlKey: false,
                metaKey: false,
                altGraphKey: false,
                isFunctionKey: false,
                isModified: false,
                onlyModifiers: false,
                onlyShiftModifier: null,
                type: evt.type,
                keyCode: evt.keyCode
            };
            return spec;
        }
        return null;
    }

    eventFromField() {
        let fm = this.service("KeyFocusManager");
        let key = fm.hiddenInput.value;
        fm.hiddenInput.value = "";
        let spec = {
            keyCombo: "",
            key: key,
            shiftKey: false,
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            altGraphKey: false,
            isFunctionKey: false,
            isModified: false,
            onlyModifiers: false,
            onlyShiftModifier: null,
            type: "",
            keyCode: 0
        };
        return spec;
    }

    simpleInput(text, evt) {
        let user = this.user;
        let selection = this.actor.content.selections[this.viewId];
        let style = this.actor.styleAt(Math.max(selection ? selection.start - 1 : 0, 0));

        this.warota.insert(user, [{text, style}]);
        this.changed(true);
        evt.preventDefault();
        return true;
    }

    input(evt) {
        if (this.actor._cardData.readOnly) {return;}
        let cEvt = this.newCanonicalizeEvent(evt);
        if (!cEvt) {return false;}
        let user = this.user;
        let selection = this.actor.content.selections[this.viewId];
        let style = this.actor.styleAt(Math.max(selection ? selection.start - 1 : 0, 0));
        this.warota.insert(user, [{text: cEvt.key, style: style}]);
        this.changed(true);
        evt.preventDefault();
        return true;
    }

    keyDown(evt) {
        let cEvt;
        if (evt.key === "Enter") {
            let hiddenInput = this.service("KeyFocusManager").hiddenInput;
            if (hiddenInput.value !== "") {
                hiddenInput.value = "";
                cEvt = this.eventFromField();
            } else {
                cEvt = canonicalizeKeyboardEvent(evt);
            }
        } else {
            cEvt = canonicalizeKeyboardEvent(evt);
        }

        let user = this.user;
        if (!cEvt) {return true;}

        if (cEvt.onlyModifiers) {return true;}

        // what has to happen here is that the kinds of keycombo that browser need to pass
        // through, and the kinds that the editor handles are different.
        // We need to separated them, and for the latter, the text commands list has
        // to be tested here.
        if (["Meta-S", "Ctrl-S", "Alt-S"].includes(cEvt.keyCombo)) {
            this.accept();
            evt.preventDefault();
            return true;
        }

        if (["Meta-Z", "Ctrl-Z", "Alt-Z"].includes(cEvt.keyCombo)) {
            this.undo();
            evt.preventDefault();
            return true;
        }

        if (["Meta-C", "Ctrl-C", "Alt-C"].includes(cEvt.keyCombo)) {
            this.copy();
            evt.preventDefault();
            return true;
        }

        if (["Meta-X", "Ctrl-X", "Alt-X"].includes(cEvt.keyCombo)) {
            this.cut();
            evt.preventDefault();
            return true;
        }

        if (["Meta-V", "Ctrl-V", "Alt-V"].includes(cEvt.keyCombo)) {
            this.paste();
            evt.preventDefault();
            return true;
        }

        if (cEvt.keyCode === 13) {
            if (this.actor["enterToAccept"]) {
                evt.preventDefault();
                this.accept();
                return true;
            }
            return this.simpleInput("\n", evt);
        }
        if (cEvt.keyCode === 32) {
            return this.simpleInput(" ", evt);
        }
        if (cEvt.keyCode === 9) {
            return this.simpleInput("\t", evt);
        }

        const handled = this.warota.handleKey(user, cEvt.keyCode, cEvt.shiftKey, cEvt.ctrlKey || cEvt.metaKey);

        if (!handled && !(cEvt.ctrlKey || cEvt.metaKey)) {
            this.warota.insert(user, [{text: cEvt.key}]);
            this.changed(true);
            evt.preventDefault();
            return true;
        }
        if (handled) {
            evt.preventDefault();
            this.changed(true);
        }
        return false;
    }

    copy(_evt) {
        let isiOSDevice = navigator.userAgent.match(/ipad|iphone/i);
        let text = this.warota.selectionText(this.user);

        let clipboardAPI = () => {
            if (navigator.clipboard) {
                return navigator.clipboard.writeText(text).then(() => true, () => false);
            }
            return Promise.resolve(false);
        };

        clipboardAPI().then((result) => {
            if (!result) {
                let { copyElement } = this.service("KeyFocusManager");

                if (!isiOSDevice) {
                    copyElement.value = text;
                    copyElement.select();
                    copyElement.setSelectionRange(0, 99999);
                    document.execCommand("copy");
                    return;
                }

                let range = document.createRange();
                range.selectNodeContents(copyElement);
                copyElement.textContent = text;

                let selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);

                copyElement.setSelectionRange(0, 100000);
                document.execCommand('copy');
            }
        });
    }

    cut(evt) {
        this.copy(evt);
        this.warota.insert(this.user, [{text: ""}]);//or something else to keep undo sane?
        this.changed(true);
        return true;
    }

    paste(_evt) {
        //let isiOSDevice = navigator.userAgent.match(/ipad|iphone/i);

        let clipboardAPI = () => {
            if (navigator.clipboard) {
                return navigator.clipboard.readText().then((text) => text, () => null);
            }
            return Promise.resolve(null);
        };

        return clipboardAPI().then((result) => {
            if (result === null) {
                let { copyElement } = this.service("KeyFocusManager");
                copyElement.focus();
                copyElement.textContent = "";
                document.execCommand("paste");
                return copyElement.textContent;
            }
            return result;
        }).then((text) => {
            this.warota.insert(this.user, [{text: text}]);
            // evtxo.preventDefault();
            this.changed(true);
        });
    }

    undo() {
        this.publish(this.actor.id, "undoRequest", this.user);
    }

    changed(toScroll) {
        let events = this.warota.events;
        this.warota.resetEvents();
        if (events.length > 0) {
            this.scrollNeeded = !this.singleLine && toScroll;
            this.publish(this.actor.id, "editEvents", events);
        }
    }

    screenUpdate(timezone) {
        this.warota.timezone = timezone;
        if (!this.getSynced()) {return;}
        this.warota.layout();
        this.showText();
        this.setExtent();
        this.showSelections();
        if (this.scrollNeeded) {
            this.scrollNeeded = false;
            this.scrollSelectionToView();
        }
    }

    showText() {
        let drawnStrings = [];
        for (let i = 0; i < this.warota.words.length - 1; i++) {
            let word = this.warota.words[i];
            let str = {
                x: word.left,
                y: word.top,
                string: word.text,
                style: word.style && word.style.color
            };
            drawnStrings.push(str);
        }

        let extent = this.actor.extent;

        this.updateMesh({fontName: this.warota.doc.defaultFont, extent, drawnStrings});
    }

    setStyle(style) {
        this.warota.setStyle(this.user, style, false);
        this.changed();
    }

    mergeStyle(style) {
        this.warota.setStyle(this.user, style, true);
        this.changed();
    }

    setExtent() {
        let extent = this.actor.extent;
        let depth = this.actor.depth;
        let cornerRadius = this.actor._cardData.cornerRadius || 0.05;
        let autoResize = this.actor._cardData.autoResize;
        if (!this.textMesh) {return;}
        let newWidth = (autoResize ? this.warota.newWidth : extent.width) * this.textScale();
        let newHeight = (autoResize ? this.warota.docHeight : extent.height) * this.textScale();
        if (newWidth !== this.plane.geometry.parameters.width ||
            newHeight !== this.plane.geometry.parameters.height ||
            depth !== this.plane.geometry.parameters.depth) {
            let geometry = depth === 0 ? new THREE.PlaneGeometry(newWidth, newHeight) : this.roundedCornerGeometry(newWidth, newHeight, depth, cornerRadius);
            this.plane.geometry = geometry;
            this.geometry.dispose();
            this.geometry = geometry;
        }

        this.textMesh.position.x = -newWidth / 2;
        this.textMesh.position.y = newHeight / 2;
        this.textMesh.position.z = depth + 0.005;

        let bounds = {left: 0, top: 0, bottom: newHeight / this.textScale(), right: newWidth / this.textScale()};
        this.textMesh.material.uniforms.corners.value = new THREE.Vector4(bounds.left, bounds.top, bounds.right, bounds.bottom);
    }

    setTextRenderingBounds(bounds) {
        this.textMesh.material.uniforms.corners.value = new THREE.Vector4(bounds.left, bounds.top, bounds.right, bounds.bottom);
    }

    ensureSelection(id) {
        let sel = this.selections[id];
        let modelSel = this.actor.content.selections[id];
        let color = modelSel.color;
        if (!color) {
            color = "blue";
        }
        if (!sel) {
            const bar = new THREE.Mesh(new THREE.PlaneBufferGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({color}));

            bar.onBeforeRender = this.selectionBeforeRender.bind(this);

            bar.visible = false;
            this.plane.add(bar);
            bar.name = "caret";
            // plane.onBeforeRender = this.selectionBeforeRender.bind(this);

            let boxes = [];
            for (let i = 0; i < 3; i++) {
                let box = new THREE.Mesh(new THREE.PlaneBufferGeometry(0, 0), new THREE.MeshBasicMaterial({color}));
                box.onBeforeRender = this.selectionBeforeRender.bind(this);
                box.visible = false;
                box.name = `box${i}`;
                this.plane.add(box);
                boxes.push(box);
            }
            sel = {bar, boxes};
        }
        this.selections[id] = sel;
        return sel;
    }

    showSelections() {
        let depth = this.actor.depth || 0;
        let unused = {};
        for (let k in this.selections) {
            unused[k] = this.selections[k];
        }

        let ts = this.textScale();

        for (let k in this.actor.content.selections) {
            delete unused[k];
            let thisSelection = this.ensureSelection(k);
            thisSelection.boxes.forEach(box => box.visible = false);
            let selection = this.actor.content.selections[k];

            let width = this.plane.geometry.parameters.width;
            let height = this.plane.geometry.parameters.height;

            if (selection.end === selection.start) {
                let caret = thisSelection.bar;
                caret.visible = true;
                let caretRect = this.warota.barRect(selection);
                caretRect.width = ts <= 0.001 ? 5 : 2;
                let geom = new THREE.PlaneBufferGeometry(caretRect.width * ts, caretRect.height * ts);
                let old = caret.geometry;
                caret.geometry = geom;
                if (old) {
                    old.dispose();
                }

                let left = (-width / 2) + (caretRect.left + 6) * ts; // ?
                let top = (height / 2) - (caretRect.top + caretRect.height / 2 + 4) * ts;
                caret.position.set(left, top, depth + 0.001);
            } else {
                let rects = this.warota.selectionRects(selection);
                let boxes = thisSelection.boxes;
                for (let i = 0; i < 3; i++) {
                    let box = boxes[i];
                    let rect = rects[i];
                    box.visible = false;

                    if (rect) {
                        let left = (-width / 2) + ((rect.width / 2) + rect.left + 8) * ts; // ?
                        let top = (height / 2) - (rect.top + rect.height / 2 + 4) * ts;
                        let rWidth = rect.width * ts; // ?
                        let rHeight = rect.height * ts;

                        let geom = new THREE.PlaneBufferGeometry(rWidth, rHeight, 2, 2);
                        box.geometry = geom;
                        box.position.set(left, top, depth + 0.001);
                        box.visible = true;
                    }
                }
            }
        }
        for (let k in unused) {
            this.selections[k].bar.remove();
            this.selections[k].boxes.forEach(box => box.remove());
            delete this.selections[k];
        }
        this.publish(this.id, "selectionUpdated");
    }

    scrollSelectionToView() {
        /*
        let scrollTop = this.dom.scrollTop;
        let viewHeight = parseFloat(this.dom.style.getPropertyValue("height"));
        let selection = this.model.content.selections[this.viewId];
        if (!selection) {return;}
        if (selection.end !== selection.start) {return;}
        let caretRect = this.warota.barRect(selection);

        if (caretRect.top + caretRect.height > viewHeight + scrollTop) {
            this.dom.scrollTop = caretRect.top + caretRect.height - viewHeight;
        } else if (caretRect.top < scrollTop) {
            this.dom.scrollTop = caretRect.top;
        }
        */
    }

    selectionBeforeRender(renderer, scene, camera, geometry, material, _group) {
        /*
        let meterInPixel = this.model.extent.width / 0.01;
        let scrollT = this.warota.scrollTop;
        let docHeight = this.warota.docHeight;
        let docInMeter = docHeight * meterInPixel;
        let top = -scrollT * docHeight;
        let bottom = -(top - 0.01);
        let right = 0.01 * (1.0 - this.warota.relativeScrollBarWidth);
        let left = 0;
        */

        let left = 2.5;
        let right = 2.5;
        let bottom = 2.5;
        let top = 2.5;
        let planes = this.computeClippingPlanes([top, bottom, right, left]);
        material.clippingPlanes = planes;
    }

    addWidget(name, dom) {
        if (this.widgets[name]) {
            this.removeWidget(name, dom);
        }
        this.widgets[name] = dom;
        this.selectionPane.appendChild(dom);
    }

    removeWidget(name, dom) {
        delete this.widgets[name];
        dom.remove();
    }

    get hitNormal() {
        return [0, 0, 1];
    }
}

class DismissButtonActor extends CardActor {
    init(options) {
        super.init({...options, multiusser: true});
    }

    get pawn() {return DismissButtonPawn;}
}

DismissButtonActor.register("DismissButtonActor");

export class DismissButtonPawn extends CardPawn {
    constructor(actor) {
        super(actor);
        this.addToLayers("pointer");

        if (this.back) {
            this.shape.remove(this.back);
            this.shape.children = [];
        }

        let backgroundColor = (this.actor._cardData.backgroundColor !== undefined)
            ? this.actor._cardData.backgroundColor
            : 0xcccccc;

        let color = (this.actor._cardData.color !== undefined)
            ? this.actor._cardData.color
            : 0x222222;

        let backGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.00001);
        let backMaterial = new THREE.MeshStandardMaterial({
            color: backgroundColor,
            side: THREE.DoubleSide
        });

        this.back = new THREE.Mesh(backGeometry, backMaterial);

        let dismissGeometry = new THREE.BoxGeometry(0.07, 0.02, 0.001);
        let dismissMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide
        });

        let button = new THREE.Mesh(dismissGeometry, dismissMaterial);
        button.position.set(0, 0, 0.00001);

        this.back.add(button)

        this.shape.add(this.back);

        this.addEventListener("pointerDown", "dismiss");
    }

    dismiss(_evt) {
        this.publish(this.actor.id, "dismiss");
    }
}
