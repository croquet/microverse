//"use strict";
// LICENSE: MIT
// Copyright (c) 2016 by Mike Linkovich
//
// Creates & animates a large patch of grass to fill the foreground.
// One simple blade of grass mesh is repeated many times using instanced arrays.
// Uses grass shaders (see: shader/grass.*.glsl)

var BLADE_SEGS = 4; // # of blade segments
var BLADE_VERTS = (BLADE_SEGS + 1) * 2; // # of vertices per blade (1 side)
var BLADE_INDICES = BLADE_SEGS * 12;
var BLADE_WIDTH = 0.15;
var BLADE_HEIGHT_MIN = 2.25;
var BLADE_HEIGHT_MAX = 3.0;
/**
 * Creates a patch of grass mesh.
 */

export class Grass {
    constructor(opts) {
        // Buffers to use for instances of blade mesh
        console.log("grass.CreateMesh", opts)
        var buffers = {
            // Tells the shader which vertex of the blade its working on.
            // Rather than supplying positions, they are computed from this vindex.
            vindex: new Float32Array(BLADE_VERTS * 2 * 1),
            // Shape properties of all blades
            shape: new Float32Array(4 * opts.numBlades),
            // Positon & rotation of all blades
            offset: new Float32Array(4 * opts.numBlades),
            // Indices for a blade
            index: new Uint16Array(BLADE_INDICES)
        };
        this.initBladeIndices(buffers.index, 0, BLADE_VERTS, 0);
        this.initBladeOffsetVerts(buffers.offset, opts.numBlades, opts.radius);
        this.initBladeShapeVerts(buffers.shape, opts.numBlades, buffers.offset, opts.simplex);
        this.initBladeIndexVerts(buffers.vindex);
        var geo = new THREE.InstancedBufferGeometry();
        // Because there are no position vertices, we must create our own bounding sphere.
        // (Not used because we disable frustum culling)
        geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Math.sqrt(opts.radius * opts.radius * 2.0) * 10000.0);
        geo.setAttribute('vindex', new THREE.BufferAttribute(buffers.vindex, 1));
        geo.setAttribute('shape', new THREE.InstancedBufferAttribute(buffers.shape, 4));
        geo.setAttribute('offset', new THREE.InstancedBufferAttribute(buffers.offset, 4));
        geo.setIndex(new THREE.BufferAttribute(buffers.index, 1));
        var tex = opts.texture;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        var htex = opts.heightMap;
        htex.wrapS = htex.wrapT = THREE.RepeatWrapping;
        var hscale = opts.heightMapScale;
        var lightDir = opts.lightDir.clone();
        lightDir.z *= 0.5;
        lightDir.normalize();
        // Fill in some constants that never change bet ween draw calls
        var vertScript = opts.vertScript.replace('%%BLADE_HEIGHT_TALL%%', (BLADE_HEIGHT_MAX * 1.5).toFixed(1)).replace('%%BLADE_SEGS%%', BLADE_SEGS.toFixed(1)).replace('%%PATCH_SIZE%%', (opts.radius * 2.0).toFixed(1)).replace('%%TRANSITION_LOW%%', opts.transitionLow.toString()).replace('%%TRANSITION_HIGH%%', opts.transitionHigh.toString());
        // Setup shader
        var mat = new THREE.RawShaderMaterial({
            uniforms: {
                lightDir: { type: '3f', value: lightDir.toArray() },
                time: { type: 'f', value: 0.0 },
                map: { type: 't', value: tex },
                heightMap: { type: 't', value: htex },
                heightMapScale: { type: '3f', value: [hscale.x, hscale.y, hscale.z] },
                camDir: { type: '3f', value: [1.0, 0.0, 0.0] },
                drawPos: { type: '2f', value: [100.0, 0.0] },
                fogColor: { type: '3f', value: opts.fogColor.toArray() },
                fogNear: { type: 'f', value: 1.0 },
                fogFar: { type: 'f', value: opts.fogFar },
                grassColor: { type: '3f', value: opts.grassColor.toArray() },
                grassFogFar: { type: 'f', value: opts.grassFogFar },
                windIntensity: { type: 'f', value: opts.windIntensity }
            },
            vertexShader: vertScript,
            fragmentShader: opts.fragScript,
            transparent: true
        });
        console.log("GRASS", mat)
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.frustumCulled = false; // always draw, never cull
    }

/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */
    initBladeIndices(id, vc1, vc2, i) {
        var seg;
        // blade front side
        for (seg = 0; seg < BLADE_SEGS; ++seg) {
            id[i++] = vc1 + 0; // tri 1
            id[i++] = vc1 + 1;
            id[i++] = vc1 + 2;
            id[i++] = vc1 + 2; // tri 2
            id[i++] = vc1 + 1;
            id[i++] = vc1 + 3;
            vc1 += 2;
        }
        // blade back side
        for (seg = 0; seg < BLADE_SEGS; ++seg) {
            id[i++] = vc2 + 2; // tri 1
            id[i++] = vc2 + 1;
            id[i++] = vc2 + 0;
            id[i++] = vc2 + 3; // tri 2
            id[i++] = vc2 + 1;
            id[i++] = vc2 + 2;
            vc2 += 2;
        }
    }
/** Set up shape variations for each blade of grass */
    initBladeShapeVerts(shape, numBlades, offset, simplex) {
        var noise = 0;
        for (var i = 0; i < numBlades; ++i) {
            noise = Math.abs(simplex.simplex(offset[i * 4 + 0] * 0.03, offset[i * 4 + 1] * 0.03));
            noise = noise * noise * noise;
            noise *= 5.0;
            shape[i * 4 + 0] = BLADE_WIDTH + Math.random() * BLADE_WIDTH * 0.5; // width
            shape[i * 4 + 1] = BLADE_HEIGHT_MIN + Math.pow(Math.random(), 4.0) * (BLADE_HEIGHT_MAX - BLADE_HEIGHT_MIN) + // height
                noise;
            shape[i * 4 + 2] = 0.0 + Math.random() * 0.3; // lean
            shape[i * 4 + 3] = 0.05 + Math.random() * 0.3; // curve
        }
    }


/** Set up positons & rotation for each blade of grass */
    initBladeOffsetVerts(offset, numBlades, patchRadius) {
        /** A random number from -1.0 to 1.0 */
        function nrand() {
            return Math.random() * 2.0 - 1.0;
        }
        for (var i = 0; i < numBlades; ++i) {
            offset[i * 4 + 0] = (0, nrand)() * patchRadius; // x
            offset[i * 4 + 1] = (0, nrand)() * patchRadius; // y
            offset[i * 4 + 2] = 0.0; // z
            offset[i * 4 + 3] = Math.PI * 2.0 * Math.random(); // rot
        }
    }
    /** Set up indices for 1 blade */
    initBladeIndexVerts(vindex) {
        for (var i = 0; i < vindex.length; ++i) {
            vindex[i] = i;
        }
    }
/**
 * Call each frame to animate grass blades.
 * @param mesh The patch of grass mesh returned from createMesh
 * @param time Time in seconds
 * @param x X coordinate of centre position to draw at
 * @param y Y coord
 */
    update(time, camDir, drawPos) {
        var mat = this.mesh.material;
        mat.uniforms['time'].value = time;
        var p = mat.uniforms['camDir'].value;
        p[0] = camDir.x;
        p[1] = camDir.y;
        p[2] = camDir.z;
        p = mat.uniforms['drawPos'].value;
        p[0] = drawPos.x;
        p[1] = drawPos.y;
    }
}
