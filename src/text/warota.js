import {Wrap, Measurer, isNewline, equalStyle, eof, fontRegistry} from "./wrap.js";
import {canonicalizeKeyboardEvent} from "./text-commands.js";

export {
    Wrap, Measurer, isNewline, equalStyle, eof, fontRegistry,
    canonicalizeKeyboardEvent};

// import MockContext from "./MockContext.js";

let lastFontLoadedTime = 0;
export function setLastFontLoadedTime(ms) {
    lastFontLoadedTime = ms;
}

function runLength(ary) {
    return ary.map(c => c.text).reduce((s, x) => x.length + s, 0);
}

export class Doc {
    constructor() {
        this.runs = []; // [{text: str, (opt)style: {(opt)font: str, (opt)size: num, (opt)color: str, (opt)bold: boolean, (opt)italic: boolean}}]
        this.intervals = []; // [{start: num, end: num}]
        this.selections = {}; // {user: {start: num, end: num, isBol: boolean, color: string}}

        this.defaultFont = "DejaVu Sans Mono";
        this.defaultSize = 10;
        // After the canonicalization step, the intervals and runs at least has one element
        // that denotes the end of file
    }

    load(runs) {
        // runs does not have start and end (human would not want to add them by hand).
        // The canonicalize method adds them. save() strip them out.
        this.canonicalize(runs);
    }

    setDefault(font, size) {
        this.defaultFont = font || this.defaultFont;
        this.defaultSize = size || this.defaultSize;
    }

    doEvent(evt) {
        if (evt.type === "insert") {
            this.doInsert(evt.user, evt.runs);
        } else if (evt.type === "delete") {
            this.doDelete(evt.user, evt.backspace);
        } else if (evt.type === "select") {
            this.doSelect(evt.user, evt.start, evt.end, evt.isBol);
        } else if (evt.type === "setStyle") {
            this.doSetStyle(evt.user, evt.style, evt.merge);
        }
    }

    doInsert(user, runs) {
        // runs: [{text: <string>, (opt)style: {}}]
        let selection = this.ensureSelection(user);
        let enter = runs.length > 0 && runs[runs.length - 1].text === "\n";
        if (selection.start === selection.end) {
            let [_run, runIndex] = this.findRun(selection.start);
            let interval = this.intervals[runIndex];
            if (interval.end !== selection.start && interval.start !== selection.start) {
                // that is, pos is within the run
                this.splitRunAt(runIndex, selection.start - interval.start);
                runIndex += 1;
            } else if (interval.end === selection.start) {
                runIndex += 1;
            }
            this.runs.splice(runIndex, 0, ...runs);
            this.canonicalize(this.runs, interval.start);
            this.updateSelectionsInsert(user, selection.start, runLength(runs), enter);
        } else {
            this.doDelete(user, true);
            this.doInsert(user, runs);
        }
    }

    doDelete(user, isBackspace) {
        let selection = this.ensureSelection(user);
        let start, end;
        let length = this.length();

        if (selection.start === selection.end) {
            if ((!isBackspace && selection.start === length)
               || (isBackspace && selection.start === 0)) {
                return;
            }

            if (isBackspace) {
                start = selection.start - 1;
                end = selection.end;
            } else {
                start = selection.start;
                end = selection.end + 1;
            }
        } else {
            start = selection.start;
            end = selection.end;
        }

        let [_run, runIndex] = this.findRun(start);
        let interval = this.intervals[runIndex];

        if (interval.end !== start) { // that is, pos is within the run
            this.splitRunAt(runIndex, start - interval.start);
            // here, previous run ends at pos. and next one starts at pos.
            runIndex += 1;
        }

        let [_endRun, endRunIndex] = this.findRun(end);
        let endRunInterval = this.intervals[endRunIndex];

        let reminder = end - endRunInterval.start;
        if (end !== endRunInterval.end && reminder !== 0) {
            this.splitRunAt(endRunIndex, reminder);
            endRunIndex += 1;
        } else if (end === endRunInterval.end) {
            endRunIndex += 1;
        }

        this.runs.splice(runIndex, endRunIndex - runIndex);
        this.canonicalize(this.runs);
        this.updateSelectionsDelete(user, start, end);
    }

    doSelect(user, start, end, isBol) {
        this.selections[user.id] = {start, end, isBol, color: user.color};
    }

    doSetStyle(user, style, merge) {
        let selection = this.selections[user.id];
        if (selection.start === selection.end) {return;}

        let start = selection.start;
        let end = selection.end;

        // first
        let [run, runIndex] = this.findRun(start);
        let interval = this.intervals[runIndex];

        if (interval.start !== start) {
            this.splitRunAt(runIndex, start - interval.start);
        }

        // end
        [run, runIndex] = this.findRun(end);
        interval = this.intervals[runIndex];
        if (interval.end !== end) {
            this.splitRunAt(runIndex, end - interval.start);
        }

        let s = start;
        let count = 0;
        while (s < end && count < 10000) {
            count++;
            [run, runIndex] = this.findRun(s);
            interval = this.intervals[runIndex];
            if (interval.end <= end) {
                let newStyle = merge ? {...run.style, ...style} : {...style};
                run.style = newStyle;
                s = interval.end;
            }
        }
        this.canonicalize(this.runs);
    }

