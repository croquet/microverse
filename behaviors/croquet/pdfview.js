class PDFActor {
    setup() {
        // these will be initialised by the first client to load the doc and figure out
        // a suitable aspect ratio.  pageGapPercent is needed for calculating overall
        // scroll position.
        if (this.numPages === undefined) {
            this.measuredDocLocation = null; // pdfLocation for the latest doc for which we have measurements
            this.numPages = null;
            this.pageGapPercent = null;
            this.scrollState = null;
        }

        this.addButtons();

        this.listen("docLoaded", "docLoaded");
        this.listen("changePage", "changePage");
        this.listen("scrollByPercent", "scrollByPercent");
        this.listen("requestScrollPosition", "requestScrollPosition");

        this.listen("setCardData", "cardDataUpdated");
        this.subscribe(this.id, "buttonPageChange", "changePage");
    }

    viewJoined(_viewId) {
    }

    viewExited(_viewId) {
    }

    addButtons() {
        // from chevron-up-solid-thicker
        const chevronSVG = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NzAuMTQgMjc4LjA0Ij4KICA8cGF0aCBkPSJtNDU3LjU0LDIwNC42TDI2NS41NCwxMi42Yy04LjEyLTguMTItMTguOTMtMTIuNi0zMC40My0xMi42LTEwLjgyLDAtMjEuMDIsMy45Ni0yOC45NSwxMS4xOS0uNTYuMzgtMS4wOC44Mi0xLjU4LDEuMzFMMTIuNTgsMjA0LjVjLTE2Ljc4LDE2Ljc4LTE2Ljc4LDQ0LjA4LDAsNjAuODYsMTYuNzgsMTYuNzgsNDQuMDgsMTYuNzgsNjAuODUsMEwyMzUuMDYsMTAzLjgzbDE2MS42MiwxNjEuNjJjOC4zOSw4LjM5LDE5LjQxLDEyLjU4LDMwLjQzLDEyLjU4czIyLjA0LTQuMTksMzAuNDMtMTIuNThjOC4xMi04LjEyLDEyLjYtMTguOTMsMTIuNi0zMC40M3MtNC40Ny0yMi4zMS0xMi42LTMwLjQzWiIvPgo8L3N2Zz4=";
        const buttonSpecs = {
            up: { svg: chevronSVG, scale: 0.7, position: [0, 0.05] },
            down: { svg: chevronSVG, scale: 0.7, position: [0, 0.05], rotation: [0, 0, Math.PI] },
        };
        const size = this.buttonSize = 0.1;
        const CIRCLE_RATIO = 1.25; // ratio of button circle to inner svg
        const makeButton = symbol => {
            const { svg, scale, position, rotation } = buttonSpecs[symbol];
            const button = this.createCard({
                name: "button",
                dataLocation: svg,
                fileName: "/svg.svg", // ignored
                modelType: "svg",
                shadow: true,
                singleSided: true,
                scale: [size * scale / CIRCLE_RATIO, size * scale / CIRCLE_RATIO, 1],
                rotation: rotation || [0, 0, 0],
                depth: 0.01,
                type: "2d",
                fullBright: true,
                behaviorModules: ["PDFButton"],
                parent: this,
                noSave: true,
            });
            button.call("PDFButton$PDFButtonActor", "setProperties", { name: symbol, svgScale: scale, svgPosition: position || [0, 0] });
            return button;
        }

        this.buttons = {};
        ["up", "down"].forEach(buttonName => {
            this.buttons[buttonName] = makeButton(buttonName);
        });

    }

    docLoaded(data) {
        // might be sent by multiple clients.  the first one delivering the measurements for
        // the current pdfLocation gets to set them, and reset the scroll.
        const { pdfLocation } = data;
        if (pdfLocation === this._cardData.pdfLocation && pdfLocation !== this.measuredDocLocation) {
            this.measuredDocLocation = pdfLocation;
            this.numPages = data.numPages;
            this.pageGapPercent = data.pageGapPercent;
            this.maxScrollPosition = data.maxScrollPosition;
            this.scrollState = null;
        }
        if (this.scrollState === null) this.scrollState = { page: 1, percent: 0 };
        this.annotateAndAnnounceScroll();
    }

    cardDataUpdated(data) {
        if (data.height !== undefined) {
            const offsetX = this.buttonSize * 3 / 4;
            const offsetY = data.height / 2 + this.buttonSize * 3 / 4;
            const depth = this._cardData.depth || 0.05;
            const { up, down } = this.buttons;
            up.translateTo([-offsetX, -offsetY, depth]);
            down.translateTo([offsetX, -offsetY, depth]);
            this.say("sizeSet");
        }
    }

    changePage(increment) {
        // increment is only ever +/- 1
        let { page, percent } = this.scrollState;
        const { page: maxScrollPage, percent: maxScrollPercent } = this.maxScrollPosition;

        if (increment === 1) { // going forwards
            // when paging forward from the maximum scroll position, jump to the start
            // of the document.  also do so if we're already on the last page.
            if (page === this.numPages || page === maxScrollPage && percent === maxScrollPercent) page = 1;
            else page++;
        } else { // going backwards
            if (percent <= 0) page--; // (whereas if going backwards from somewhere down a page, we just go to top of that page)
            if (page === 0) page = this.numPages; // subject to reduction by normalizeScroll
        }

        this.scrollState = this.normalizeScroll(page, 0);
        this.annotateAndAnnounceScroll();
    }

    requestScrollPosition({ page, percent }) {
        const { page: newPage, percent: newPercent } = this.normalizeScroll(page, percent);
        this.announceScrollIfNew(newPage, newPercent);
    }

    scrollByPercent(increment) {
        let { page, percent } = this.scrollState;
        percent += increment;
        const { page: newPage, percent: newPercent } = this.normalizeScroll(page, percent);
        this.announceScrollIfNew(newPage, newPercent);
    }

    normalizeScroll(page, percent) {
        // note that scroll is advanced at a constant rate based on percent of the
        // viewer height, which is set from the first page.  a uniquely tall page
        // in the document will therefore scroll proportionally faster, and a short
        // page slower.  in most documents this effect shouldn't be too noticeable.
        const gapPercent = this.pageGapPercent;
        const { page: lastPage, percent: lastPercent } = this.maxScrollPosition;

        while (percent < -gapPercent && page > 1) {
            page--;
            percent += 100 + gapPercent;
        }
        while (percent > 100 && page < lastPage) {
            page++;
            percent -= 100 + gapPercent;
        }

        if (page === 1 && percent < 0) percent = 0;
        else if (page > lastPage || (page === lastPage && percent > lastPercent)) {
            page = lastPage;
            percent = lastPercent;
        }

        return { page, percent };
    }

    announceScrollIfNew(page, percent) {
        const { page: oldPage, percent: oldPercent } = this.scrollState;
        if (page !== oldPage || percent !== oldPercent) {
            this.scrollState = { page, percent };
            this.annotateAndAnnounceScroll();
        }
    }

    annotateAndAnnounceScroll() {
        // @@ at some point we'll add annotation for scroll being in progress, and under whose control
        const { page, percent } = this.scrollState;
        const { page: lastPage, percent: lastPercent } = this.maxScrollPosition;
        this.scrollState.upAvailable = page !== 1 || percent !== 0;
        this.scrollState.downAvailable = page !== lastPage || percent !== lastPercent;
        this.say("drawAtScrollPosition");
        this.publish(this.id, "updateButtons");
    }
}

