import {THREE} from "@croquet/worldcore";

let X_HEIGHTS = ['x', 'e', 'a', 'o', 'n', 's', 'r', 'c', 'u', 'm', 'v', 'w', 'z'];
let M_WIDTHS = ['m', 'w'];
let CAP_HEIGHTS = ['H', 'I', 'N', 'E', 'F', 'K', 'L', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

let TAB_ID = '\t'.charCodeAt(0);
let SPACE_ID = ' '.charCodeAt(0);
let NB_SPACE_ID = '\xa0'.charCodeAt(0);

/*
let ALIGN_LEFT = 0;
let ALIGN_CENTER = 1;
let ALIGN_RIGHT = 2;
*/

function number(a, b) {
    return (a === 0 || a) ? a : b;
}

export class TextLayout {
    constructor(opt) {
        this.glyphs = [];
        opt.tabSize = opt.tabSize || 4;
        this._opt = opt;
        this.setupSpaceGlyphs(opt.font);
    }

    setupSpaceGlyphs(font) {
        //These are fallbacks, when the font doesn't include
        //' ' or '\t' or &nbsp; glyphs
        this._fallbackSpaceGlyph = null;
        this._fallbackNBSpaceGlyph = null;
        this._fallbackTabGlyph = null;

        if (!font.chars || font.chars.length === 0) {return;}

        //try to get space glyph
        //then fall back to the 'm' or 'w' glyphs
        //then fall back to the first glyph available
        let space = getGlyphById(font, SPACE_ID) || getMGlyph(font) || font.chars[0];

        //and create a fallback for tab
        let tabWidth = this._opt.tabSize * space.xadvance;
        this._fallbackSpaceGlyph = space;
        this._fallbackNBSpaceGlyph = space;
        this._fallbackTabGlyph = {...space, ...{
            x: 0, y: 0, xadvance: tabWidth, id: TAB_ID,
            xoffset: 0, yoffset: 0, width: 0, height: 0
        }};
    }

    getGlyph(font, id) {
        let glyph = getGlyphById(font, id);
        if (glyph) {return glyph;}

        if (id === TAB_ID) {return this._fallbackTabGlyph;}
        if (id === SPACE_ID || NB_SPACE_ID) {return this._fallbackSpaceGlyph;}
        return null;
    }

    measureText(text, _scale) {
        let letterSpacing = this._opt.letterSpacing || 0;
        let font = this._opt.font;
        let curPen = 0;
        let curWidth = 0;
        //let count = 0;
        let glyph;
        let lastGlyph;
        let height = 0;

        for (let i = 0; i < text.length; i++) {
            let id = text.charCodeAt(i);
            glyph = this.getGlyph(font, id);

            if (glyph) {
                //move pen forward
                let kern = lastGlyph ? getKerning(font, lastGlyph.id, glyph.id) : 0;
                curPen += kern;

                curPen = curPen + glyph.xadvance + letterSpacing;
                curWidth = curPen; // + glyph.width
                height = Math.max(height, glyph.height);
                lastGlyph = glyph;
            }
            // count++;
        }

        return {
            ascent: font.common.base,
            height: font.common.lineHeight,
            descent: font.common.lineHeight - font.common.base,
            width: curWidth,
        };
    }

    computeGlyphs(opt) {
        let glyphs = [];

        let drawnStrings = opt.drawnStrings;

        if (!opt.font) {
            throw new Error('must provide a valid bitmap font');
        }

        let font = opt.font;

        //the pen position
        let lineHeight = number(opt.lineHeight, font.common.lineHeight);
        let baseline = font.common.base;
        let descender = lineHeight - baseline;
        let letterSpacing = opt.letterSpacing || 0;
        let height = lineHeight - descender;
        // let align = getAlignType(this._opt.align);

        drawnStrings.forEach((drawnString) => {
            let x = drawnString.x;
            let y = drawnString.y;
            let style = drawnString.style;

            //draw text along baseline
            //y -= height

            //the metrics for this text layout
            this._height = height;
            this._descender = lineHeight - baseline;
            this._baseline = baseline;
            this._xHeight = getXHeight(font);
            this._capHeight = getCapHeight(font);
            this._lineHeight = lineHeight;
            this._ascender = lineHeight - descender - this._xHeight;

            //layout each glyph
            let lastGlyph;
            let lastStyle;
            let color;
            for (let i = 0; i < drawnString.string.length; i++) {
                let id = drawnString.string.charCodeAt(i);
                let glyph = this.getGlyph(font, id);
                if (glyph) {
                    if (lastGlyph) {
                        x += getKerning(font, lastGlyph.id, glyph.id);
                    }

                    if (style === "black") {
                        color = null;
                        lastStyle = "black";
                    } else if (lastStyle !== style) {
                        color = new THREE.Color(style);
                        lastStyle = style;
                    }
                    glyphs.push({
                        position: [x, y],
                        data: glyph,
                        index: i,
                        color: color
                    });

                    //move pen forward
                    x += glyph.xadvance + letterSpacing;
                    lastGlyph = glyph;
                }
            }
        });
        return glyphs;
    }
}

/*
//getters for the private vars
['width', 'height',
  'descender', 'ascender',
  'xHeight', 'baseline',
  'capHeight',
  'lineHeight' ].forEach(addGetter)

function addGetter(name) {
  Object.defineProperty(TextLayout.prototype, name, {
    get: wrapper(name),
    configurable: true
  })
}

//create lookups for private vars
function wrapper(name) {
  return (new Function([
    'return function '+name+'() {',
    '  return this._'+name,
    '}'
  ].join('\n')))()
}

*/

function getGlyphById(font, id) {
    if (!font.chars || font.chars.length === 0) {return null;}

    let glyphIdx = findChar(font.chars, id);
    if (glyphIdx >= 0) {return font.chars[glyphIdx];}
    return null;
}

function getXHeight(font) {
    for (let i = 0; i < X_HEIGHTS.length; i++) {
        let id = X_HEIGHTS[i].charCodeAt(0);
        let idx = findChar(font.chars, id);
        if (idx >= 0) {return font.chars[idx].height;}
    }
    return 0;
}

function getMGlyph(font) {
    for (let i = 0; i < M_WIDTHS.length; i++) {
        let id = M_WIDTHS[i].charCodeAt(0);
        let idx = findChar(font.chars, id);
        if (idx >= 0) {return font.chars[idx];}
    }
    return 0;
}

function getCapHeight(font) {
    for (let i = 0; i < CAP_HEIGHTS.length; i++) {
        let id = CAP_HEIGHTS[i].charCodeAt(0);
        let idx = findChar(font.chars, id);
        if (idx >= 0) {return font.chars[idx].height;}
    }
    return 0;
}

function getKerning(font, left, right) {
    if (!font.kernings || font.kernings.length === 0) {return 0;}

    let table = font.kernings;
    for (let i = 0; i < table.length; i++) {
        let kern = table[i];
        if (kern.first === left && kern.second === right) {return kern.amount;}
    }
    return 0;
}

/*
function getAlignType(align) {
  if (align === 'center')
    return ALIGN_CENTER
  else if (align === 'right')
    return ALIGN_RIGHT
  return ALIGN_LEFT
}

*/

function findChar(array, value, start) {
    start = start || 0;
    for (let i = start; i < array.length; i++) {
        if (array[i].id === value) {
            return i;
        }
    }
    return -1;
}
