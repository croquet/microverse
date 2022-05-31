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

        this.addEventListener("pointerDown", "onPointerDown");
        // this.addEventListener("pointerMove", "onPointerMove");
        // this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("keyDown", "onKeyDown");
        // this.addEventListener("keyUp", "onKeyUp");
        this.addEventListener("pointerWheel", "onPointerWheel");

        this.listen("drawAtScrollPosition", "drawAtScrollPosition");
console.log(this);

        this.substrateObj = this.shape.children.find((o) => o.name === "2d");

        this.TEXTURE_SIZE = 2048;
        this.pages = []; // sparse array of page number to details
        this.visiblePages = []; // sparse array of page number to time page became visible
        this.renderQueue = []; // page numbers to render when we have time
        this.renderingPage = false; // false at startup, to trigger immediate first render
        this.pageMeshPool = [];

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

        // where we already have a mesh for a page we're going to display, be sure
        // to reuse it
        const meshPool = this.pageMeshPool;
        this.shape.children.slice().forEach(o => {
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
                pageMesh.position.set(0, pageY, depth / 2 + 0.001);
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
            shownHeight += fullPageHeight - fullPageHeight * yStart + this.PAGE_GAP; // whether or not page is being shown
            if (p === this.actor.numPages || shownHeight >= cardHeight) return;
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
        const { scrollPosition } = this.actor;
        if (!scrollPosition || !this.PAGE_GAP) return;

        const { page, percent } = scrollPosition;
        const { cardWidth, cardHeight } = this;

        const prevVisible = this.visiblePages;
        const nowVisible = this.visiblePages = [];
        let p = page, yStart = percent / 100, shownHeight = 0;
        while (true) {
            if (prevVisible[p]) nowVisible[p] = prevVisible[p];
            else nowVisible[p] = Date.now();

            if (p === this.actor.numPages) return; // end of the doc

            const pageEntry = this.ensurePageEntry(p);
            const { aspectRatio } = pageEntry;
            if (aspectRatio === undefined) return; // not ready yet

            const fullPageHeight = cardWidth / aspectRatio;
            shownHeight += fullPageHeight - yStart * fullPageHeight + this.PAGE_GAP;
            if (shownHeight >= cardHeight) return;

            p++;
            yStart = 0;
        }
    }

    manageRenderState() {
        // invoked on every update.  schedule rendering for pages that are nearby,
        // and clean up render results and textures that aren't being used.
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
        const cardWidth = this.cardWidth = width * cardScale;
        const cardHeight = this.cardHeight = height * cardScale;
        const obj = this.substrateObj;
        obj.geometry.dispose();
        obj.geometry = this.squareCornerGeometry(cardWidth, cardHeight, depth);
        this.PAGE_GAP = cardHeight * this.actor.PAGE_GAP_PERCENT / 100; // three.js units between displayed pages
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
        this.pdf.getPage(pageNumber).then(proxy => {
            entry.page = proxy;
            const { width, height } = proxy.getViewport({ scale: 1 });
            entry.width = width;
            entry.height = height;

            const maxDim = Math.max(width, height);
            const renderScale = this.TEXTURE_SIZE / maxDim * 0.999;
            entry.renderScale = renderScale;
            entry.aspectRatio = width / height;

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
        this.updateVisiblePages();
        this.manageRenderState();
        this.processRenderQueue();
    }

    destroy() {
        const obj = this.substrateObj;
        obj.geometry.dispose();
        this.material.dispose();

        this.pageMeshPool.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        this.pages.forEach(pageEntry => {
            if (pageEntry.texture) pageEntry.texture.dispose();
        });
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