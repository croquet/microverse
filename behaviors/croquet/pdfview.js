class PDFActor {
    setup() {
        if (this.setupRun) return;

        this.setupRun = true;

        this.numPages = null;
        this.scrollPosition = null;
        this.PAGE_GAP_PERCENT = 4;
        this.listen("docLoaded", "docLoaded");
        this.listen("changePage", "changePage");
        this.listen("scrollByPercent", "scrollByPercent");
console.log(this);
    }

    viewJoined(viewId) {
    }

    viewExited(viewId) {
    }

    docLoaded(data) {
        // might be sent by multiple clients
        this.numPages = data.numPages;
        if (this.scrollPosition === null) this.scrollPosition = { page: 1, percent: 0 };
        this.say("drawAtScrollPosition");
    }

    changePage(increment) {
        let { page, percent } = this.scrollPosition;

        // if at (or above) top of page, or moving forward, adjust page number.
        // if going backwards from somewhere down a page, go to top of current page.
        if (increment > 0 || percent <= 0) page = page + increment;

        if (page === 0) page = this.numPages;
        else if (page > this.numPages) page = 1;

        percent = 0;

        this.scrollPosition = { page, percent };
        this.say("drawAtScrollPosition");
    }

    scrollByPercent(increment) {
        const { page: oldPage, percent: oldPercent } = this.scrollPosition;
        let { page, percent } = this.scrollPosition;

        const GAP = this.PAGE_GAP_PERCENT;

        percent += increment;
        if (page === 1 && percent < 0) percent = 0;
        else if (page === this.numPages && percent > 90) percent = 90;
        else if (percent < -GAP) {
            page--;
            percent += 100 + GAP;
        } else if (percent > 100) {
            page++;
            percent -= 100 + GAP;
        }

        if (page !== oldPage || percent !== oldPercent) {
            this.scrollPosition = { page, percent };
            this.say("drawAtScrollPosition");
        }
    }
}

class PDFPawn {
    setup() {
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

        if (this.setupRun) return;

        this.setupRun = true;

        this.threeObj = this.shape.children.find((o) => o.name === "2d");

        this.addEventListener("pointerDown", "onPointerDown");
        // this.addEventListener("pointerMove", "onPointerMove");
        // this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("keyDown", "onKeyDown");
        // this.addEventListener("keyUp", "onKeyUp");
        this.addEventListener("pointerWheel", "onPointerWheel");

        this.renderedPage = null;
        this.listen("drawAtScrollPosition", "drawAtScrollPosition");

        const canvas = this.canvas = document.createElement("canvas");
        canvas.id = this.actor._cardData.name || this.id;
        this.context = canvas.getContext("2d");
        this.texture = this.threeObj.material[0].map = new THREE.CanvasTexture(this.canvas);
console.log(this);

        this.pages = []; // sparse array of page number to details
        this.visiblePages = []; // sparse array of page number to time page became visible
        this.renderQueue = []; // page numbers to render when we have time
        this.renderingPage = false; // false at startup, to trigger immediate first render

        this.loadDocument(this.actor._cardData.pdfLocation).then(() => {
            this.ensurePageEntry(1); // to resize the card
        });

        let moduleName = this._behavior.module.externalName;
        this.addUpdateRequest([`${moduleName}$PDFPawn`, "update"]);
    }