    length() {
        // excludes eof
        return this.intervals[this.intervals.length - 1].end - 1;
    }

    copyRun(run) {
        if (!run) {return run;}
        let obj = {};
        obj.text = run.text;
        if (run.style) {
            obj.style = run.style;
        }
        return obj;
    }

    canonicalize(runs) {
        // there are two cases: whether the runs has eof or not
        let result = [];
        let newIntervals = [];

        let start = 0;

        let addEOF = () => {
            result.push({text: eof});
            newIntervals.push({start: start, end: start + 1});
        };

        if (runs.length === 0) {
            addEOF();
            this.runs = result;
            this.intervals = newIntervals;
            return;
        }

        let lastRun = this.copyRun(runs[0]);

        let i = 1;
        let run = this.copyRun(runs[i]);
        while (run && run.text !== eof) {
            if (equalStyle(lastRun.style, run.style)) {
                lastRun.text += run.text;
            } else {
                let end = start + lastRun.text.length;
                let interval = {start, end};
                start = end;
                result.push(lastRun);
                newIntervals.push(interval);
                lastRun = run;
            }
            i++;
            run = this.copyRun(runs[i]);
        }
        let end = start + lastRun.text.length;
        let interval = {start, end};
        result.push(lastRun);
        newIntervals.push(interval);
        start = end;

        if (result[result.length - 1].text !== eof) {
            addEOF();
        }
        this.runs = result;
        this.intervals = newIntervals;
    }

    styleAt(index) {
        let [startRun, _startRunIndex] = this.findRun(index);
        return startRun.style;
    }

    save(optStart, optEnd) {
        // intervals is dropped as an external form
        let runs = this.runs;
        let intervals = this.intervals;
        let start = optStart !== undefined ? optStart : 0;
        let end = optEnd !== undefined ? optEnd : this.length();
        let startRun, startRunIndex;
        let endRun, endRunIndex;
        let run, obj, interval;
        [startRun, startRunIndex] = this.findRun(start);
        [endRun, endRunIndex] = this.findRun(end);

        if (startRunIndex === endRunIndex) {
            interval = intervals[startRunIndex];
            obj = this.copyRun({text: startRun.text.slice(start - interval.start, end - interval.start)});
            return [obj];
        }

        let result = [];
        run = startRun;
        interval = intervals[startRunIndex];

        obj = this.copyRun({text: run.text.slice(start - interval.start)}, true);
        result.push(obj);

        for (let i = startRunIndex + 1; i <= endRunIndex - 1; i++) {
            obj = this.copyRun(runs[i]);
            result.push(obj);
        }

        interval = intervals[endRunIndex];

        obj = this.copyRun({text: endRun.text.slice(0, end - interval.start)});
        if (obj.text !== eof) {
            result.push(obj);
        }
        return result;
    }

    plainText(optStart, optEnd) {
        return this.save(optStart, optEnd).map(c => c.text).join('');
    }

    splitRunAt(runIndex, sizeInRun) {
        let run = this.runs[runIndex];
        let interval = this.intervals[runIndex];

        let one = this.copyRun({text: run.text.slice(0, sizeInRun),
                                style: run.style});
        let two = this.copyRun({text: run.text.slice(sizeInRun, run.text.length),
                                style: run.style});
        this.runs.splice(runIndex, 1, one, two);

        one = {start: interval.start, end: interval.start + sizeInRun};
        two = {start: interval.start + sizeInRun, end: interval.end};
        this.intervals.splice(runIndex, 1, one, two);
    }

    findRun(pos) {
        let runs = this.runs;
        let intervals = this.intervals;
        let interval;
        for (let ind = 0; ind < runs.length; ind++) {
            interval = intervals[ind];
            if (interval.start <= pos && pos < interval.end) {
                return [runs[ind], ind];
            }
        }
        if (pos === interval.end) {
            return [runs[runs.length - 1], runs.length - 1];
        }
        return [null, null];
    }

    updateSelectionsInsert(user, pos, length, wasEnter) {
        for (let k in this.selections) {
            let sel = this.selections[k];
            if (k === user.id) {
                this.selections[k] = {start: pos + length, end: pos + length, isBol: wasEnter, color: user.color};
            } else {
                if (pos < sel.start) {
                    this.selections[k] = {start: sel.start + length, end: sel.end + length, isBol: wasEnter, color: sel.color};
                } else if (sel.start < pos && pos < sel.end) {
                    this.selections[k] = {start: sel.start, end: sel.end + length, isBol: wasEnter, color: sel.color};
                } /*else if (sel.end <= pos) {}*/
            }
        }
    }

