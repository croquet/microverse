
import { Actor, Pawn } from "@croquet/worldcore";
import { CardActor, CardPawn} from "../src/DCard.js";

if (!window.pdfjsPromise) {
    window.pdfjsPromise = new Promise(resolve => {
        const s = document.createElement('script');
        s.setAttribute('src', 'https://mozilla.github.io/pdf.js/build/pdf.js');
        s.onload = () => {
            const pdfjsLib = window['pdfjs-dist/build/pdf'];
            pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
            resolve(pdfjsLib);
        };
        document.body.appendChild(s);
    });
}

/////////// Model code is executed inside of synced VM ///////////

export class PDFView extends CardActor {
    get pawn(){ return PDFViewDisplay; }
    init(options) {
        super.init(options);
        this.beWellKnownAs("PDFView");
        this.numPages = null;
        this.pageNumber = null;
        this.listen("docLoaded", this.docLoaded);
        this.listen("changePage", this.sayChangePage);
// window.pdfViewCard = this;
    }

    viewJoined(viewId) {
    }

    viewExited(viewId) {
    }

    docLoaded(data) {
        // might be sent by multiple clients
        this.numPages = data.numPages;
        if (this.pageNumber === null) this.pageNumber = 1;
        this.say("renderPage");
    }

    sayChangePage(increment) {
        this.pageNumber = this.pageNumber + increment;
        if (this.pageNumber === 0) this.pageNumber = this.numPages;
        else if (this.pageNumber > this.numPages) this.pageNumber = 1;

        this.say("renderPage");
    }
}
PDFView.register("PDFView");

/////////// Code below is executed outside of synced VM ///////////

// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class PDFViewDisplay extends CardPawn {
    constructor(actor) {
        super(actor);

        this.addEventListener("pointerDown", "onPointerDown");
        // this.addEventListener("pointerMove", "onPointerMove");
        // this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("keyDown", "onKeyDown");
        // this.addEventListener("keyUp", "onKeyUp");

        this.renderedPage = null;
        this.listen("renderPage", this.renderPage);

        const canvas = this.canvas = document.createElement("canvas");
        canvas.id = this.actor._cardData.name || this.id;
        this.context = canvas.getContext("2d");
        this.texture = this.threeObj.material[0].map = new THREE.CanvasTexture(this.canvas);

        this.loadDocument(this.actor._cardData.textureLocation).then(() => {
            if (this.actor.numPages) this.renderPage();
        });
// window.pdfViewDisplay = this;
    }

    constructShape(options) {
        const { depth, cornerRadius, color, frameColor, fullBright } = options;
        this.isFlat = true;
        const geometry = this.roundedCornerGeometry(1, 1, depth, cornerRadius);
        const material = this.makePlaneMaterial(depth, color, frameColor, fullBright);
        const obj = this.threeObj = new THREE.Mesh(geometry, material);
        // obj.castShadow = true;
        obj.name = "2d";
        this.objectCreated(obj);
        this.shape.add(obj);
    }

    async loadDocument(textureLocation) {
        const buffer = await this.getBuffer(textureLocation);
        const objectURL = URL.createObjectURL(new Blob([buffer]));
        try {
            const pdfjsLib = await window.pdfjsPromise;
            this.pdf = await pdfjsLib.getDocument(objectURL).promise;
            const numPages = this.pdf.numPages;
            console.log(`PDF with ${numPages} pages loaded`);
            if (!this.actor.numPages) this.say("docLoaded", { numPages });
        } catch(err) {
            // PDF loading error
            console.error(err.message);
        }
        URL.revokeObjectURL(objectURL);
    }

    async renderPage() {
        if (!this.pdf) return;

        const { numPages, pageNumber } = this.actor;
        if (!numPages) return;

        if (this.renderedPage === pageNumber) return;

        if (this.rendering) return; // a page is currently being rendered.  it'll check again when it's finished.

        this.rendering = true;
        const page = await this.pdf.getPage(pageNumber);
// console.log('Page loaded');

        const TEXTURE_SIZE = 4096;
        const { depth, cornerRadius } = this.actor._cardData;
        const rawViewport = page.getViewport({ scale: 1 });
        const maxDim = Math.max(rawViewport.height, rawViewport.width);
        const renderScale = TEXTURE_SIZE / maxDim * 0.999;
        const cardScale = 1 / maxDim;
        const width = rawViewport.width * cardScale;
        const height = rawViewport.height * cardScale;
        const obj = this.threeObj;
        obj.geometry.dispose();
        obj.geometry = this.roundedCornerGeometry(width, height, depth, cornerRadius);
        const viewport = page.getViewport({ scale: renderScale });
// console.log({viewport});
        // Prepare canvas using PDF page dimensions
        const context = this.context;
        this.canvas.height = viewport.height;
        this.canvas.width = viewport.width;
        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport
        };
        await page.render(renderContext).promise;
// console.log('Page rendered');
        obj.material[0].map.dispose();
        this.texture = obj.material[0].map = new THREE.CanvasTexture(this.canvas);
        this.texture.needsUpdate = true;
        this.renderedPage = pageNumber;
        this.rendering = false;
        this.renderPage();
    }

    onPointerDown(p3d) {
        // empty for now, but apparently needed to be able to grab focus
        // if (!p3d.uv) {return;}
        // this.changePage(1);
    }

    onKeyDown(e) {
        if (e.repeat) return;
        switch (e.key) {
            case "ArrowLeft":  this.changePage(-1); break;
            case "ArrowRight": this.changePage(1); break;
            default:
        }
    }

    changePage(change) {
        this.say("changePage", change);
    }

    onKeyUp(e) {
    }

    // update is called once per render frame
    // read from shared model, interpolate, render

    setup() {
    }

    doUpdate() {
    }

    destroy() {
        const obj = this.threeObj;
        obj.geometry.dispose();
        obj.material[0].map.dispose();
        this.material.dispose();
        super.destroy();
    }
}