class PDFPawn {
    setup() {
        if (!window.pdfjsPromise) {
            window.pdfjsPromise = new Promise(resolve => {
                const s = document.createElement('script');
                s.setAttribute('src', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js');
                s.onload = () => {
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
                    resolve(pdfjsLib);
                };
                document.body.appendChild(s);
            });
        }

        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerMove", "onPointerMove");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("keyDown", "onKeyDown");
        // this.addEventListener("keyUp", "onKeyUp");
        this.addEventListener("pointerWheel", "onPointerWheel");

        this.listen("cardDataSet", "cardDataUpdated");
        this.listen("sizeSet", "sizeSet");
        this.listen("drawAtScrollPosition", "drawAtScrollPosition");
        this.listen("updateShape", "updateShape");

        this.subscribe(this.id, "buttonPressed", "buttonPressed");

        let moduleName = this._behavior.module.externalName;
        this.addUpdateRequest([`${moduleName}$PDFPawn`, "update"]);

        this.TEXTURE_SIZE = 2048;
        this.initializeDocProperties();

        // on a behavior reload, the pdf will typically already be loaded
        if (this.hasLatestPDF()) this.measureDocument();
        else this.loadDocument(this.actorPDFLocation());
    }

    actorPDFLocation() { return this.actor._cardData.pdfLocation }
    hasLatestPDF() { return !!this.pdf && this.pdfLocation === this.actorPDFLocation() }

    initializeDocProperties() {
        // if this is a reload, discard any GPU resources we were holding onto
        if (this.pages) {
            const meshPool = this.pageMeshPool;
            [...this.shape.children].forEach(o => {
                if (o.name === "page") {
                    this.shape.remove(o);
                    meshPool.push(o);
                }
            });
            meshPool.forEach(mesh => {
                mesh.geometry.dispose();
                mesh.material.dispose();
            });

            this.pages.forEach(pageEntry => {
                if (pageEntry.texture) pageEntry.texture.dispose();
            });
        }

        this.numPages = null; // also held by actor
        this.pages = []; // sparse array of page number to details
        this.pageGap = null;
        this.visiblePages = []; // sparse array of page number to time page became visible
        this.renderQueue = []; // page numbers to render when we have time
        this.renderingPage = false; // false at startup, to trigger immediate first render
        this.pageMeshPool = [];
    }

    cardDataUpdated(data) {
        const { pdfLocation } = data.v;
        if (pdfLocation === data.o.pdfLocation) return;

        this.cancelRenderInProgress();
        this.initializeDocProperties();
        this.loadDocument(pdfLocation);
    }

    updateShape() {
        // the shape has been updated, which means that at some point - possibly not
        // yet - any existing shape will be dismantled and rebuilt (by
        // CardPawn.updateShape).
        // we schedule a minimal wait to ensure that that has happened, then force a
        // re-render.
        setTimeout(() => this.drawAtScrollPosition(), 0);
    }

    async loadDocument(pdfLocation) {
        this.pdf = null;
        this.pdfLocation = null;
        let objectURL;
        try {
            const buffer = await this.getBuffer(pdfLocation);
            objectURL = URL.createObjectURL(new Blob([buffer]));
            const pdfjsLib = await window.pdfjsPromise;
            const pdf = await pdfjsLib.getDocument(objectURL).promise;
            if (pdfLocation === this.actorPDFLocation()) {
                this.pdf = pdf;
                this.pdfLocation = pdfLocation;
                console.log(`PDF with ${this.pdf.numPages} pages loaded`);
                this.measureDocument(); // async
            }
        } catch (err) {
            // PDF loading error
            console.error(err.message);
        }
        if (objectURL) URL.revokeObjectURL(objectURL);
    }

    async measureDocument() {
        const numPages = this.numPages = this.pdf.numPages;

        const firstPage = this.ensurePageEntry(1);
        await firstPage.pageReadyP;

        if (!this.hasLatestPDF()) return; // it's been replaced while we were preparing

        const { pdfLocation } = this;
        const actorHasMeasurements = this.actor.measuredDocLocation === pdfLocation;

        // gap is arbitrarily set as 2% of page height for landscape,
        // 1% for portrait, 1.5% for square.
        const { width: firstWidth, height: firstHeight } = firstPage;
        const gapPercent = firstWidth > firstHeight ? 2 : firstWidth === firstHeight ? 1.5 : 1;
        this.adjustCardSize(firstWidth, firstHeight, gapPercent, !actorHasMeasurements); // includes setting pageGap, which we need in order to render anything

        // the actor needs to know the number of pages, the page gap percent (although moot if only one page), and the maximum scroll position (page and percent).
        if (!actorHasMeasurements) {
            let lastScroll;
            if (numPages === 1) {
                lastScroll = { page: 1, percent: 0 };
            } else {
                let lastPage = numPages;
                let percentToFill = 100; // percent of card to fill with the bottom of the document
                let lastPercent;
                while (percentToFill > gapPercent) {
                    const lastPageEntry = this.ensurePageEntry(lastPage);
                    await lastPageEntry.pageReadyP;
                    const { width, height } = lastPageEntry;
                    // how tall is this page relative to the first page, when rendered at the same width?
                    const pageHeightRatio = height / width * firstWidth / firstHeight;
                    percentToFill -= pageHeightRatio * 100;
                    if (percentToFill < 0) {
                        // can't show all of this page.  we've reached the end.
                        lastPercent = -percentToFill / pageHeightRatio;
                    } else if (percentToFill <= gapPercent) {
                        // can show all of the page, plus some amount of gap
                        lastPercent = -percentToFill;
                    } else {
                        // we're showing the whole page, plus its preceding gap
                        percentToFill -= gapPercent;
                        lastPage --;
                    }
                    if (lastPercent === -0) lastPercent = 0; // would otherwise mess up tests in the model
                }
                lastScroll = { page: lastPage, percent: lastPercent };
            }
            this.say("docLoaded", { pdfLocation, pageGapPercent: gapPercent, numPages, maxScrollPosition: lastScroll });
        }
    }

    sizeSet() {
        this.updateButtons();
    }

    drawAtScrollPosition() {
        if (!this.hasLatestPDF() || !this.pageGap) return;

        const { scrollState } = this.actor;
        if (!scrollState) return;

        // where we already have a mesh for a page we're going to display, be sure
        // to reuse it
        const meshPool = this.pageMeshPool;
        [...this.shape.children].forEach(o => {
            if (o.name === "page") {
                this.shape.remove(o);
                meshPool.push(o);
            }
        });
        meshPool.forEach(mesh => {
            if (!this.visiblePages[mesh.lastAssignedPage]) delete mesh.lastAssignedPage;
        });

        const { depth } = this.actor._cardData;
        const { cardWidth, cardHeight } = this;
        const { page, percent } = scrollState;
        let p = page, yStart = percent / 100, shownHeight = 0;
        while (true) {
            const pageEntry = this.ensurePageEntry(p);
            const { renderResult, aspectRatio } = pageEntry;
            if (aspectRatio === undefined) return; // not ready yet

            const fullPageHeight = cardWidth / aspectRatio;
            if (renderResult) {
                // if possible, reuse the mesh that already has this page's texture
                let pageMesh;
                let existingIndex = meshPool.findIndex(mesh => mesh.lastAssignedPage === p);
                if (existingIndex < 0) existingIndex = meshPool.findIndex(mesh => !mesh.lastAssignedPage);
                if (existingIndex < 0) pageMesh = this.makePageMesh();
                else pageMesh = meshPool.splice(existingIndex, 1)[0];

                pageMesh.lastAssignedPage = p;
                pageMesh.geometry.dispose();
                const imageTop = Math.max(0, yStart); // proportion from top of image
                const topGap = yStart < 0 ? -yStart * cardHeight : 0;
                const pageHeight = Math.min((1 - imageTop) * fullPageHeight, cardHeight - shownHeight - topGap);
                const imageBottom = imageTop + pageHeight / fullPageHeight;
                const geo = pageMesh.geometry = new Microverse.THREE.PlaneGeometry(cardWidth, pageHeight);
                this.shape.add(pageMesh);
                const pageY = cardHeight / 2 - shownHeight - topGap - pageHeight / 2;
                pageMesh.position.set(0, pageY, depth / 2 + 0.003);
                const uv = geo.attributes.uv;
                uv.setXY(0, 0, 1 - imageTop);
                uv.setXY(1, 1, 1 - imageTop);
                uv.setXY(2, 0, 1 - imageBottom);
                uv.setXY(3, 1, 1 - imageBottom);
                uv.needsUpdate = true;

                if (!pageEntry.texture) pageEntry.texture = new Microverse.THREE.Texture(renderResult);
                if (pageMesh.material.map !== pageEntry.texture) {
                    pageMesh.material.map = pageEntry.texture;
                    pageEntry.texture.needsUpdate = true;
                }
            }
            shownHeight += fullPageHeight - fullPageHeight * yStart + this.pageGap; // whether or not page is being shown
            if (p === this.numPages || shownHeight >= cardHeight) break;
            else {
                p++;
                yStart = 0;
            }
        }
        this.updateButtons();
    }

    updateButtons() {
        const { scrollState } = this.actor;
        if (!scrollState) return;

        const { upAvailable, downAvailable } = scrollState;
        if (upAvailable === undefined) return; // not ready yet

        this.buttonState = {
            up: upAvailable,
            down: downAvailable,
        };
        this.publish(this.id, "updateButtons");
    }

    setButtonHilite(buttonName, hilite) {
        // not actually needed until we have some toggles
        const groups = [["up"], ["down"]];
        const group = groups.find(g => g.includes(buttonName));
        this.publish(this.id, "updateHilites", { buttons: group, hilite });
    }

    makePageMesh() {
        const { cardWidth, cardHeight } = this;
        const pageGeometry = new Microverse.THREE.PlaneGeometry(cardWidth, cardHeight);
        const pageMaterial = new Microverse.THREE.MeshBasicMaterial({ color: "#fff", side: Microverse.THREE.DoubleSide, toneMapped: false });
        const pageMesh = new Microverse.THREE.Mesh(pageGeometry, pageMaterial);
        pageMesh.name = "page";
        return pageMesh;
    }

    updateVisiblePages() {
        // this is invoked on every update, so if any page that we
        // want to test isn't ready yet (PageProxy hasn't been fetched) we don't
        // wait for it.
        const { page, percent } = this.actor.scrollState;
        const { cardWidth, cardHeight } = this;

        const prevVisible = this.visiblePages;
        const nowVisible = this.visiblePages = [];
        let p = page, yStart = percent / 100, shownHeight = 0;
        while (true) {
            if (prevVisible[p]) nowVisible[p] = prevVisible[p];
            else nowVisible[p] = Date.now();

            if (p === this.numPages) return; // end of the doc

            const pageEntry = this.ensurePageEntry(p);
            const { aspectRatio } = pageEntry;
            if (aspectRatio === undefined) return; // not ready yet

            const fullPageHeight = cardWidth / aspectRatio;
            shownHeight += fullPageHeight - yStart * fullPageHeight + this.pageGap;
            if (shownHeight >= cardHeight) return;

            p++;
            yStart = 0;
        }
    }

    manageRenderState() {
        // invoked on every update.  schedule rendering for pages that are nearby,
        // and clean up render results and textures that aren't being used.
        const { page } = this.actor.scrollState;
        const { numPages } = this;

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

            const isVisible = !!this.visiblePages[otherPage];
            if (pageEntry.renderResult) {
                // take account of wrapping from last page to first
                const minDist = otherPage > page
                    ? Math.min(otherPage - page, page + numPages - otherPage)
                    : Math.min(page - otherPage, otherPage + numPages - page);
                if (minDist > discardIfOver) {
// console.log(`rendering for p${otherPage} discarded`);
                    pageEntry.renderResult = null;
                    pageEntry.renderTask = null;
                }
                if (pageEntry.texture && !isVisible) {
// console.log(`texture for p${otherPage} discarded`);
                    pageEntry.texture.dispose();
                    pageEntry.texture = null;
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
        this.cancelRenderInProgress();
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

    cancelRenderInProgress() {
        if (this.renderingPage) {
            const pageEntry = this.ensurePageEntry(this.renderingPage);
            pageEntry.renderTask.cancel(); // will reject the render promise
        }
    }

    finishedRendering(pageNumber) {
        if (this.visiblePages[pageNumber]) this.drawAtScrollPosition();
    }

    adjustCardSize(width, height, gapPercent, tellActor) {
        // width and height are page pixels.
        // invoked as soon as we discover the size of page 1
        const { depth } = this.actor._cardData;
        const maxDim = Math.max(width, height);
        const cardScale = 1 / maxDim;
        const cardWidth = this.cardWidth = width * cardScale;
        const cardHeight = this.cardHeight = height * cardScale;
        const obj = this.shape.children.find((o) => o.name === "2d");
        obj.geometry.dispose();
        obj.geometry = this.squareCornerGeometry(cardWidth, cardHeight, depth);

        this.pageGap = cardHeight * gapPercent / 100; // three.js units between displayed pages
        if (tellActor) this.say("setCardData", { height: cardHeight, width: cardWidth });
    }

    squareCornerGeometry(width, height, depth) {
        let x = height / 2;
        let y = width / 2;
        let z = depth / 2;

        let shape = new Microverse.THREE.Shape();
        shape.moveTo(-x, -y);
        shape.lineTo(-x, y);
        shape.lineTo(x, y);
        shape.lineTo(x, -y);
        shape.lineTo(-x, -y);

        let extrudePath = new Microverse.THREE.LineCurve3(new Microverse.THREE.Vector3(0, 0, z), new Microverse.THREE.Vector3(0, 0, -z));
        extrudePath.arcLengthDivisions = 3;
        let geometry = new Microverse.THREE.ExtrudeGeometry(shape, { extrudePath });

        geometry.parameters.width = width;
        geometry.parameters.height = height;
        geometry.parameters.depth = depth;

        return geometry;
    }

    ensurePageEntry(pageNumber) {
        const existing = this.pages[pageNumber];
        if (existing) return existing;

        const entry = {
            renderResult: null,
            renderTask: null
        };
        this.pages[pageNumber] = entry;
        entry.pageReadyP = new Promise(resolve => {
            this.pdf.getPage(pageNumber).then(proxy => {
                entry.page = proxy;
                const { width, height } = proxy.getViewport({ scale: 1 });
                entry.width = width;
                entry.height = height;

                const maxDim = Math.max(width, height);
                const renderScale = this.TEXTURE_SIZE / maxDim * 0.999;
                entry.renderScale = renderScale;
                entry.aspectRatio = width / height;

                resolve();
            });
        });
        return entry;
    }

    onPointerDown(p3d) {
        if (!p3d.uv) return;

        this.pointerDownTime = Date.now();
        this.pointerDownY = p3d.xyz[1];
        const { page, percent } = this.actor.scrollState;
        this.pointerDownScroll = { page, percent };
        this.pointerDragRange = 0; // how far user drags before releasing pointer
    }

    onPointerMove(p3d) {
        if (!p3d.uv) return;

        const THROTTLE = 50; // ms
        const now = Date.now();
        if (now - (this.lastPointerMove || 0) < THROTTLE) return;
        this.lastPointerMove = now;

        const { page, percent } = this.pointerDownScroll;
        const yScale = this.actor._scale[1];
        const percentChange = (p3d.xyz[1] - this.pointerDownY) / this.cardHeight / yScale * 100;
        this.pointerDragRange = Math.max(this.pointerDragRange, Math.abs(percentChange));
        this.say("requestScrollPosition", { page, percent: percent + percentChange });
    }

    onPointerUp(p3d) {
        if (!p3d.uv) return;

        if (this.pointerDragRange < 2 && Date.now() - this.pointerDownTime < 250) this.changePage(1);
    }

    onPointerWheel(evt) {
        if (!this.pdf || !this.pageGap) return;

        const THROTTLE = 50; // ms
        const now = Date.now();
        this.cumulativeWheelDelta = (this.cumulativeWheelDelta || 0) + evt.deltaY;
        if (now - (this.lastPointerWheel || 0) < THROTTLE) return;
        this.lastPointerWheel = now;

        const WHEEL_SCALE = 4;
        let percent = this.cumulativeWheelDelta * WHEEL_SCALE / this.TEXTURE_SIZE * 100;
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

    buttonPressed(buttonName) {
        if (buttonName === "up") this.changePage(-1);
        else if (buttonName === "down") this.changePage(1);
    }

    changePage(change) {
        this.say("changePage", change);
    }

    onKeyUp(_e) {
    }

    update() {
        if (this.actor.measuredDocLocation === this.pdfLocation && this.pageGap) {
            this.updateVisiblePages();
            this.manageRenderState();
            this.processRenderQueue();
        }
    }

    teardown() {
        console.log("PDFPawn teardown");
        this.cleanupShape();

        this.pageMeshPool.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        this.pages.forEach(pageEntry => {
            if (pageEntry.texture) pageEntry.texture.dispose();
        });

        let moduleName = this._behavior.module.externalName;
        this.removeUpdateRequest([`${moduleName}$PDFPawn`, "update"]);
    }
}

class PDFButtonActor {
    // setup() {
    // }

    setProperties(props) {
        this.buttonName = props.name;
        this.svgScale = props.svgScale;
        this.svgPosition = props.svgPosition; // [x, y] to nudge position
    }
}

class PDFButtonPawn {
    setup() {
        this.subscribe(this.id, "2dModelLoaded", "svgLoaded");

        this.addEventListener("pointerMove", "nop");
        this.addEventListener("pointerEnter", "hilite");
        this.addEventListener("pointerLeave", "unhilite");
        this.addEventListener("pointerTap", "tapped");
        // effectively prevent propagation
        this.addEventListener("pointerDown", "nop");
        this.addEventListener("pointerUp", "nop");
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");

        this.subscribe(this.parent.id, "updateButtons", "updateState");
        this.subscribe(this.parent.id, "updateHilites", "updateHilite");

        this.enabled = true;
    }

    svgLoaded() {
        // no hit-test response on anything but the hittable mesh set up below
        const { buttonName, svgScale, svgPosition } = this.actor;
        const svg = this.shape.children[0];
        // apply any specified position nudging
        svg.position.x += svgPosition[0];
        svg.position.y += svgPosition[1];
        this.shape.raycast = () => false;
        svg.traverse(obj => obj.raycast = () => false);
        const { depth } = this.actor._cardData;
        const radius = 1.25 / svgScale / 2;
        const segments = 32;
        const geometry = new Microverse.THREE.CylinderGeometry(radius, radius, depth, segments);
        const opacity = (buttonName === "mute" || buttonName === "unmute") ? 0 : 1;
        const material = new Microverse.THREE.MeshBasicMaterial({ color: 0xa0a0a0, side: Microverse.THREE.DoubleSide, transparent: true, opacity });
        const hittableMesh = new Microverse.THREE.Mesh(geometry, material);
        hittableMesh.rotation.x = Math.PI / 2;
        hittableMesh.position.z = -depth / 2;
        this.shape.add(hittableMesh);
        hittableMesh._baseRaycast = hittableMesh.raycast;
        hittableMesh.raycast = (...args) => this.shape.visible ? hittableMesh._baseRaycast(...args) : false;
        this.shape.visible = false; // until placed
        this.updateState();
    }

    updateState() {
        // invoked on every scroll update, so be efficient
        const { buttonState } = this.parent;
        if (!buttonState) return; // size not set yet

        const wasVisible = this.shape.visible;
        this.shape.visible = true;
        const wasEnabled = this.enabled;
        this.enabled = buttonState[this.actor.buttonName];
        if (!wasVisible || this.enabled !== wasEnabled) this.setColor();
    }

    setColor() {
        let svg = this.shape.children[0];
        if (!svg) return;

        let color = this.enabled ? (this.entered ? 0x202020 : 0x404040) : 0xc0c0c0;
        svg.children.forEach(child => child.material[0].color.setHex(color));
    }

    hilite() {
        this.parent.call("PDFView$PDFPawn", "setButtonHilite", this.actor.buttonName, true);
        // this.publish(this.parent.id, "interaction");
    }

    unhilite() {
        this.parent.call("PDFView$PDFPawn", "setButtonHilite", this.actor.buttonName, false);
    }

    updateHilite({ buttons, hilite }) {
        if (!buttons.includes(this.actor.buttonName)) return;

        this.entered = hilite;
        this.setColor();
    }

    tapped() {
        if (!this.enabled) return;

        this.publish(this.parent.actor.id, "buttonPageChange", this.actor.buttonName === "down" ? 1 : -1);
    }
}


export default {
    modules: [
        {
            name: "PDFView",
            actorBehaviors: [PDFActor],
            pawnBehaviors: [PDFPawn],
        },
        {
            name: "PDFButton",
            actorBehaviors: [PDFButtonActor],
            pawnBehaviors: [PDFButtonPawn],
        }
    ]
}

/* globals Microverse */
