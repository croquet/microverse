import {THREE, AM_Spatial, PM_Dynamic, PM_Spatial, PM_ThreeVisible, PM_Focusable, Actor, Pawn, mix} from "@croquet/worldcore";
// import {canonicalizeKeyboardEvent} from "./text-commands.js";
import {getTextGeometry, HybridMSDFShader, MSDFFontPreprocessor, getTextLayout} from "hybrid-msdf-text";
import loadFont from "load-bmfont";
import {Doc, Warota} from "./warota.js";
import {eof} from "./wrap.js";

export class TextFieldActor extends mix(Actor).with(AM_Spatial) {
    init(...args) {
        this.doc = new Doc();
        this.doc.load([]);
        // this.doc.load([
        // {text: "ab c ke eke ekeke ekek eke ek eke ke ek eke ek ek ee  ke kee ke", style: {size: 24}},
        // ]);

        this.content = {runs: [], selections: {}, undoStacks: {}, timezone: 0, queue: [], editable: true};
        this.fonts = new Map();

        super.init(...args);

        this.subscribe(this.id, "editEvents", "receiveEditEvents");
        this.subscribe(this.id, "accept", "publishAccept");
        this.subscribe(this.id, "undoRequest", "undoRequest");
        this.subscribe(this.id, "setWidth", "setWidth");
        this.subscribe(this.sessionId, "view-exit", "viewExit");

        this.listen("askFont", "askFont");

        this.text = {
            extent: {width: 500, height: 50},
            fontName: "DejaVu Sans Mono",
            drawnStrings: [
                {x: 0, y: 0, string: "Croquet is awesome!", style: "blue"}
            ]
        };
    }

    get pawn() {return TextFieldPawn;}

    static types() {
        return {"Warota.Doc": Doc};
    }

    setWidth(pixelWidth) {
        let cssWidth = pixelWidth + "px";
        this.style.setProperty("width", cssWidth);
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

    loadAndReset(string) {
        let runs = [{text: string}];
        this.content = {runs: runs, selections: {}, undoStacks: {}, timezone: 0, queue: [], editable: true};
        this.doc.load(runs);
        this.publishChanged();
        this.needsUpdate();
    }

    receiveEditEvents(events) {
        let [timezone, hasDone] = this.doc.receiveEditEvents(events, this.content, this.doc);
        if (hasDone) {
            this.publishChanged();
        }

        this.publish(this.id, "screenUpdate", timezone);
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
        this.say("changed");
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

        let timezone = this.doc.undoEvent(event, this.content, this.doc);
        this.publish(this.id, "screenUpdate", timezone);
    }

    setDefault(font, size) {
        return this.doc.setDefault(font, size);
    }

    askFont(data) {
        console.log(data);
        this.fonts.set(data.name, data.font);
        this.say("fontAsked", data.name);
    }

    styleAt(index) {
        return this.doc.styleAt(index);
    }

    get value() {
        return this.doc.plainText();
    }

    set value(text) {
        return this.load(text);
    }
}

TextFieldActor.register("TextFieldActor");

export class TextFieldPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_Dynamic) {
    constructor(model) {
        super(model);
        this.model = model;
        // this.subscribe(this.model.id, "screenUpdate", "screenUpdate");

        this.widgets = {};
        this.hiddenInput = document.createElement("input");
        this.hiddenInput.style.setProperty("position", "absolute");
        this.hiddenInput.style.setProperty("left", "-120px"); //-100
        this.hiddenInput.style.setProperty("top", "-120px");  // -100
        this.hiddenInput.style.setProperty("transform", "scale(0)"); // to make sure the user never sees a flashing caret, for example on iPad/Safari

        this.hiddenInput.style.setProperty("width", "100px");
        this.hiddenInput.style.setProperty("height", "100px");

        this.hiddenInput.addEventListener("input", evt => this.input(evt), true);
        this.hiddenInput.addEventListener("keydown", evt => this.keyDown(evt), true);
        this.hiddenInput.addEventListener("copy", evt => this.copy(evt));
        this.hiddenInput.addEventListener("cut", evt => this.cut(evt));
        this.hiddenInput.addEventListener("paste", evt => this.paste(evt));
        document.body.appendChild(this.hiddenInput);

        this.setupEditor();
        this.setupMesh();

        this.fonts = {};
        this.isLoading = {};

        this.setupDefaultFont();

        this.listen("fontAsked", "askFont");

        this.model.fonts.forEach((_f, n) => {
            this.askFont(n);
        });

    }