    async loadDocument(pdfLocation) {
        const buffer = await this.getBuffer(pdfLocation);
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

    drawAtScrollPosition() {
        if (!this.pdf || !this.PAGE_GAP) return;

        const { numPages, scrollPosition } = this.actor;
        if (!numPages) return;

        const { canvas, context } = this;
        const { width: canvWidth, height: canvHeight } = canvas;
        context.fillStyle = "#888";
        context.fillRect(0, 0, canvWidth, canvHeight);
        this.texture.needsUpdate = true; // whether or not we draw anything below

        const { page, percent } = scrollPosition;
        let p = page, yStart = percent / 100, finished = false, shownHeight = 0;
        while (!finished) {
            const pageEntry = this.ensurePageEntry(p);
            const { renderResult, renderWidth, renderHeight } = pageEntry;
            if (renderHeight === undefined) return; // not ready yet

            const yStartCoord = Math.floor(yStart * renderHeight); // -ve when gap is showing at top
            if (renderResult) {
                // for Safari we need to be sure not to refer to any out-of-bounds pixels on either the source or destination canvas (whereas Chrome doesn't care)
                const sourceWidth = Math.min(renderWidth, canvWidth);
                const yStartOnSource = Math.max(0, yStartCoord);
                const yStartOnDest = yStartCoord < 0 ? -yStartCoord : shownHeight;
                const sourceHeight = Math.min(renderHeight - yStartOnSource, canvHeight - yStartOnDest);
                // context.drawImage(renderResult, 0, yStartOnSource, sourceWidth, sourceHeight, 0, yStartOnDest, sourceWidth, sourceHeight);
                context.putImageData(renderResult, 0, yStartOnDest - yStartOnSource, 0, yStartOnSource, sourceWidth, sourceHeight);
            }
            shownHeight += Math.ceil(renderHeight - yStartCoord + this.PAGE_GAP); // whether drawn or not
            if (p === this.actor.numPages || shownHeight >= canvHeight) finished = true;
            else {
                p++;
                yStart = 0;
            }
        }
    }

    updateVisiblePages() {
        // this is invoked on every update, so if any page that we
        // want to test isn't ready yet (PageProxy hasn't been fetched) we don't
        // wait for it.
        const { scrollPosition } = this.actor;
        if (!scrollPosition || !this.PAGE_GAP) return;

        const { page, percent } = scrollPosition;

        const prevVisible = this.visiblePages;
        const nowVisible = this.visiblePages = [];
        let p = page, yStart = percent / 100, shownHeight = 0;
        while (true) {
            if (prevVisible[p]) nowVisible[p] = prevVisible[p];
            else nowVisible[p] = Date.now();

            if (p === this.actor.numPages) return; // end of the doc

            const pageEntry = this.ensurePageEntry(p);
            const { renderHeight } = pageEntry;
            if (renderHeight === undefined) return; // not ready yet

            shownHeight += renderHeight - yStart * renderHeight + this.PAGE_GAP;
            if (shownHeight >= this.canvas.height) return;

            p++;
            yStart = 0;
        }
    }

    populateRenderQueue() {
        // invoked on every update.
        const { scrollPosition } = this.actor;
        if (!scrollPosition || !this.PAGE_GAP) return;

        const { page } = scrollPosition;
        const { numPages } = this.actor;

        const queue = this.renderQueue = [];
        const queueIfNeeded = pageNumber => {
            if (pageNumber < 1) pageNumber += numPages;
            else if (pageNumber > numPages) pageNumber -= numPages;

            const pageEntry = this.ensurePageEntry(pageNumber);
            if (pageEntry.page && !pageEntry.renderTask) queue.push(pageNumber);
        };

        // queue nearby pages for rendering (up to 3 pages away)
        const range = Math.min(numPages, 4);
        for (let diff = 1; diff < range; diff++) {
            queueIfNeeded(page + diff);
            queueIfNeeded(page - diff);
        }

        // and discard the renderings of pages over 5 away
        const discardIfOver = 5;
        this.pages.forEach((pageEntry, otherPage) => {
            if (otherPage === page) return;

            if (pageEntry.renderResult) {
                // take account of wrapping around the end
                const minDist = otherPage > page
                    ? Math.min(otherPage - page, page + numPages - otherPage)
                    : Math.min(page - otherPage, otherPage + numPages - page);
                if (minDist > discardIfOver) {
// console.log(`p${otherPage} discarded`);
                    pageEntry.renderResult = null;
                    pageEntry.renderTask = null;
                }
            }
        });
    }

    processRenderQueue() {
        // invoked on every update.
        // the queue can be used to schedule rendering of pages that aren't currently
        // on display but might be in the near future.
        // before even looking at the queue, check that the pages now on display have
        // been rendered or are at least in progress.  scheduling such a page is allowed
        // to cancel the rendering of any page that isn't on display - but to avoid a
        // cascade of render starts and cancellations when a user scrolls rapidly through
        // a fresh document, don't start rendering a page until it has been on display
        // for a while.

        // if we're already rendering a page that is currently on display, don't
        // interfere.
        const visibles = this.visiblePages;
        if (this.renderingPage && visibles[this.renderingPage]) return;

        // the first time we render, no need to confirm that the page is hanging around
        const RENDER_WAIT = this.renderingPage === false ? 0 : 200; // ms
        const now = Date.now();
        visibles.forEach((visibleTime, pageNumber) => {
            if (now - visibleTime < RENDER_WAIT) return;

            const pageEntry = this.ensurePageEntry(pageNumber);
            if (pageEntry.page && !pageEntry.renderTask) {
                this.startRendering(pageNumber); // cancelling any other render task
                return;
            }
        });

        if (this.renderingPage) return; // not currently a visible page, but allow it to keep running

        const queue = this.renderQueue;
        if (queue.length === 0) return;

        const toRender = queue[0];
        const pageEntry = this.ensurePageEntry(toRender);
        if (!pageEntry.page) return; // try again later

        queue.shift();
        if (!pageEntry.renderTask) this.startRendering(toRender);
    }

    startRendering(pageNumber) {
        // because we allow rendering to be pre-empted, we can't be sure that it will
        // finish.
        if (this.renderingPage) {
            const pageEntry = this.ensurePageEntry(this.renderingPage);
            pageEntry.renderTask.cancel(); // will reject the render promise
        }
        this.renderingPage = pageNumber;

        const pageEntry = this.ensurePageEntry(pageNumber);
        const { page, renderScale } = pageEntry;
        const viewport = page.getViewport({ scale: renderScale });
        // console.log({viewport});
        // Prepare canvas using PDF page dimensions
        if (!this.renderCanvas) this.renderCanvas = document.createElement("canvas");
        const canvas = this.renderCanvas;
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport
        };
        const renderTask = pageEntry.renderTask = page.render(renderContext);
        renderTask.promise.then(
            () => {
// console.log(`p${pageNumber} rendered`);
                this.renderingPage = null;
                pageEntry.renderResult = context.getImageData(0, 0, viewport.width, viewport.height);
                this.finishedRendering(pageNumber);
            },
            () => {
// console.log(`p${pageNumber} cancelled`);
                pageEntry.renderTask = null; // so we'll try again later
            }
        );
    }