    updateSelectionsDelete(user, start, end) {
        let len = end - start;
        for (let k in this.selections) {
            let sel = this.selections[k];
            if (k === user.id) {
                this.selections[k] = {start, end: start, color: user.color};
            } else {
                if (end <= sel.start) {
                    this.selections[k] = {start: sel.start - len, end: sel.end - len, color: sel.color};
                } else if (sel.end <= start) {
                } else if (start <= sel.start && sel.end <= end) {
                    this.selections[k] = {start, end: start, color: sel.color};
                } else if (start < sel.start && end < sel.end) {
                    this.selections[k] = {start, end: sel.end - len, color: sel.color};
                } else if (sel.start <= start && end < sel.end) {
                    this.selections[k] = {start: sel.start, end: sel.end - len, color: sel.color};
                } else if (sel.start <= start && start < sel.end) {
                    this.selections[k] = {start: sel.start, end: start, color: sel.color};
                }
            }
            let [run, _runIndex] = this.findRun(this.selections[k].start - 1);
            this.selections[k].isBol = run && isNewline(run.text[run.text.length - 1]);
        }
    }

    setSelections(selections) {
        this.selections = JSON.parse(JSON.stringify(selections));
    }

    getSelections() {
        return JSON.parse(JSON.stringify(this.selections));
    }

    ensureSelection(user) {
        let sel = this.selections[user.id];
        if (!sel) {
            sel = {start: 0, end: 0, color: user.id};
            this.selections[user.id] = sel;
        }
        return sel;
    }

    snapshotFrom(content, user, timezone) {
        return {type: "snapshot",
                user,
                content: {runs: content.runs,
                          selections: JSON.parse(JSON.stringify(content.selections))},
                timezone};
    }

    undoEvent(evt, content, doc) {
        let queue = content.queue;
        let user = evt.user; // {id, color}

        function findLast(q, event) {
            for (let i = q.length - 1; i >= 0; i--) {
                if (q[i].user.id === event.user.id && q[i].timezone === evt.timezone && q[i].type !== "snapshot") {
                    return i;
                }
            }
            return -1;
        }

        function findSnapshot(q, i) {
            for (; i >= 0; i--) {
                if (q[i].type === "snapshot") {
                    return i;
                }
            }
            return -1;
        }

        let undoIndex = findLast(queue, evt);
        if (undoIndex < 0) {return content.timezone;}

        let undoEvent = queue[undoIndex];
        let snapshotIndex = findSnapshot(queue, undoIndex);
        if (snapshotIndex < 0) {return content.timezone;}

        let snapshot = queue[snapshotIndex];
        let c = snapshot.content;
        doc.load(c.runs);
        doc.setSelections(c.selections);

        let newQueue = [];
        for (let i = 0; i <= snapshotIndex; i++) {
            newQueue.push(queue[i]);
        }

        for (let i = snapshotIndex + 1; i < undoIndex; i++) {
            doc.doEvent(queue[i]);
            newQueue.push(queue[i]);
        }

        for (let i = undoIndex + 1; i < queue.length; i++) {
            if (queue[i].type !== "snapshot") {
                doc.doEvent(queue[i]);
                newQueue.push(queue[i]);
            }
        }

        content.timezone++;
        undoEvent.timezone = content.timezone;
        if (!content.undoStacks[user.id]) {
            content.undoStacks[user.id] = [];
        }

        content.undoStacks[user.id].push(undoEvent);
        content.selections = doc.getSelections();
        content.runs = doc.save();
        content.queue = newQueue;
        return content.timezone;
    }

