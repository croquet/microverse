import { THREE } from "@croquet/worldcore";
import { SVGLoader } from './three/examples/jsm/loaders/SVGLoader.js';
let counter = 0;

export function loadSVG( target, url, texture, color, fullBright, shadow, onComplete ) {
	const loader = new SVGLoader();
	let group = new THREE.Group();
	let depth = 0;
	let m = fullBright?THREE.MeshBasicMaterial:THREE.MeshStandardMaterial;
	loader.load( url, function ( data ) {
		const paths = data.paths;
		for ( let i = 0; i < paths.length; i ++ ) {
			const path = paths[ i ];
			const fillColor = path.userData.style.fill;
			if ( fillColor !== undefined && fillColor !== 'none' ) {

				const material = new m( {
					color: new THREE.Color().setStyle( fillColor ),
					opacity: path.userData.style.fillOpacity,
					side: THREE.DoubleSide,
				} );
				const shapes = SVGLoader.createShapes( path );
				for ( let j = 0; j < shapes.length; j ++ ) {
					const shape = shapes[ j ];
					const geometry = new THREE.ShapeGeometry( shape );
					const mesh = new THREE.Mesh( geometry, material );
					mesh.position.z+=depth;
					depth+=0.002;
					group.add( mesh );
				}
			}
			const strokeColor = path.userData.style.stroke;
			if ( strokeColor !== undefined && strokeColor !== 'none' ) {
				const material = new m( {
					color: new THREE.Color().setStyle( strokeColor ),
					opacity: path.userData.style.strokeOpacity,
					//transparent: true,
					side: THREE.DoubleSide,
					//depthWrite: false,
				} );

				for ( let j = 0, jl = path.subPaths.length; j < jl; j ++ ) {
					const subPath = path.subPaths[ j ];
					const geometry = SVGLoader.pointsToStroke( subPath.getPoints(), path.userData.style );
					if ( geometry ) {
						const mesh = new THREE.Mesh( geometry, material );
						group.add( mesh );
					}
				}
			}
		}
		normalize(target, group, color, shadow);
		let holderGroup = new THREE.Group();
		holderGroup.add(group);
		target.card3D.add(holderGroup);
		//if(rotation)holderGroup.setRotationFromQuaternion(new THREE.Quaternion(...rotation));
		if(texture)addTexture(texture, group);
		if(onComplete)onComplete(group);
	} );
}


// SVGs are imported upside down and are often off center

export function normalize(target, svgGroup, color, shadow){
	let bb = boundingBox(svgGroup);
	let ext = extent3D(svgGroup, bb);
	let cen = center3D(svgGroup, bb);
	svgGroup.scale.y *= -1;
	cen.y *=-1;
	let mx = Math.max(ext.x, ext.y);
	// scale SVG object to 1 along largest axis
	if(mx>0){ 
		// need svgGroup.aspect for positioning in jump to card
		if(ext.y)target.aspect = ext.x/ext.y;
		svgGroup.position.set(-cen.x, -cen.y, -cen.z);
		let sc = 1/mx;
		svgGroup.position.multiplyScalar(sc);
		svgGroup.scale.multiplyScalar(sc);
	}
	let c;
	if(color)c = new THREE.Color(...color);
	svgGroup.traverse(obj=>{
		if(obj.material){
			normalizeUV(obj.geometry.attributes.uv.array, bb);
			if(c)obj.material.color=c; 
			if(shadow){ 
				obj.castShadow = true;
				obj.receiveShadow = true;
			}
	}});
}

export function normalizeUV(uvArray, bb){
	let s = [bb.max.x-bb.min.x, bb.max.y-bb.min.y];
	s[0]=s[0]>0?1/s[0]:1;
	s[1]=s[1]>0?1/s[1]:1;
	let o = [bb.min.x, bb.min.y];
	let index = 0;
	for(let i=0; i<uvArray.length;i++){
		uvArray[i]=(uvArray[i]-o[index])*s[index];
		if(index)uvArray[i]=1-uvArray[i];
		index = index===0?1:0;
	}
}

export function boundingBox(obj, bigBox, depth) { 
	// this needs to recursively merge the bounding box of all of the objects it contains.
	// computes the boundingBox in LOCAL coordinates.  if there's a parent, temporarily
	// remove from the parent and reset position and orientation.
	// the boundingBox reflects the extent after application of the current scale setting.

	if(!bigBox){ bigBox = new THREE.Box3(); depth = 0}
	if(obj.geometry){ //means it is a visible thing
		if(!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();
		const box = obj.geometry.boundingBox.clone();
		box.applyMatrix4(obj.matrixWorld);
		bigBox.union(box);
	}
	if(obj.children){obj.children.forEach(child=>boundingBox(child, bigBox, depth+1))}
	return bigBox;
}

export function extent3D(obj, bb) {
	let rVec = new THREE.Vector3();
	if(!bb)bb = boundingBox(obj);
//console.log("extent3D", bb)
	if(bb){
		rVec.copy(bb.max);
		rVec.sub(bb.min);
	}
	return rVec;
}

export function center3D(obj, bb) {
	let rVec = new THREE.Vector3();
	if(!bb)bb = boundingBox(obj);
//console.log("center3D", bb)
	if (bb) {
	  rVec.copy(bb.max);
	  rVec.add(bb.min);
	  rVec.multiplyScalar(0.5);
	 }
	return rVec;
}

export function addTexture(texture, group){
	//const texture = new THREE.TextureLoader().load(url);
	group.traverse((child)=>{if(child.material)child.material.map = texture;});
}

export function loadTexture(url, who){
	let texture =  new THREE.TextureLoader().load(url);
	console.log(who, url, texture);
	return texture;
}