    finishedRendering(pageNumber) {
        if (this.visiblePages[pageNumber]) this.drawAtScrollPosition();
    }

    adjustCardSize(width, height) {
        // width and height are page pixels.
        // sent as soon as we discover the size of page 1
        const { depth, cornerRadius } = this.actor._cardData;
        const maxDim = Math.max(width, height);
        const cardScale = 1 / maxDim;
        const obj = this.threeObj;
        obj.geometry.dispose();
        obj.geometry = this.roundedCornerGeometry(width * cardScale, height * cardScale, depth, cornerRadius);

        const TEXTURE_SIZE = 4096;
        const renderScale = TEXTURE_SIZE / maxDim * 0.999;
        // console.log({viewport});
        // Prepare canvas using PDF page dimensions
        this.canvas.width = renderScale * width;
        this.canvas.height = renderScale * height;

        obj.material[0].map.dispose();
        this.texture = obj.material[0].map = new THREE.CanvasTexture(this.canvas);

        this.PAGE_GAP = Math.floor(renderScale * height * this.actor.PAGE_GAP_PERCENT / 100); // pixels between displayed pages
    }

    ensurePageEntry(pageNumber) {
        const existing = this.pages[pageNumber];
        if (existing) return existing;

        const entry = {
            renderResult: null,
            renderTask: null
        };
        this.pages[pageNumber] = entry;
        this.pdf.getPage(pageNumber).then(proxy => {
            entry.page = proxy;
            const { width, height } = proxy.getViewport({ scale: 1 });
            entry.width = width;
            entry.height = height;

            const TEXTURE_SIZE = 4096;
            const maxDim = Math.max(width, height);
            const renderScale = TEXTURE_SIZE / maxDim * 0.999;
            const { width: renderWidth, height: renderHeight } = proxy.getViewport({ scale: renderScale });
            entry.renderScale = renderScale;
            entry.renderWidth = Math.floor(renderWidth);
            entry.renderHeight = Math.floor(renderHeight);

            if (pageNumber === 1) this.adjustCardSize(width, height);
        });
        return entry;
    }

    onPointerDown(p3d) {
        if (!p3d.uv) {return;}

        this.changePage(1);
    }

    onPointerWheel(evt) {
        if (!this.pdf || !this.PAGE_GAP) return;

        const THROTTLE = 50; // ms
        const now = Date.now();
        this.cumulativeWheelDelta = (this.cumulativeWheelDelta || 0) + evt.deltaY;
        if (now - (this.lastPointerWheel || 0) < THROTTLE) return;
        this.lastPointerWheel = now;

        const WHEEL_SCALE = 4;
        let percent = this.cumulativeWheelDelta * WHEEL_SCALE / this.canvas.height * 100;
        if (Math.abs(percent) > 50) percent = 50 * Math.sign(percent);
        this.cumulativeWheelDelta = 0;

        this.say("scrollByPercent", percent);
    }

    onKeyDown(e) {
        if (e.repeat) return;
        switch (e.key) {
            case "ArrowLeft":
            case "ArrowUp":
                this.changePage(-1);
                break;
            case "ArrowRight":
            case "ArrowDown":
                this.changePage(1);
                break;
            default:
        }
    }

    changePage(change) {
        this.say("changePage", change);
    }

    onKeyUp(e) {
    }

    update() {
        this.updateVisiblePages();
        this.populateRenderQueue();
        this.processRenderQueue();
    }

    destroy() {
        const obj = this.threeObj;
        obj.geometry.dispose();
        obj.material[0].map.dispose();
        this.material.dispose();
    }
}

export default {
    modules: [
        {
            name: "PDFView",
            actorBehaviors: [PDFActor],
            pawnBehaviors: [PDFPawn],
        }
    ]
}

/* globals THREE */