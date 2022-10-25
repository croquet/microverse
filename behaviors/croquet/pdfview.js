class PDFActor {
    setup() {
        // these will be initialised by the first client to load the doc and figure out
        // a suitable aspect ratio.  pageGapPercent is needed for calculating overall
        // scroll position.
        if (this.numPages === undefined) {
            this.measuredDocLocation = null; // pdfLocation for the latest doc for which we have measurements
            this.numPages = null;
            this.pageGapPercent = null;
            this.scrollPosition = null;
        }

        this.listen("docLoaded", "docLoaded");
        this.listen("changePage", "changePage");
        this.listen("scrollByPercent", "scrollByPercent");
        this.listen("requestScrollPosition", "requestScrollPosition");
    }

    viewJoined(viewId) {
    }

    viewExited(viewId) {
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
            this.scrollPosition = null;
        }
        if (this.scrollPosition === null) this.scrollPosition = { page: 1, percent: 0 };
        this.say("drawAtScrollPosition");
    }

    changePage(increment) {
        // increment is only ever +/- 1
        let { page, percent } = this.scrollPosition;
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

        this.scrollPosition = this.normalizeScroll(page, 0);
        this.say("drawAtScrollPosition");
    }

    requestScrollPosition({ page, percent }) {
        const { page: newPage, percent: newPercent } = this.normalizeScroll(page, percent);
        this.announceScrollIfNew(newPage, newPercent);
    }

    scrollByPercent(increment) {
        let { page, percent } = this.scrollPosition;
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
        const { page: oldPage, percent: oldPercent } = this.scrollPosition;
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
                s.setAttribute('src', 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js');
                s.onload = () => {
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
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
        this.listen("drawAtScrollPosition", "drawAtScrollPosition");
        this.listen("updateShape", "updateShape");

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

    drawAtScrollPosition() {
        if (!this.hasLatestPDF() || !this.pageGap) return;

        const { scrollPosition } = this.actor;
        if (!scrollPosition) return;

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
        const { page, percent } = scrollPosition;
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
                const geo = pageMesh.geometry = new THREE.PlaneGeometry(cardWidth, pageHeight);
                this.shape.add(pageMesh);
                const pageY = cardHeight / 2 - shownHeight - topGap - pageHeight / 2;
                pageMesh.position.set(0, pageY, depth / 2 + 0.003);
                const uv = geo.attributes.uv;
                uv.setXY(0, 0, 1 - imageTop);
                uv.setXY(1, 1, 1 - imageTop);
                uv.setXY(2, 0, 1 - imageBottom);
                uv.setXY(3, 1, 1 - imageBottom);
                uv.needsUpdate = true;

                if (!pageEntry.texture) pageEntry.texture = new THREE.Texture(renderResult);
                if (pageMesh.material.map !== pageEntry.texture) {
                    pageMesh.material.map = pageEntry.texture;
                    pageEntry.texture.needsUpdate = true;
                }
            }
            shownHeight += fullPageHeight - fullPageHeight * yStart + this.pageGap; // whether or not page is being shown
            if (p === this.numPages || shownHeight >= cardHeight) return;
            else {
                p++;
                yStart = 0;
            }
        }
    }

    makePageMesh() {
        const { cardWidth, cardHeight } = this;
        const pageGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
        const pageMaterial = new THREE.MeshBasicMaterial({ color: "#fff", side: THREE.DoubleSide, toneMapped: false });
        const pageMesh = new THREE.Mesh(pageGeometry, pageMaterial);
        pageMesh.name = "page";
        return pageMesh;
    }

    updateVisiblePages() {
        // this is invoked on every update, so if any page that we
        // want to test isn't ready yet (PageProxy hasn't been fetched) we don't
        // wait for it.
        const { page, percent } = this.actor.scrollPosition;
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
        const { page } = this.actor.scrollPosition;
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

        let shape = new THREE.Shape();
        shape.moveTo(-x, -y);
        shape.lineTo(-x, y);
        shape.lineTo(x, y);
        shape.lineTo(x, -y);
        shape.lineTo(-x, -y);

        let extrudePath = new THREE.LineCurve3(new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, -z));
        extrudePath.arcLengthDivisions = 3;
        let geometry = new THREE.ExtrudeGeometry(shape, { extrudePath });

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
        this.pointerDownScroll = { ...this.actor.scrollPosition };
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

    changePage(change) {
        this.say("changePage", change);
    }

    onKeyUp(e) {
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