    receiveEditEvents(events, content, doc) {
        // What this method assumes, and what this method does are:
        // - edit events from a client who lagged badly won't be processed.
        // - The model maintains the timezone counter, which is incremented once for a series
        //   of edit commands from a client (effectively, once in the invocation of
        //   this method).
        // - An event sent to the model (to this method) has a timezone value,
        //   which is the value the model sent to the view as the last view update. That is,
        //   the view commands are considered to be generated in that logical timezone.
        // - When an event arrives, first the timezone of the event is checcked to see
        //   if it is still considered recent enough.
        //   -- insert and delete events use the selection value in the model;
        //      so they don't have to be transformed.  They are puhsed into the list.
        //   -- a select event may be off as there are edit events already processed;
        //      so it has to be transformed against the events in the list with the same
        //      logical time or after but already in the list.
        // - The model executes new events, and update its data structure.
        // - Then, the early elements in the list are dropped as they are deemed to be
        //   past their life.
        // - The list is a part of the saved model. It will be saved with the string content.
        // Things are all destructively updated in content,

        let CUTOFF = 60;
        let queue = content.queue;
        let user = events[0].user; // {id, color}

        if (content.timezone % (CUTOFF / 6) === 0) {
            queue.push(this.snapshotFrom(content, user, content.timezone));
        }

        content.timezone++;

        if (queue.length > 0
            && (queue[queue.length - 1].timezone > events[0].timezone + CUTOFF)) {
            return [content.timezone, false];
        }

        function findFirst(q, event) {
            if (q.length === 0) {
                return 0;
            }
            if (q[queue.length - 1].timezone < event.timezone) {
                return q.length;
            }
            for (let i = q.length - 1; i >= 0; i--) {
                if (q[i].timezone < event.timezone) {
                    return i + 1;
                }
            }
            return 0;
        }

        function transform(n, o) {
            // it already assumes that n (for new) is newer than o (for old)
            // the first empty obj in assign is not necessary; but make it easier to debug
            if (n.type === "select") {
                if (o.type === "insert") {
                    if (o.pos <= n.start) {
                        return {...n, ...{start: n.start + o.length,
                                          end: n.end + o.length}};
                    }
                    if (n.start <= o.pos && o.pos <= n.end) {
                        return {...n, ...{end: n.end + o.length}};
                    }
                    return n;
                }
                if (o.type === "delete") {
                    if (n.end <= o.start) {
                        return n;
                    }
                    if (o.start <= n.start && n.end <= o.end) {
                        // subsume
                        return {...n, ...{start: o.start, end: o.start}};
                    }
                    if (o.end <= n.start) {
                        return n;
                    }
                    if (n.start <= o.start && n.end < o.end) {
                        return {...n, ...{end: o.start}};
                    }
                    if (o.start <= n.start && o.end < n.end) {
                        return {...n, ...{start: o.start, end: n.end - o.end}};
                    }
                }
                if (o.type === "select") {
                    return n;
                }
            }
            return n;
        }

        let thisQueue = [];
        let unseenIDs = {...content.selections};

        // all events in the variable 'events' should be in the same timezone;
        // so pick the zero-th one
        let ind = findFirst(queue, events[0]);

        events.forEach(event => {
            let t = event;
            if (ind >= 0) {
                for (let i = ind; i < queue.length; i++) {
                    t = transform(t, queue[i]);
                }
            }
            t.timezone = content.timezone;
            thisQueue.push(t);
        });

        queue.push(...thisQueue);

        // finish up by dropping old events
        ind = queue.findIndex(e => e.timezone > content.timezone - CUTOFF);
        for (let i = queue.length - 1; i >= 0; i--) {
            let e = queue[i];
            delete unseenIDs[e.user.id];
        }
        for (let k in unseenIDs) {
            delete content.selections[k];
            delete content.undoStacks[k];
        }
        queue.splice(0, ind);

        doc.setSelections(content.selections);
        let hasDone = false;
        thisQueue.forEach(e => {
            hasDone = hasDone || (e.type === "insert" || e.type === "delete");
            doc.doEvent(e);
        });

        content.runs = doc.save();
        content.selections = doc.getSelections();
        return [content.timezone, hasDone];
    }
}

export class Warota {
    constructor(options, optDoc) {
        this.doc = optDoc || new Doc();

        this._width = 0;
        if (options.margins) {
            this.margins = options.margins;
        } else {
            this.margins = options.margins = {left: 0, top: 0, right: 0, bottom: 0};
        }

        this.options = options;

        this.scrollLeft = 0;
        this.scrollTop = 0;
        this.relativeScrollBarWidth = 0.02;
        this.showsScrollbar = options.showScrollBar;
        this.isScrollable = true;

        this.resize(options.width, options.height);
        this.resizeToNumLinesOrFontSize(options);

        this.events = [];
        this.timezone = 0;
    }

    resetEvents() {
        this.events = [];
    }

    width(width) {
        if (width === undefined) {
            return this._width;
        }
        this._width = width;
        return null;
    }

    setTimezone(num) {
        this.timezone = num;
    }

    resize(width, height) {
        this.screenWidth = width;
        this.screenHeight = height;
    }

    resizeToNumLinesOrFontSize(options) {
        this.defaultMeasurer = new Measurer();
        let lineHeight = this.defaultMeasurer.lineHeight(options.font, options.fontSize);
        let marginHeight = (options.margins.top + options.margins.bottom);
        let textScreenHeight = options.height - marginHeight;
        if (options.fontSize) {
            options.numLines = textScreenHeight / options.fontSize;
        } else {
            if (options.numLines) {
                options.fontSize = textScreenHeight / options.numLines;
            } else {
                options.numLines = 10;
                options.fontSize = textScreenHeight / options.numLines;
            }
        }

        let textScreenPixels = options.numLines * lineHeight;
        let heightInPixel = options.fontSize / lineHeight;
        let neededPixels = textScreenPixels + marginHeight * heightInPixel;

        this.pixelY = neededPixels;
        let scale = neededPixels / this.screenHeight;
        this.pixelX = this.screenWidth * scale;

        if (this.pixelX * this.relativeScrollBarWidth <= 30) {
            this.relativeScrollBarWidth = 30 / this.pixelX;
        }

        this.width(this.pixelX * (1.0 - (this.showsScrollbar ? this.relativeScrollBarWidth : 0)));
        this.lineHeight = lineHeight;
        this.pixelMargins = {
            left: options.margins.left / heightInPixel,
            right: options.margins.right / heightInPixel,
            top: options.margins.top / heightInPixel,
            bottom: options.margins.bottom / heightInPixel
        };

        options.pixelMargins = this.pixelMargins;
    }

    resetMeasurer() {
        this.defaultMeasurer = new Measurer();
    }

