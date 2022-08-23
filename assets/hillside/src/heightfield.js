// LICENSE: MIT
// Copyright (c) 2016 by Mike Linkovich

/**
 * Create a Heightfield using the given options.
 * Use either an image OR xCount, yCount and a heights array.
 */


export class Heightfield{
    constructor(info){
        this.cellSize = (info.cellSize && info.cellSize > 0) ? info.cellSize : 1.0,
        this.minHeight = (typeof info.minHeight === 'number') ? info.minHeight : 0.0,
        this.maxHeight = (typeof info.maxHeight === 'number') ? info.maxHeight : 1.0,
        this.xCount = 0,
        this.yCount = 0,
        this.xSize = 0,
        this.ySize = 0,
        this.heights = new Float32Array(0),
        this.faceNormals = new Float32Array(0),
        this.vtxNormals = new Float32Array(0);
        this.hInfo = {
            i: 0, t: 0, z: 0.0, n: new THREE.Vector3()
        };
        if (info.image) {
            this.genFromImg(info.image);
        }
        else {
            this.xCount = info.xCount && info.xCount > 0 ? Math.floor(info.xCount) : 1;
            this.yCount = info.yCount && info.yCount > 0 ? Math.floor(info.yCount) : 1;
            this.xSize = info.xCount * this.cellSize;
            this.ySize = info.yCount * this.cellSize;
            this.heights = info.heights || new Float32Array((this.xCount + 1) *
                (this.yCount + 1));
            // 2 normals per cell (quad)
            this.faceNormals = new Float32Array(3 * 2 * this.xCount * this.yCount);
            this.vtxNormals = new Float32Array(3 * (this.xCount + 1) * (this.yCount + 1));
            this.calcFaceNormals();
        }

    }

    /**  Always positive modulus */
    pmod(n, m) {
        return ((n % m + m) % m);
    }

    infoAt(x, y, wrap) {
        var ox = -(this.xSize / 2.0); // bottom left of heightfield
        var oy = -(this.ySize / 2.0);
        if (x < ox || x >= -ox || y < oy || y >= -oy) {
            if (!wrap) {
                // out of bounds
                this.hInfo.i = -1;
                this.hInfo.z = this.minHeight;
                this.hInfo.n.x = this.hInfo.n.y = this.hInfo.n.z = 0;
                this.hInfo.t = 0;
                return;
            }
            // wrap around
            x = this.pmod(x - ox, this.xSize) + ox;
            y = this.pmod(y - oy, this.ySize) + oy;
        }
        var csz = this.cellSize, normals = this.faceNormals,
            n = this.hInfo.n, ix = Math.floor((x - ox) / csz),
            iy = Math.floor((y - oy) / csz), ih = ix + iy * (this.xCount + 1), // height index
        px = (x - ox) % csz, // relative x,y within this quad
        py = (y - oy) % csz;
        var i = ix + iy * this.xCount; // tile index
        if (py > 0 && px / py < 1.0) {
            // top left tri
            this.hInfo.t = 0;
            n.x = normals[i * 6 + 0];
            n.y = normals[i * 6 + 1];
            n.z = normals[i * 6 + 2];
        }
        else {
            // bottom right tri
            this.hInfo.t = 1;
            n.x = normals[i * 6 + 3];
            n.y = normals[i * 6 + 4];
            n.z = normals[i * 6 + 5];
        }
        this.hInfo.i = i;
        this.hInfo.z = this.getPlaneZ(n, this.heights[ih], px, py);
    }

    heightAt(x, y, wrap) {
        if (wrap === void 0) { wrap = false; }
        this.infoAt(x, y, wrap);
        return this.hInfo.z;
    }

    /**
     *  Given a plane with normal n and z=z0 at (x=0,y=0) find z at x,y.
     *  @param n Normal vector of the plane.
     *  @param z0 Height (z) coordinate of the plane at x=0,y=0.
     *  @param x X coordinate to find height (z) at.
     *  @param y Y coordinate to find height (z) at.
     */
    getPlaneZ(n, z0, x, y) {
        return z0 - (n.x * x + n.y * y) / n.z;
    }

