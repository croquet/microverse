export class MSDFFontPreprocessor {
    renderOne(inBitmap, outBitmap, texWidth, texHeight, x, y, width, height) {
        function clamp(a, min, max) {
            return Math.min(Math.max(a, min), max);
        }

        function median(r, g, b) {
            return Math.max(Math.min(r, g), Math.min(Math.max(r, g), b));
        }

        let leftSigDist;
        let prevRow = {};
        for (let j = y; j < y + height; j++) {
            for (let i = x; i < x + width; i++) {
                let ind = (j * texHeight + i) * 4;

                let origR = inBitmap[ind + 0];
                let origG = inBitmap[ind + 1];
                let origB = inBitmap[ind + 2];
                //let origA = inBitmap[ind + 3];

                let r = origR / 255;
                let g = origG / 255;
                let b = origB / 255;

                let sigDist = median(r, g, b) - 0.5;
                let dFdx;
                let dFdy;

                if (i === x) {
                    dFdx = -1;
                } else {
                    dFdx = sigDist - leftSigDist;
                }
                leftSigDist = sigDist;

                if (j === y) {
                    dFdy = -1;
                } else {
                    dFdy = sigDist - prevRow[j];
                }
                prevRow[i] = sigDist;

                let fwidth = Math.abs(dFdx) + Math.abs(dFdy);

                let alpha = clamp(sigDist / fwidth + 0.5, 0.0, 1.0);

                outBitmap[ind + 0] = origR;
                outBitmap[ind + 1] = origG;
                outBitmap[ind + 2] = origB;
                outBitmap[ind + 3] = Math.floor(alpha * 255.0);
            }
        }
    }

    process(font, inBitmap) {
        let outImage = new ImageData(font.common.scaleW, font.common.scaleH);
        let outBitmap = outImage.data;
        this.renderOne(inBitmap, outBitmap,  font.common.scaleW, font.common.scaleH, 0, 0, font.common.scaleW, font.common.scaleH);
        return outImage;
    }
}