    layout() {
        if (this.lastFontLoadedTimeChecked === undefined ||
            this.lastFontLoadedTimeChecked < lastFontLoadedTime) {
            this.resetMeasurer();
            this.lastFontLoadedTimeChecked = lastFontLoadedTime;
        }
        let options = this.options || {};
        let layoutWidth = options.singleLine ? Number.MAX_VALUE : this._width;
        let hMargin = this.margins.left + this.margins.right;
        let vMargin = this.margins.top + this.margins.bottom;
        let [lines, words] = new Wrap().wrap(this.doc.runs, layoutWidth, this.defaultMeasurer, this.doc.defaultFont, this.doc.defaultSize, this.pixelMargins);
        this.lines = lines;
        this.words = words;

        this.hasLastEnter = false;
        if (this.lines.length - 2 >= 0) {
            let lastRealLine = this.lines[this.lines.length - 2];
            let penultimateWord = lastRealLine[lastRealLine.length - 1];
            this.hasLastEnter = isNewline(penultimateWord.text);
        }

        let lastWord; // there should be always one
        if (options.singleLine) {
            lastWord = lines[0][lines[0].length - 1];
        } else {
            lastWord = lines[lines.length - 1][0];
        }
        if (options.autoResize) {
            this.newWidth = (lastWord.left + lastWord.width + hMargin);
            this.newHeight = (lastWord.top + lastWord.height + vMargin);
            this.docHeight = lastWord.top + lastWord.height;
        } else {
            this.docHeight = lastWord.top + lastWord.height;
        }
    }

    /*
    paint() {
        let ctx = new MockContext();
        let canvas = {width: this.pixelX, height: this.pixelY};
        let docHeight = this.docHeight;
        let absScrollTop = this.scrollTop * docHeight;
        let absScrollLeft = this.scrollLeft * this.pixelX;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(0, -absScrollTop);

        this.draw(ctx, {left: absScrollLeft, top: absScrollTop, width: this.pixelX, height: this.pixelY});
        this.drawSelections(ctx);

        if (this.showsScrollbar) this.drawScrollbar(ctx);

        ctx.restore();
        if (this.mockCallback) {
            this.mockCallback(ctx);
        }
        return ctx;
    }
    */

    visibleBounds() {
        let docH = this.docHeight;
        return {left: this.scrollLeft * this.pixelX, top: this.scrollTop * docH,
                width: this.pixelX, height: this.pixelY};
    }

    visibleTextBounds() {
        let r = this.visibleBounds();
        let w = r.width * (1.0 - (this.showsScrollbar ? this.relativeScrollBarWidth : 0));
        let h = r.height;
        return {l: r.left, t: r.top, w: w, h: r.height, b: r.top + h, r: r.left + w};
    }

    draw(ctx, rect) {
        let {left, top, width, height} = rect;
        this.words.forEach(word => {
            if (word.left + word.width < left || word.top > top + height
                || word.top + word.height < top || word.left > left + width) {return;}
            if (word.styles) {
                let wLeft = word.left;
                word.styles.forEach(partialStyle => {
                    ctx.fillStyle = partialStyle.style ? partialStyle.style : {color: 'black'};
                    ctx.fillText(word.text.slice(partialStyle.start, partialStyle.end), wLeft, word.top + word.ascent);
                    wLeft += partialStyle.width;
                });
            } else {
                ctx.fillStyle = word.style || 'black';
                ctx.fillText(word.text, word.left, word.top + word.ascent);
            }
        });
    }

    drawSelections(ctx) {
        ctx.save();
        for (let k in this.doc.selections) {
            let selection = this.doc.selections[k];
            if (selection.end === selection.start) {
                ctx.fillStyle = 'barSelection ' + selection.color;
                let caretRect = this.barRect(selection);
                ctx.fillRect(caretRect.left, caretRect.top, caretRect.width, caretRect.height);
            } else {
                ctx.fillStyle = 'boxSelection ' + selection.color;
                let rects = this.selectionRects(selection);
                rects.forEach(box => {
                    ctx.fillRect(box.left, box.top, box.width, box.height);
                });
            }
        }
        ctx.restore();
    }

    drawScrollbar(ctx) {
        let {l, t, h, w} = this.scrollbarBounds();
        ctx.save();
        ctx.fillStyle = "scrollBar";
        ctx.fillRect(l, 0, w, this.pixelY);

        ctx.fillStyle = "scrollKnob";
        ctx.fillRect(l + 3, t, w - 6, h);
        ctx.restore();
    }

    scrollbarBounds() {
        let {
            pixelX,
            pixelY,
            scrollTop: scrollT, // ratio into area
            relativeScrollBarWidth: relWidth,
        } = this;
        let docH = this.docHeight;
        let scrollVRatio = pixelY / docH;
        let barW = pixelX * (this.showsScrollbar ? relWidth : 0);
        let barLeft = pixelX - barW;
        let barTop = scrollT * pixelY;
        let minHeight = pixelY / 100 * 5;
        let barH = scrollVRatio > 1.0 ? pixelY - 3 : Math.max(minHeight, pixelY * scrollVRatio - 6);
        return {l: barLeft, t: barTop, w: barW, h: barH};
    }

