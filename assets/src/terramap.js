// LICENSE: MIT
// Copyright (c) 2016 by Mike Linkovich

/**
 * Create a texture containing height, lighting, etc. data
 * encoded into RGBA channels.
 */

export function createTexture(hf, lightDir, imgWind) {
//console.log('xxxxxx', hf, hf.xCount)
    var canvas = document.createElement('canvas');
    var canvasWidth = hf.xCount + 1;
    var canvasHeight = hf.yCount + 1;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    var ctx = canvas.getContext('2d');
//console.log(hf, hf.xCount, canvasWidth, canvasHeight)
    var imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    // Fill R (height) and G (light) values from heightfield data and computed light
    computeData(hf, lightDir, imgData.data);
    // Add wind intensity to B channel
    addWindData(imgWind, imgData.data);
    ctx.putImageData(imgData, 0, 0);
    var tex = new THREE.Texture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
}

/**
 * Pack heights and lighting into RGBA data
 */
function computeData(hf, lightDir, buf) {
    var vnorms = hf.vtxNormals;
    var w = hf.xCount + 1;
    var h = hf.yCount + 1;
    var n = new THREE.Vector3();
    var tStart = Date.now();
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            var iSrc = y * w + x;
            var iDst = (h - y - 1) * w + x;
            // Get height, scale & store in R component
            buf[iDst * 4 + 0] = Math.round(hf.heights[iSrc] / hf.maxHeight * 255.0);
            // Get normal at this location to compute light
            var ni = iSrc * 3;
            n.x = vnorms[ni++];
            n.y = vnorms[ni++];
            n.z = vnorms[ni++];
            // Compute light & store in G component
            var light = Math.max(-n.dot(lightDir), 0.0);
            light *= computeShade(hf, lightDir, x, y);
            buf[iDst * 4 + 1] = Math.round(light * 255.0);
            //buf[iDst * 4 + 2] = ... // B channel for terrain type?
            buf[iDst * 4 + 3] = 255; // must set alpha to some value > 0
        }
    }
    var dt = Date.now() - tStart;
//console.log("computed terrain data texture (".concat(w, "x").concat(h, ") values in ").concat(dt, "ms"));
    return buf;
}

var _v = new THREE.Vector2();

function pmod(n, m) {
    return ((n % m + m) % m);
}

function computeShade(hf, lightDir, ix, iy) {
    // Make a normalized 2D direction vector we'll use to walk horizontally
    // toward the lightsource until z reaches max height
    var shadGradRange = 5.0;
    var hdir = _v;
    var w = hf.xCount + 1;
    var h = hf.yCount + 1;
    var i = iy * w + ix;
    var height = hf.heights[i]; // height at this point
    hdir.x = -lightDir.x;
    hdir.y = -lightDir.y;
    hdir.normalize();
    var zstep = (hdir.length() / lightDir.length()) * (-lightDir.z);
    var x = ix;
    var y = iy;
    // Walk along the direction until we discover this point
    // is in shade or the light vector is too high to be shaded
    while (height < hf.maxHeight) {
        x += hdir.x;
        y += hdir.y;
        height += zstep;
        var qx = pmod(Math.round(x), w);
        var qy = pmod(Math.round(y), h);
        var sampleHeight = hf.heights[qy * w + qx];
        if (sampleHeight > height) {
            if (sampleHeight - height > shadGradRange)
                return 0.7; // this point is in shade
            else
                return 0.7 + 0.3 * (shadGradRange - (sampleHeight - height)) / shadGradRange;
        }
    }
    return 1.0;
}
/**
 * Put wind data from the wind image to the b channel
 */
function addWindData(imgWind, buf) {
    var canvas = document.createElement('canvas');
    var w = imgWind.naturalWidth;
    var h = imgWind.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    var ctxSrc = canvas.getContext('2d');
    ctxSrc.drawImage(imgWind, 0, 0);
    var windData = ctxSrc.getImageData(0, 0, w, h).data;
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            var i = (y * w + x) * 4;
            // Get R channel from src. We only use the single channel
            // because assume src img is grayscale.
            var p = windData[i];
            // Now set the B channel of the buffer we're writing to
            buf[i + 2] = p;
        }
    }
}
