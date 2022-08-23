//
// Water mesh
// A flat plane extending to frustum depth that follows
// viewer position horizontally.
// Shader does environmental mapping to reflect skydome,
// blend with water colour, and apply fog in distance.
//

// Uses water shaders (see: shader/water.*.glsl)
// LICENSE: MIT
// Copyright (c) 2016 by Mike Linkovich

var _time = 0;
/** Create Water Mesh */
export class Water{
    constructor(opts) {
        opts.envMap.wrapS = opts.envMap.wrapT = THREE.RepeatWrapping;
        opts.envMap.minFilter = opts.envMap.magFilter = THREE.LinearFilter;
        opts.envMap.generateMipmaps = false;
        var mat = new THREE.RawShaderMaterial({
            uniforms: {
                time: { type: '1f', value: 0.0 },
                viewPos: { type: '3f', value: [0.0, 0.0, 10.0] },
                map: { type: 't', value: opts.envMap },
                waterLevel: { type: '1f', value: opts.waterLevel },
                waterColor: { type: '3f', value: opts.waterColor.toArray() },
                fogColor: { type: '3f', value: opts.fogColor.toArray() },
                fogNear: { type: 'f', value: 1.0 },
                fogFar: { type: 'f', value: opts.fogFar * 1.5 }
            },
            vertexShader: opts.vertScript,
            fragmentShader: opts.fragScript
        });
        this.mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000.0, 2000.0), mat);
        this.mesh.frustumCulled = false;
        _time = Date.now();
    }

    update(viewPos) {
        this.mesh.position.x = viewPos.x;
        this.mesh.position.y = viewPos.y;
        var mat = this.mesh.material;
        var vp = mat.uniforms['viewPos'].value;
        vp[0] = viewPos.x;
        vp[1] = viewPos.y;
        vp[2] = viewPos.z;
        mat.uniforms['time'].value = (Date.now() - _time) / 250.0;
    }
}