    scrollBy(deltaX, deltaY) {
        this.setScroll(this.scrollLeft = deltaX, this.scrollTop + deltaY);
    }

    setScroll(scrollLeft, scrollTop) {
        let {pixelY, docHeight} = this;
        let max = 1.0 - pixelY / docHeight;
        this.scrollTop = Math.max(0, Math.min(max, scrollTop));
    }

    findLine(pos, x, y) {
        // a smarty way would be to do a binary search
        let lines = this.lines;
        if (x !== undefined && y !== undefined) {
            let lineIndex = lines.findIndex(line => {
                let max = line.reduce((acc, cur) => Math.max(acc, cur.height), 0);
                let w = line[0]; // should be always one
                return w.top <= y && y < w.top + max;
            });
            if (lineIndex < 0) { // should always be the past end of line.
                lineIndex = lines.length - 1;
            }
            return [lines[lineIndex], lineIndex];
        }

        let lineIndex = lines.findIndex(line => {
            let start = line[0];
            let end = line[line.length - 1];
            return start.start <= pos && pos < end.end;
        });

        if (lineIndex < 0) { // falls back on the last eof line
            lineIndex = lines.length - 1;
        }
        return [lines[lineIndex], lineIndex];
    }

    findWord(pos, x, y) {
        if (x !== undefined && y !== undefined) {
            let [line, _lineIndex] = this.findLine(pos, x, y);
            let wordIndex = line.findIndex(w => w.left <= x && x < w.left + w.width);
            if (wordIndex < 0) {
                if (x < line[0].left) {
                    wordIndex = 0;
                } else {
                    wordIndex = line.length - 1;
                }
            }
            return line[wordIndex];
        }

        let [line, _lineIndex] = this.findLine(pos, x, y);

        let wordIndex = line.findIndex(w => w.start <= pos && pos < w.end);
        if (wordIndex < 0) {
            if (x < line[0].left) {
                wordIndex = 0;
            } else {
                wordIndex = line.length - 1;
            }
        }
        return line[wordIndex];
    }

    insert(user, runs) {
        let evt = Event.insert(user, runs, this.timezone);
        this.events.push(evt);
    }

    delete(user, backspace) {
        let evt = Event.delete(user, backspace, this.timezone);
        this.events.push(evt);
    }

    select(user, start, end, isBol) {
        let evt = Event.select(user, start, end, isBol, this.timezone);
        this.lastSelect = {start, end};
        this.events.push(evt);
    }

    setStyle(user, style, merge) {
        let evt = Event.setStyle(user, style, merge);
        this.events.push(evt);
    }

    doEvent(evt) {
        this.doc.doEvent(evt);
        this.layout();
    }

    positionFromIndex(pos) {
        let word = this.findWord(pos);
        if (pos === 0 && word.text === eof) {
            let margins = this.margins || {};
            return {
                left: 0 + (margins.left || 0),
                top: 0 + (margins.top || 0),
                width: 0,
                height: word.height
            };
        }

        let localPos = pos - word.start;
        let tmpWord = {...word};
        tmpWord.text = word.text.slice(0, localPos);
        let measure0 = this.defaultMeasurer.measureText(tmpWord, this.doc.defaultFont, this.doc.defaultSize);
        tmpWord.text = word.text.slice(0, localPos + 1);
        let measure1 = this.defaultMeasurer.measureText(tmpWord, this.doc.defaultFont, this.doc.defaultSize);
        return {left: word.left + measure0.width, top: word.top, width: measure1.width - measure0.width, height: word.height};
    }

    indexFromPosition(x, y) {
        let word = this.findWord(null, x, y);
        let last = 0;
        let lx = x - word.left;
        if (lx < 0) {return word.start;}
        if (word.text === eof) {return word.start;}
        if (isNewline(word.text)) {return word.start;}
        let tmpWord = {...word};
        for (let i = 0; i <= word.text.length; i++) {
            let measure;
            tmpWord.text = word.text.slice(0, i !== 0 ? i : 1);
            measure = this.defaultMeasurer.measureText(tmpWord, this.doc.defaultFont, this.doc.defaultSize);
            let half = (measure.width - last) / 2;
            if (last <= lx && lx < last + half) {
                return word.start + (i === 0 ? 0 : i - 1);
            }
            if (last + half <= lx && lx < measure.width) {
                return word.start + i;
            }
            last = measure.width;
        }
        return word.end;
    }

    isBol(x, y) {
        let [line, _lineIndex] = this.findLine(null, x, y);
        let word = line[0];
        if (x < word.left) {return true;}
        if (word.text === eof) {return this.hasLastEnter;}
        let tmpWord = {...word};
        tmpWord.text = word.text.slice(0, 1);
        let measure = this.defaultMeasurer.measureText(tmpWord, this.doc.defaultFont, this.doc.defaultSize);
        let half = measure.width / 2;
        return x - word.left < half;
    }