    destroy() {
        super.destroy();

        ["geometry", "material", "textGeometry", "textMaterial"].forEach((n) => {
            if (this[n]) {
                this[n].dispose();
                this[n] = null;
            }
        });

        if (this.hiddenInput) {
            this.hiddenInput.remove();
        }
    }

    test() {
        // this.warota.insert(user, [{text: cEvt.key}]);
    }

    randomColor(viewId) {
        let h = Math.floor(parseInt(viewId, 36) / (10 ** 36 / 360));
        let s = "40%";
        let l = "40%";
        return `hsl(${h}, ${s}, ${l})`;
    }

    changeMaterial(name, makeNew) {
        if (!this.fonts[name]) {return;}
        if (!this.fonts[name].material) {
            let texture = this.fonts[name].texture;
            this.fonts[name].material = new THREE.RawShaderMaterial(HybridMSDFShader({
                map: texture,
                textureSize: texture.image.width,
                side: THREE.DoubleSide,
                transparent: true,
            }, THREE));
        }

        if (makeNew) {
            this.textMesh = new THREE.Mesh(this.textGeometry, this.fonts[name].material);
        } else {
            let m = this.textMesh.material;
            this.textMesh.material = this.fonts[name].material;
            if (m) {
                m.dispose();
            }
        }
    }

    setupTextMesh(name) {
        if (!this.textGeometry) {
            let TextGeometry = getTextGeometry(THREE);
            this.textGeometry = new TextGeometry({});

            this.changeMaterial(name, true);
            this.plane.add(this.textMesh);
            this.updateString();
        }
    }

    updateString(retry) {
        // will be this model.doc
        let stringInfo = this.model.text;
        let {fontName, extent, drawnStrings} = stringInfo;

        if (!this.fonts[fontName]) {
            this.askFont(fontName).then(() => {
                if (!retry) {
                    this.updateString(true);
                }
            });
            return;
        }

        let font = this.fonts[fontName].font;
        drawnStrings = drawnStrings.map(spec => ({...spec, font: font}));

        let TextLayout = getTextLayout(THREE);
        let layout = new TextLayout({font});
        let glyphs = layout.computeGlyphs({font, drawnStrings});

        this.textMesh.scale.x = 0.01;
        this.textMesh.scale.y = -0.01;

        let newWidth = extent.width * 0.01;
        let newHeight = extent.height * 0.01;

        if (newWidth !== this.plane.geometry.parameters.width ||
            newHeight !== this.plane.geometry.parameters.height) {
            let geometry = new THREE.PlaneGeometry(newWidth, newHeight);
            this.plane.geometry = geometry;
            this.geometry.dispose();
            this.geometry = geometry;

            this.textMesh.position.x = -newWidth / 2;
            this.textMesh.position.y = newHeight / 2;
            this.textMesh.position.z = 0.005;
        }
        this.textGeometry.update({font, glyphs});
        let bounds = {left: 0, top: 0, bottom: extent.height, right: extent.width};
        this.fonts[fontName].material.uniforms.corners.value = new THREE.Vector4(bounds.left, bounds.top, bounds.right, bounds.bottom);
    }