    genFromImg(image) {
        var x, y, i, height;
        var w = image.width, h = image.height, heightRange = this.maxHeight - this.minHeight;
        this.xCount = w - 1;
        this.yCount = h - 1;
        this.xSize = this.xCount * this.cellSize;
        this.ySize = this.yCount * this.cellSize;
        // Draw to a canvas so we can get the data
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, w, h);
        // array of canvas pixel data [r,g,b,a, r,g,b,a, ...]
        var data = ctx.getImageData(0, 0, w, h).data;
        var heights = new Float32Array(w * h);
        for (y = 0; y < h; ++y) {
            for (x = 0; x < w; ++x) {
                // flip vertical because textures are Y+
                i = (x + (h - y - 1) * w) * 4;
                //i = (x + y * w) * 4
                // normalized altitude value (0-1)
                // assume image is grayscale, so we only need 1 color component
                height = data[i] / 255.0;
                //height = (data[i+0] + data[i+1] + data[i+2]) / (255+255+255)
                //  scale & store this altitude
                heights[x + y * w] = this.minHeight + height * heightRange;
            }
        }
        // Free these resources soon as possible
        data = ctx = canvas = null;
        this.heights = heights;
        // 2 normals per cell (quad)
        this.faceNormals = new Float32Array(3 * 2 * this.xCount * this.yCount);
        this.vtxNormals = new Float32Array(3 * (this.xCount + 1) * (this.yCount + 1));
        this.calcFaceNormals();
        this.calcVertexNormals();
    }
    /**
     *  Calculate normals.
     *  2 face normals per quad (1 per tri)
     */
    calcFaceNormals() {
        var csz = this.cellSize, xc = this.xCount, // tile X & Y counts
        yc = this.yCount, hxc = this.xCount + 1, // height X count (1 larger than tile count)
        heights = this.heights, // 1 less indirection
        normals = this.faceNormals, v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), n = new THREE.Vector3(); // used to compute normals
        var i = 0;
        var tStart = Date.now();
        for (var iy = 0; iy < yc; ++iy) {
            for (var ix = 0; ix < xc; ++ix) {
                i = 6 * (ix + iy * xc);
                var ih = ix + iy * hxc;
                var z = heights[ih];
                // 2 vectors of top-left tri
                v0.x = csz;
                v0.y = csz;
                v0.z = heights[ih + hxc + 1] - z;
                v1.x = 0.0;
                v1.y = csz;
                v1.z = heights[ih + hxc] - z;
                v0.cross(v1);
                v0.normalize();
                normals[i + 0] = v0.x;
                normals[i + 1] = v0.y;
                normals[i + 2] = v0.z;
                // 2 vectors of bottom-right tri
                v0.x = csz;
                v0.y = 0.0;
                v0.z = heights[ih + 1] - z;
                v1.x = csz;
                v1.y = csz;
                v1.z = heights[ih + hxc + 1] - z;
                v0.cross(v1);
                v0.normalize();
                normals[i + 3] = v0.x;
                normals[i + 4] = v0.y;
                normals[i + 5] = v0.z;
            }
        }
        var dt = Date.now() - tStart;
        console.log("computed ".concat(i, " heightfield face normals in ").concat(dt, "ms"));
    }
    calcVertexNormals() {
        var vnorms = this.vtxNormals;
        var w = this.xCount + 1;
        var h = this.yCount + 1;
        var n = new THREE.Vector3();
        var i = 0;
        var tStart = Date.now();
        for (var y = 0; y < h; ++y) {
            for (var x = 0; x < w; ++x) {
                this.computeVertexNormal(x, y, n);
                i = (y * w + x) * 3;
                vnorms[i++] = n.x;
                vnorms[i++] = n.y;
                vnorms[i++] = n.z;
            }
        }
        var dt = Date.now() - tStart;
        console.log("computed ".concat(w * h, " vertex normals in ").concat(dt, "ms"));
    }
    /**
     * Compute a vertex normal by averaging the adjacent face normals.
     */
    computeVertexNormal(vx, vy, n) {
        var fnorms = this.faceNormals;
        // This vertex is belongs to 4 quads
        // Do the faces this vertex is the 1st point of for this quad.
        // This is the quad up and to the right
        var qx = vx % this.xCount;
        var qy = vy % this.yCount;
        var ni = (qy * this.xCount + qx) * 3 * 2;
        n.x = fnorms[ni + 0];
        n.y = fnorms[ni + 1];
        n.z = fnorms[ni + 2];
        ni += 3;
        n.x += fnorms[ni + 0];
        n.y += fnorms[ni + 1];
        n.z += fnorms[ni + 2];
        // 2nd tri of quad up and to the left
        qx = this.pmod(qx - 1, this.xCount);
        ni = (qy * this.xCount + qx) * 3 * 2 + 3;
        n.x += fnorms[ni + 0];
        n.y += fnorms[ni + 1];
        n.z += fnorms[ni + 2];
        // both tris of quad down and to the left
        qy = this.pmod(qy - 1, this.yCount);
        ni = (qy * this.xCount + qx) * 3 * 2;
        n.x += fnorms[ni + 0];
        n.y += fnorms[ni + 1];
        n.z += fnorms[ni + 2];
        ni += 3;
        n.x += fnorms[ni + 0];
        n.y += fnorms[ni + 1];
        n.z += fnorms[ni + 2];
        // 1st tri of quad down and to the right
        qx = (qx + 1) % this.xCount;
        ni = (qy * this.xCount + qx) * 3 * 2;
        n.x += fnorms[ni + 0];
        n.y += fnorms[ni + 1];
        n.z += fnorms[ni + 2];
        // Normalize to 'average' the result normal
        n.normalize();
    }
}