    changeLine(user, pos, dir) {
        let [_line, lineIndex] = this.findLine(pos);
        if (dir > 0 && lineIndex === this.lines.length - 2) {
            if (this.hasLastEnter) {
                return this.lines[this.lines.length - 1][0].start;
            }
            return pos;
        }
        let rect = this.positionFromIndex(pos);
        let newLineIndex = lineIndex + dir;
        if (newLineIndex < 0) {return 0;}
        if (newLineIndex >= this.lines.length) {
            return this.lines[this.lines.length - 1][0].start;
        }
        let newLine = this.lines[newLineIndex];
        if (newLine.length === 1 && newLine[0].text.length === 1 &&
            (newLine[0].text === "\n" || newLine[0].text === "\r")) {
            return newLine[0].start;
        }
        return this.indexFromPosition(rect.left, newLine[0].top);
    }

    lineHeightAt(index) {
        if (this.doc.length() === 0) {
            return this.defaultMeasurer.measureText({text: 'x'}, this.doc.defaultFont, this.doc.defaultSize).height;
        }
        let [line, _lineIndex] = this.findLine(index);
        return line.reduce((acc, cur) => Math.max(cur.height, acc), 0);
    }

    barRect(selection) {
        let pos = selection.start;
        if (pos === 0) {
            let rect = this.positionFromIndex(pos);
            let height = this.lineHeightAt(pos);
            return {left: rect.left - 1, top: rect.top, width: 2, height};
        }

        if (pos === this.doc.length()) {
            if (selection.isBol) {
                let rect = this.positionFromIndex(pos);
                let height = this.lineHeightAt(pos);
                return {left: rect.left - 1, top: rect.top, width: 2, height};
            }
            let [prevLine, _prevLineIndex] = this.findLine(pos - 1);
            pos = prevLine[prevLine.length - 1].end - 1;
            let rect = this.positionFromIndex(pos);
            let height = this.lineHeightAt(pos);
            return {left: rect.left + rect.width - 1, top: rect.top, width: 2, height};
        }

        let rect = this.positionFromIndex(pos);
        let height = this.lineHeightAt(pos);
        if (selection.isBol) {
            return {left: rect.left - 1, top: rect.top, width: 2, height};
        }
        return {left: rect.left - 1, top: rect.top, width: 2, height};
    }

    selectionRects(selection) {
        let {start, end} = selection;

        let [line0, line0Index] = this.findLine(start);
        let [line1, line1Index] = this.findLine(end);

        if (line0 === undefined || line1 === undefined) {return [];}

        if (line0Index === line1Index) {
            // one rectangle
            let pos1 = this.positionFromIndex(start);
            let pos2 = this.positionFromIndex(end);
            let height = this.lineHeightAt(start);
            return [{left: pos1.left, top: pos1.top,
                     width: pos2.left - pos1.left,
                     height: height}];
        }

        let rects = [];
        let pos1 = this.positionFromIndex(start);
        let height1 = this.lineHeightAt(start);
        let pos2;
        let height2;
        if (end === this.doc.length()) {
            let lastWord = this.findWord(end - 1);
            if (isNewline(lastWord.text[lastWord.length - 1])) {
                end--;
                let [newLine1, newLine1Index] = this.findLine(end);
                line1 = newLine1;
                line1Index = newLine1Index;
            }
        }

        pos2 = this.positionFromIndex(end);
        height2 = this.lineHeightAt(end);

        rects.push({left: pos1.left, top: pos1.top,
                    width: this.width() - pos1.left,
                    height: height1});
        if (line1Index - line0Index >= 2) {
            pos1 = this.lines[line0Index + 1][0];
            rects.push({left: this.pixelMargins.left, top: pos1.top,
                        width: this.width(),
                        height: pos2.top - pos1.top});
        }

        pos1 = this.lines[line1Index][0];
        height2 = this.lineHeightAt(end);
        rects.push({left: this.pixelMargins.left, top: pos2.top,
                    width: pos2.left - this.pixelMargins.left,
                    height: height2});
        return rects;
    }

    isScrollbarClick(x, y) {
        if (!this.showsScrollbar) {return false;}
        let scrollBarWidth = this.relativeScrollBarWidth * this.pixelX,
            scrollBarLeft = this.pixelX - scrollBarWidth - 3;
        return x >= scrollBarLeft;
    }

    mouseDown(x, y, realY, user) {
        if (this.isScrollbarClick(x, y)) {
            this.scrollBarClick = {
                type: "clicked",
                scrollBarVOffset: y - this.scrollbarBounds().t,
                scrollBarTopOnDown: this.scrollTop,
                realStartY: realY,
                startX: x, startY: y
            };
        } else {
            let index = this.indexFromPosition(x, y);
            let isBol = this.isBol(x, y);
            this.extendingSelection = null;
            this.selectDragStart = index;
            this.select(user, index, index, isBol);
        }
        this.keyboardX = null;
    }