    setupMesh() {
        this.geometry = new THREE.PlaneGeometry(0, 0);
        this.material = new THREE.MeshBasicMaterial({color: 0xFCFCFC, side: THREE.DoubleSide});
        this.plane = new THREE.Mesh(this.geometry, this.material);

        this.setRenderObject(this.plane);

        this.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(0, 1, 0),  0),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)
        ];
    }

    setupEditor() {
        let font = this.model.doc.defaultFont;
        let fontSize = this.model.doc.defaultSize;
        let options = {width: 800, height: 800, font, fontSize};
        this.singleLine = true;
        if (this.singleLine) {
            options.singleLine = true;
        }

        this.warota = new Warota(options, this.model.doc);
        this.options = options;

        this.user = {id: this.viewId, color: this.randomColor(this.viewId)};
        this.selections = {}; // {user: {bar: div, boxes: []}}

        this.subscribe(this.viewId, "synced", "synced");
        this.screenUpdate(this.warota.timezone);
    }

    setupDefaultFont() {
        let fontName = "DejaVu Sans Mono";
        this.askFont(fontName, true).then(() => {
            this.setupTextMesh(fontName);
        });
    }

    askFont(name, me) {
        if (this.fonts[name]) {return Promise.resolve(null);}
        if (this.isLoading[name]) {return Promise.resolve(null);}
        this.isLoading[name] = true;
        console.log("start loading");

        let path = "./assets/fonts";
        let image = `${path}/${name}.png`;

        return new Promise((resolve, reject) => {
            loadFont(`${path}/${name}.json`, (err, font) => {
                if (err) throw err;
                let loader = new THREE.TextureLoader();
                loader.load(
                    image,
                    (tex) => {
                        console.log('begin registering');
                        let preprocessor = new MSDFFontPreprocessor();
                        let img = new Image(font.common.scaleW, font.common.scaleH);
                        let canvas = document.createElement("canvas");
                        canvas.width = font.common.scaleW;
                        canvas.height = font.common.scaleH;
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
                            console.log('in onload for img');
                            processedTexture.needsUpdate = true;
                        };

                        this.fonts[name] = {font, texture: processedTexture};
                        delete this.isLoading[name];
                        if (me) {
                            this.say("askFont", {name, font});
                        }
                        resolve(this.fonts[name]);
                    },
                    null,
                    () => {
                        this.isLoading[name] = false;
                        reject(new Error(`failed to load font: ${name}`));
                    });
            });
        });
    }

    computeClippingPlanes(ary) {
        //let [top, bottom, right, left] = ary; this is the order
        let planes = [];
        let text = this.textMesh;
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
        this.publish(this.model.id, "setWidth", pixels);
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

    accept() {
        this.publish(this.model.id, "accept");
    }

    apply(time, elem, world) {
        super.apply(time, elem, world);
        let w = elem.style.getPropertyValue("width");
        this.width(parseInt(w, 10));

        if (this._lastValues.get("enterToAccept") !== this.model._get("enterToAccept")) {
            let accept = this.model._get("enterToAccept");
            this._lastValues.set("enterToAccept", accept);
            if (accept) {
                this.dom.style.setProperty("overflow", "hidden");
                this.text.style.setProperty("overflow", "hidden");
            } else {
                this.dom.style.removeProperty("overflow");
                this.text.style.removeProperty("overflow");
            }
        }
        this.screenUpdate(this.warota.timezone);
    }

    cookEvent(evt) {
        console.log(evt);
    }

    pointerDown(evt) {
        this.warota.mouseDown(evt.x, evt.y, evt.y, this.user);
        this.changed();
    }

    pointerMove(evt) {
        this.warota.mouseMove(Math.max(evt.x, 0), evt.y, evt.y, this.user);
        this.changed();
    }

    pointerUp(evt) {
        this.warota.mouseUp(evt.x, evt.y, evt.y, this.user);
        this.changed();
    }

    newCanonicalizeEvent(evt) {
        if (evt.type === "input" && evt.inputType === "insertText" && !evt.isComposing) {
            let key = this.hiddenInput.value;
            this.hiddenInput.value = "";
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
        let key = this.hiddenInput.value;
        this.hiddenInput.value = "";
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
        let selection = this.model.content.selections[this.viewId];
        let style = this.model.styleAt(Math.max(selection ? selection.start - 1 : 0, 0));

        this.warota.insert(user, [{text, style}]);
        this.changed(true);
        evt.preventDefault();
        return true;
    }

    input(evt) {
        let cEvt = this.newCanonicalizeEvent(evt);
        if (!cEvt) {return false;}
        let user = this.user;
        let selection = this.model.content.selections[this.viewId];
        let style = this.model.styleAt(Math.max(selection ? selection.start - 1 : 0, 0));
        this.warota.insert(user, [{text: cEvt.key, style: style}]);
        this.changed(true);
        evt.preventDefault();
        return true;
    }

    keyDown(evt) {
        let cEvt;
        if (evt.key === "Enter") {
            if (this.hiddenInput.value !== "") {
                this.hiddenInput.value = "";
                //cEvt = this.eventFromField();
            } else {
                // cEvt = canonicalizeKeyboardEvent(evt);
            }
        } else {
            // cEvt = canonicalizeKeyboardEvent(evt);
        }

        let user = this.user;
        if (!cEvt) {return true;}

        if (cEvt.onlyModifiers) {return true;}

        // what has to happen here is that the kinds of keycombo that browser need to pass
        // through, and the kinds that the editor handles are different.
        // We need to separated them, and for the latter, the text commands list has
        // to be tested here.
        if (cEvt.keyCombo === "Meta-S" || cEvt.keyCombo === "Ctrl-S") {
            this.accept();
            evt.preventDefault();
            return true;
        }

        if (cEvt.keyCombo === "Meta-Z" || cEvt.keyCombo === "Ctrl-Z") {
            this.undo();
            evt.preventDefault();
            return true;
        }

        if (cEvt.keyCode === 13) {
            if (this.model._get("enterToAccept")) {
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

    copy(evt) {
        let text = this.warota.selectionText(this.user);
        evt.clipboardData.setData("text/plain", text);
        evt.preventDefault();
        return true;
    }

    cut(evt) {
        this.copy(evt);
        this.warota.insert(this.user, [{text: ""}]);//or something else to keep undo sane?
        this.changed(true);
        return true;
    }

    paste(evt) {
        let pasteChars = evt.clipboardData.getData("text");
        this.warota.insert(this.user, [{text: pasteChars}]);
        evt.preventDefault();
        this.changed(true);
        return true;
    }

    undo() {
        this.publish(this.model.id, "undoRequest", this.user);
    }

    changed(toScroll) {
        let events = this.warota.events;
        this.warota.resetEvents();
        if (events.length > 0) {
            this.scrollNeeded = !this.singleLine && toScroll;
            this.publish(this.model.id, "editEvents", events);
        }
    }

    screenUpdate(timezone) {
        this.warota.timezone = timezone;
        if (!this.isSynced) {return;}
        this.warota.layout();
        this.showText();
        this.showSelections();
        this.setHeight();
        if (this.scrollNeeded) {
            this.scrollNeeded = false;
            this.scrollSelectionToView();
        }
    }

    ensureDiv(_index) {    }

    showText() {}

    spanFor(text, style) {
        let span = document.createElement("span");
        span.classList.add("text-no-select");
        if (style) {
            if (style.color) {
                span.style.setProperty("color", style.color);
            }
            if (style.size) {
                span.style.setProperty("font-size", style.size + "px");
            }
            if (style.font) {
                span.style.setProperty("font-family", style.font);
            }
            if (style.bold) {
                span.style.setProperty("font-weight", "700");
            }
            if (style.italic) {
                span.style.setProperty("font-style", "italic");
            }
        }
        if (text === " " || text === "\n" || text === "\r") {
            span.textContent = "\u00a0";
        } else if (text === "\t") {
            span.classList.add("tab");
        } else if (text === eof) {
            return null;
        } else {
            span.textContent = text;
        }
        return span;
    }

    setStyle(style) {
        this.warota.setStyle(this.user, style, false);
        this.changed();
    }

    mergeStyle(style) {
        this.warota.setStyle(this.user, style, true);
        this.changed();
    }

    setHeight() {
        /*
        this.text.style.setProperty("height", this.warota.docHeight + "px");
        this.holder.style.setProperty("height", this.warota.docHeight + "px");
        */
    }

    ensureSelection(id) {
        let sel = this.selections[id];
        if (!sel) {
            let bar = document.createElement("div");
            bar.classList.add("caret");
            bar.style.setProperty("pointer-events", "none");
            bar.style.setProperty("position", "absolute");
            this.selectionPane.appendChild(bar);

            let boxes = [0, 1, 2].map(() => {
                let box = document.createElement("div");
                box.classList.add("selection");
                box.style.setProperty("visibility", "hidden");
                box.style.setProperty("pointer-events", "none");
                box.style.setProperty("position", "absolute");
                this.selectionPane.appendChild(box);
                return box;
            });

            sel = {bar, boxes};
            this.selections[id] = sel;
        }
        return sel;
    }

    showSelections() {
        let unused = {};
        for (let k in this.selections) {
            unused[k] = this.selections[k];
        }

        for (let k in this.model.content.selections) {
            delete unused[k];
            this.ensureSelection(k).boxes.forEach(box => box.style.setProperty("visibility", "hidden"));
            let selection = this.model.content.selections[k];
            let caret = this.ensureSelection(k).bar;

            if (selection.end === selection.start) {
                caret.style.removeProperty("visibility");
                let caretRect = this.warota.barRect(selection);
                caret.style.setProperty("left", caretRect.left + "px");
                caret.style.setProperty("top", caretRect.top + "px");
                caret.style.setProperty("width", caretRect.width + "px");
                caret.style.setProperty("height", caretRect.height + "px");
                caret.style.setProperty("background-color", selection.color);
                caret.style.setProperty("opacity", k === this.viewId ? "0.5" : "0.25");
            } else {
                caret.style.setProperty("visibility", "hidden");
                let rects = this.warota.selectionRects(selection);
                for (let i = 0; i < 3; i++) {
                    let box = this.ensureSelection(k).boxes[i];
                    let rect = rects[i];
                    if (rect) {
                        box.style.setProperty("left", rect.left + "px");
                        box.style.setProperty("top", rect.top + "px");
                        box.style.setProperty("width", rect.width + "px");
                        box.style.setProperty("height", rect.height + "px");
                        box.style.setProperty("background-color", selection.color);
                        box.style.setProperty("opacity", k === this.viewId ? "0.25" : "0.08");
                        box.style.removeProperty("visibility");
                    } else {
                        box.style.setProperty("visibility", "hidden");
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
}
