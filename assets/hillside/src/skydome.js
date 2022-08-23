
export class SkyDome{
    constructor(tex, radius, lats, lngs) {
        if (lats === void 0) { lats = 16; }
        if (lngs === void 0) { lngs = 32; }
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, lngs, lats, 0, Math.PI * 2.0, 0, Math.PI / 2.0).rotateX(Math.PI / 2.0).rotateZ(Math.PI), new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, side: THREE.BackSide, map: tex, fog: false
        }));
    }

    update(ppos){
        this.mesh.position.x = ppos.x;
        this.mesh.position.y = ppos.y;
    }
}