    mouseMove(x, y, realY, user) {
        if (this.selectDragStart !== null) {
            let other = this.indexFromPosition(x, y);
            let start, end;
            if (other || other === 0) {
                this.focusChar = other;
                if (this.selectDragStart > other) {
                    this.extendingSelection = 'top';
                    start = other;
                    end = this.selectDragStart;
                } else {
                    this.extendingSelection = 'bottom';
                    start = this.selectDragStart;
                    end = other;
                }
                let last = this.lastSelect;
                if (last && (last.start !== start || last.end !== end)) {
                    this.select(user, start, end);
                    return 'selectionChanged';
                }
            }
            return null;
        }

        if (this.scrollBarClick) {
            let {realStartY, scrollBarTopOnDown} = this.scrollBarClick;
            let docHeight = this.docHeight;
            let newPos = (realY - realStartY) // movement
                          * Math.max(1, docHeight / this.pixelY) // how many pixels it means relative to doc height
                          / docHeight   // ratio in doc height
                          + scrollBarTopOnDown;  // make it the new value
            this.scrollBarClick.type = "move";
            this.setScroll(0, newPos);
            return 'scrollChanged';
        }
        return null;
    }

    mouseUp(x, y, realY, user) {
        if (this.scrollBarClick) {
            if (this.scrollBarClick.type === "clicked") {
                // click to scroll behavior
            }
            this.scrollBarClick = null;
            this.wasScrollBarClick = true;
        } else {
            this.wasScrollBarClick = false;
        }
        this.selectDragStart = null;
        this.keyboardX = null;
        this.lastSelect = null;
    }

    backspace(user) {
        this.delete(user, true);
    }

    handleKey(user, key, selecting, ctrlKey) {
        let selection = this.doc.selections[user.id] || {start: 0, end: 0, color: user.color};
        let {start, end, isBol} = selection;
        let length = this.doc.length();
        let handled = false;

        let wasLine;
        let wasLineIndex;

        if (!selecting) {
            this.keyboardSelect = 0;
        } else if (!this.keyboardSelect) {
            switch (key) {
                case 37: // left arrow
                case 38: // up - find character above
                case 36: // start of line
                case 33: // page up
                    this.keyboardSelect = -1;
                    break;
                case 39: // right arrow
                case 40: // down arrow - find character below
                case 35: // end of line
                case 34: // page down
                    this.keyboardSelect = 1;
                    break;
                default:
                    break;
            }
        }

        let pos = this.keyboardSelect === 1 ? end : start;
        let oldPos = pos;
        let downEnd;
        let changingCaret = false;
        switch (key) {
            case 37: // left arrow
                if (!selecting && start !== end) {
                    pos = start;
                } else {
                    if (pos > 0) {
                        pos--;
                    }
                }
                isBol = false;
                changingCaret = true;
                break;
            case 39: // right arrow
                if (!selecting && start !== end) {
                    pos = end;
                } else {
                    if (pos < length) {
                        let [line, lineIndex] = this.findLine(pos);
                        wasLine = line;
                        wasLineIndex = lineIndex;
                        pos++;
                    }
                }
                changingCaret = true;
                break;

            case 40: // down arrow - find character below
                {
                    let [line, lineIndex] = this.findLine(pos);
                    wasLine = line;
                    wasLineIndex = lineIndex;
                    pos = this.changeLine(user, pos, 1);
                    downEnd = oldPos === pos;
                    changingCaret = true;
                }
                break;
            case 38: // up - find character above
                pos = this.changeLine(user, pos, -1);
                isBol = false;
                changingCaret = true;
                break;

            case 8: // backspace
            case 46: // delete
                this.backspace(user);
                handled = true;
                break;
            default:
                break;
        }

        if (changingCaret) {
            switch (this.keyboardSelect) {
                case 0:
                    start = end = pos;
                    break;
                case -1:
                    start = pos;
                    break;
                case 1:
                    end = pos;
                    break;
                default:
                    break;
            }

            if (start === end) {
                this.keyboardSelect = 0;
            }
            if (start > end) {
                this.keyboardSelect = -this.keyboardSelect;
                let t = end;
                end = start;
                start = t;
            }

            let nowIndex;
            if (wasLine) {
                let [_line, lineIndex] = this.findLine(pos);
                nowIndex = lineIndex;
                isBol = (wasLineIndex !== nowIndex && this.hasLastEnter) || downEnd;
            }

            this.select(user, start, end, isBol);
            handled = true;
        }

        if (ctrlKey) {
            switch (key) {
                case 65:
                    this.select(user, 0, length);
                    window.editor = this;
                    handled = true;
                    break;
                default:
                    break;
            }
        }

        return handled;
    }

    selectionText(user) {
        let sel = this.doc.selections[user.id];
        if (!sel) {
            return "";
        }
        return this.doc.plainText(sel.start, sel.end);
    }
}

export class Event {
    static insert(user, runs, timezone) {
        return {type: "insert", user, runs, length: runLength(runs), timezone};
    }

    static delete(user, backspace, timezone) {
        return {type: "delete", backspace, user, timezone};
    }

    static select(user, start, end, isBol, timezone) {
        return {type: "select", user, start, end, isBol, timezone};
    }

    static setStyle(user, style, merge) {
        return {type: "setStyle", user, style, merge};
    }
}
