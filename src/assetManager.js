// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
/* globals JSZip */

const MAX_IMPORT_MB = 100; // aggregate

let THREE;

let cachedLoaders = {};

function isZip(buffer) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b &&
        buffer[2] === 0x03 && buffer[3] === 0x04;
}

class ImportChecker {
    constructor() {
        this.totalSize = 0;
    }

    addItem(spec) {
        if (!this.withinLimits) return false;

        this.totalSize += spec.buffer.byteLength;
        return this.withinLimits;
    }

    get withinLimits() {
        return this.totalSize <= 1048576 * MAX_IMPORT_MB;
    }

    get totalBytes() {
        return this.totalSize;
    }
}

export class AssetManager {
    constructor() {
        this.assetCache = {}; // {[dataId]: {data /*(of any kind)*/, ids: [viewObjectId|"0"]}}
        this.supportedFileTypes = new Set(["zip", "glb", "obj", "fbx", "wrl", "svg", "png", "jpeg", "jpg", "gif", "exr", "pdf", "vrse", "mov", "mp4"]);
    }

    fetchFile(item) {
        const file = item.getAsFile(); // getAsFile() is a method of DataTransferItem
        const type = this.getFileType(file.name);

        if (file && type) {
            return this.fetchSpecForDroppedFile(file, type).then((spec) => {
                if (!this.supportedFileTypes.has(type)) {
                    throw new Error("unsupported file type");
                }

                return {type, buffer: spec.buffer};
            });
        }
        throw new Error("could not read a file");
    }

    async handlePasteText(items) {
        for (const item of items) {
            if (item.kind === "string" && item.type === "text/plain") {
                return new Promise(resolve => item.getAsString(resolve));
            }
        }
    }

    async handleFiles(items) {
        const importSizeChecker = new ImportChecker();

        if (items.length > 1) {
            console.warn("multiple files or dirs dropped");
        }

        const item = items[0];

        const entry = item.getAsEntry ? item.getAsEntry()
            : (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null);
        if (entry && entry.isDirectory) {
            try {
                return this.analyzeDirectory(entry, importSizeChecker);
                // returns {zip, type}
            } catch(_err) {
                throw Error("directory could not be zipped");
            }
        }

        let obj = await this.fetchFile(item);
        if (entry) obj.fileName = entry.fullPath;
        return obj;
    }

    async analyzeDirectory(dirEntry, importSizeChecker) {
        // recursively examine the directory contents, adding files to zip and figure out type
        const todo = [{path: dirEntry.fullPath, entry: dirEntry, depth: 0}];

        let zip = new JSZip();

        let maybeType;

        const processEntries = () => {
            const { path, entry, depth } = todo.pop();
            if (entry.isDirectory) {
                return new Promise((resolve, _reject) => {
                    entry.createReader().readEntries(entries => {
                        for (const entryInDir of entries) {
                            todo.push({ path: entryInDir.fullPath, entry: entryInDir, depth: depth + 1 });
                        }
                        resolve(true);
                    });
                })
            } else {
                // file() is a method of FileSystemFileEntry
                return new Promise((resolve, reject) => {
                    entry.file(async file => {
                        const fileType = this.getFileType(file.name);
                        const spec = await this.fetchSpecForDroppedFile(file, fileType);
                        if (spec.type === "obj") {
                            maybeType = "obj";
                        }
                        spec.path = path;
                        spec.depth = depth;
                        importSizeChecker.addItem(spec);
                        if (importSizeChecker.withinLimits) {
                            zip.file(path, spec.buffer);
                        } else {
                            throw new Error("directory too large");
                        }
                        resolve(true);
                    }, (err) => {
                        reject(err);
                    });
                });
            }
        };

        return new Promise(async (resolve, _reject) => {
            while (todo.length > 0) {
                await processEntries();
            }
            resolve(true);
        }).then(() => ({zip, type: maybeType}));
    }

    getFileType(fileName) {
        let index = fileName.lastIndexOf(".");
        if (index >= 0) {
            return fileName.slice(index + 1).toLowerCase();
        }
        return null;
    }


    async fetchSpecForDroppedFile(file, fileType) {
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        }).then((buffer) => {
            return { name: file.name, type: fileType, blob: file, buffer };
        }).catch((e) => {
            console.error(e);
            throw new Error("reading a file failed");
        });
    }

    async drop(data) {
        let hasFiles = [...data.types].includes("Files");
        if (hasFiles) {
            let {zip, buffer, type, fileName} = await this.handleFiles(data.items);
            if (zip) return zip.generateAsync({type: "uint8array"});
            return { fileName, type, buffer };
        } else {
            let buffer = await this.handlePasteText(data.items);
            if (buffer) return { type: "pastedtext", buffer };
        }
        return null;
    }

    setupHandlersOn(dom, callback) {
        const handleData = async (data) => {
            let obj = await this.drop(data);
            if (!obj) {
                console.log("not a file");
                return;
            }
            let {buffer, fileName, type} = obj;
            if (callback) {
                callback(buffer, fileName, type);
            };
        };
        dom.ondragover = (evt) => evt.preventDefault();
        dom.ondrop = (evt) => {
            evt.preventDefault();
            handleData(evt.dataTransfer);
        }
        dom.onpaste = (evt) => {
            evt.preventDefault();
            handleData(evt.clipboardData || window.clipboardData);
        };
    }

    setCache(dataId, data, id) {
        if (!this.assetCache[dataId]) {
            this.assetCache[dataId] = {data, ids: new Set([id])};
        } else {
            this.assetCache[dataId].ids.delete("0");
            this.assetCache[dataId].ids.add(id);
        }
    }

    getCache(dataId) {
        let obj = this.assetCache[dataId];
        if (obj) {return obj.data;}
        return null;
    }

    fillCacheIfAbsent(dataId, func, id) {
        let obj = this.assetCache[dataId];
        if (obj) {
            this.assetCache[dataId].ids.add(id);
            return obj.data;
        }
        obj = func();
        this.setCache(dataId, obj, id);
        return obj;
    }

    revoke(dataId, id) {
        let obj = this.assetCache[dataId];
        if (!obj) {return;}
        obj.ids.delete(id);
        if (obj.ids.size === 0) {
            delete this.assetCache[dataId];
        }
    }

    async load(buffer, type, THREE, options) {
        // here is a bit of checks to do. The file dropped might have been a directory,
        // and then we zipped it. But the file dropped might have been a zip file,
        // The dropped file might have been named like
        // abc.glb.zip, but it might have been abc.zip
        let types = {
            "glb": "importGLB",
            "obj": "importOBJ",
            "fbx": "importFBX",
            "wrl": "importVRML",
            "svg": "importSVG",
            "png": "importIMG",
            "jpg": "importIMG",
            "jpeg": "importIMG",
            "gif": "importIMG",
            "exr": "importEXR"
        };

        if (isZip(buffer)) {
            let zipFile = new JSZip();
            let zip = await zipFile.loadAsync(buffer);
            let files = Object.keys(zip.files);

            for (let file in types) {
                if (files.find((name) => name.endsWith(`.${file}`))) {
                    let loader = new Loader(this);
                    return loader[types[file]](buffer, options, THREE);
                }
            }

            throw new Error("unknown file type");
        }

        for (let file in types) {
            if (type === file) {
                let loader = new Loader(this);
                return loader[types[file]](buffer, options, THREE);
            }
        }
        throw new Error("unknown file type");
    }
}

export class Loader {
    constructor(assetManager) {
        this.assetManager = assetManager;
    }

    localName(str) {
        // str can be  [blob:]https://.../... or /.../... such.
        // It just take the last part after the last /
        let index = str.lastIndexOf("/");
        if (index >= 0) {
            return str.slice(index + 1);
        }
        return str;
    }

    imgType(name) {
        // returns a MIME-subtype string or null
        if (name.endsWith(".png")) {
            return "png";
        }
        if (name.endsWith(".jpeg") || name.endsWith(".jpg")) {
            return "jpeg";
        }
        return null;
    };

    async setupFilesInZip(buffer, required) {
        // required: {[name]: dataType}
        // returns {[type]: blob, ...imgContents}
        let zipFile = new JSZip();
        let zip = await zipFile.loadAsync(buffer);
        let imgContents = {}; // {[name after slash]: dataURL}

        let files = Object.keys(zip.files);

        let promises = Object.keys(required).map((req) => {
            let dataType = required[req];
            let file = files.find((name) => name.endsWith(`.${req}`));
            return zip.file(file).async(dataType).then((content) => {
                return {type: req, blob: URL.createObjectURL(new Blob([content]))};
            });
        });

        let result = {};
        await Promise.all(promises).then((pairs) => {
            pairs.forEach((pair) => {
                result[pair.type] = pair.blob;
            });
        });

        let imgFiles = files.map((n) => ({name: n, type: this.imgType(n)})).filter((o) => o.type);

        let imgPromises = imgFiles.map((obj) => {
            let {name, type} = obj;
            let localName = this.localName(name);
            return zip.file(name).async("uint8array").then((content) => {
                let blob = new Blob([content], {type: `image/${type}`});
                let reader = new FileReader();
                return new Promise((resolve, _reject) => {
                    reader.addEventListener("load", () => {
                        imgContents[localName] = reader.result;
                        resolve(reader.result);
                    });
                    return reader.readAsDataURL(blob);
                });
            });
        });

        await Promise.all(imgPromises);

        return {...result, imgContents};
    };

    setURLModifierFor(manager, imgContents) {
        if (!imgContents) {return;}
        manager.setURLModifier(urlStr => {
            // console.log(`handling request for ${urlStr}`);

            if (this.imgType(urlStr)) {
                // console.log(`returning imgUrl`);
                let localName = this.localName(urlStr);
                return imgContents[localName] || ""; // it may not have the file
            }
            // console.log(`returning ${urlStr}`);
            return urlStr;
        });
    }

    async importOBJ(buffer, options, THREE) {
        let mtl;

        const setupFiles = async () => {
            if (!isZip(buffer)) {
                let c = {"obj": URL.createObjectURL(new Blob([buffer]))};
                return Promise.resolve(c);
            }

            return this.setupFilesInZip(buffer, {"obj": "string", "mtl": "string"});
        };

        let contents = await setupFiles();
        const manager = new THREE.LoadingManager();
        this.setURLModifierFor(manager, contents.imgContents);

        if (contents.mtl) {
            const mtlLoader = new THREE.MTLLoader(manager);
            mtl = await new Promise((resolve, reject) => {
                mtlLoader.load(contents.mtl, resolve, null, reject);
            });//.catch((err) => console.log("laoding material failed"));
        }

        const objLoader = new THREE.OBJLoader(manager);
        let obj = await new Promise((resolve, reject) => {
            if (mtl) {
                objLoader.setMaterials(mtl);
            }
            objLoader.load(contents.obj, resolve, null, reject);
        });//.catch((err) => console.log("laoding material failed"));

        Object.keys(contents).forEach((k) => {
            if (contents[k] && k !== "imgContents") {
                URL.revokeObjectURL(contents[k]);
            }
        });
        return obj;
    }

    async importFBX(buffer, options, THREE) {
        const setupFiles = async () => {
            if (!isZip(buffer)) {
                let c = {"fbx": URL.createObjectURL(new Blob([buffer]))};
                return Promise.resolve(c);
            }

            return this.setupFilesInZip(buffer, {"fbx": "ArrayBuffer"});
        };

        let contents = await setupFiles();

        const manager = new THREE.LoadingManager();
        this.setURLModifierFor(manager, contents.imgContents);

        const fbxLoader = new THREE.FBXLoader(manager);
        let obj = await new Promise((resolve, reject) => {
            return fbxLoader.load(contents.fbx, resolve, null, reject);
        }).then((object) => {
            if (object.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(object);
                object._croquetAnimation = {
                    lastTime: 0,
                    mixer,
                    animations: object.animations
                };
            }
            return object;
        });

        Object.keys(contents).forEach((k) => {
            if (contents[k] && k !== "imgContents") {
                URL.revokeObjectURL(contents[k]);
            }
        });
        return obj;
    }

    async importVRML(buffer, options, THREE) {
        const setupFiles = async () => {
            if (!isZip(buffer)) {
                let c = {"wrl": URL.createObjectURL(new Blob([buffer]))};
                return Promise.resolve(c);
            }

            return this.setupFilesInZip(buffer, {"wrl": "ArrayBuffer"});
        };

        let contents = await setupFiles();

        const manager = new THREE.LoadingManager();
        this.setURLModifierFor(manager, contents.imgContents);

        const vrmlLoader = new THREE.VRMLLoader(manager);
        let obj = await new Promise((resolve, reject) => {
            return vrmlLoader.load(contents.wrl, resolve, null, reject);
        }).then((object) => {
            if (object.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(object);
                object._croquetAnimation = {
                    lastTime: 0,
                    mixer,
                    animations: object.animations
                };
            }
            return object;
        });

        Object.keys(contents).forEach((k) => {
            if (contents[k] && k !== "imgContents") {
                URL.revokeObjectURL(contents[k]);
            }
        });
        return obj;
    }

    async importGLB(buffer, options, THREE) {
        const getBuffer = async () => {
            if (isZip(buffer)) {
                let zipFile = new JSZip();
                let zip = await zipFile.loadAsync(buffer);
                let files = Object.keys(zip.files);
                let glbFile = files.find((name) => name.endsWith(".glb"));
                return zip.files[glbFile].async("ArrayBuffer");
            } else {
                return Promise.resolve(buffer.buffer);
            }
        };

        return getBuffer().then((data) => {
            if (!cachedLoaders.dracoLoader) {
                let loader = new THREE.GLTFLoader();
                let draco = new THREE.DRACOLoader();
                draco.setDecoderConfig({type: 'wasm'});
                // now strongly recommended to use versioned gstatic URLs
                // (see https://github.com/google/draco)
                // draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
                draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
                loader.setDRACOLoader(draco);

                let loc = window.location;
                let pathname = loc.pathname;
                let slash = pathname.lastIndexOf("/");
                if (slash >= 0) {
                    pathname = pathname.slice(0, slash);
                }

                let renderer = this.assetManager.renderer;
                let ktx2Loader = new THREE.KTX2Loader()
                    .setTranscoderPath(`${loc.origin}${pathname}/lib/basis/`)
                    .detectSupport(renderer);

                loader.setKTX2Loader(ktx2Loader);
                loader.setMeshoptDecoder(THREE.MeshoptDecoder);
                cachedLoaders.dracoLoader = loader;
            }
            return new Promise(async (resolve, reject) => {
                try {
                    // note that if the data is corrupted, the loader will probably throw
                    // an error instead of gracefully invoking the error handler
                    await cachedLoaders.dracoLoader.parse(data, null, resolve, reject);
                } catch(e) {
                    reject(e);
                }
            }).then((loaded) => {
                let {scene, animations} = loaded;
                if (options && options.envMapIntensity !== undefined) {
                    scene.traverse((m) => {
                        if (m.material &&
                            m.material.envMapIntensity !== undefined &&
                            m.material.envMapIntensity === 1) {
                            m.material.envMapIntensity = options.envMapIntensity;
                            // m.material[p].setHex(0);
                            // m.material[p].convertLinearToSRGB();
                            // m.material[p].convertSRGBToLinear();
                        }
                    });
                }
                if (animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(scene);
                    scene._croquetAnimation = {
                        lastTime: 0,
                        mixer,
                        animations
                    };
                }
                return scene;
            })
        });
    }

    async importSVG(buffer, options, THREE) {
        const setupFiles = async () => {
            let c = {"svg": URL.createObjectURL(new Blob([buffer]))};
            return Promise.resolve(c);
        };

        let contents = await setupFiles();

        let svg = await new Promise((resolve, _reject) => {
            const {fullBright, color, frameColor, depth, _shadow, _singleSided} = options;
            const M = fullBright ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
            const loader = new THREE.SVGLoader();
            let offset = 0;
            loader.load(contents.svg, (data) => {
                const paths = data.paths;
                const group = new THREE.Group();
                for ( let i = 0; i < paths.length; i ++) {
                    const path = paths[ i ];
                    const fillColor = path.userData.style.fill;
                    if ( fillColor !== undefined && fillColor !== 'none' ) {
                        let material = new M( {
                            color: new THREE.Color().setStyle( fillColor ),
                            opacity: path.userData.style.fillOpacity,
                            side: (depth ? THREE.FrontSide : THREE.DoubleSide),
                        } );
                        if(color)material.color = new THREE.Color(color);
                        if(depth)material = [material, new THREE.MeshStandardMaterial({color:frameColor, metalness:1.0})];
                        const shapes = THREE.SVGLoader.createShapes( path );
                        for ( let j = 0; j < shapes.length; j ++ ) {
                            const shape = shapes[ j ];
                            let geometry;
                            if (depth) {
                                geometry = new THREE.ExtrudeGeometry( shape, {depth: 1 + offset, bevelEnabled:false});
                            } else {
                                geometry = new THREE.ShapeGeometry( shape );
                            }
                            const mesh = new THREE.Mesh( geometry, material );
                            mesh.position.z += depth;
                            offset += 0.002;
                            group.add( mesh );
                        }
                    }
                    const strokeColor = path.userData.style.stroke;
                    if ( strokeColor !== undefined && strokeColor !== 'none' ) {
                        const material = new M( {
                            color: new THREE.Color().setStyle( strokeColor ),
                            opacity: path.userData.style.strokeOpacity,
                            //transparent: true,
                            side: THREE.DoubleSide,
                            //depthWrite: false,
                        } );

                        for ( let j = 0, jl = path.subPaths.length; j < jl; j ++ ) {
                            const subPath = path.subPaths[ j ];
                            const geometry = THREE.SVGLoader.pointsToStroke( subPath.getPoints(), path.userData.style );
                            if ( geometry ) {
                                const mesh = new THREE.Mesh( geometry, material );
                                group.add( mesh );
                            }
                        }
                    }
                }
                resolve(group);
            });
        });

        Object.keys(contents).forEach((k) => {
            if (contents[k] && k !== "imgContents") {
                URL.revokeObjectURL(contents[k]);
            }
        });
        return svg;
    }

    async importIMG(buffer, options, THREE) {
        let objectURL = URL.createObjectURL(new Blob([buffer]));
        let loader = new THREE.TextureLoader();
        let texture = new Promise((resolve, reject) => {
            loader.load(objectURL, (texture) => {
                texture.width = texture.image.width;
                texture.height = texture.image.height;
                resolve(texture);
            }, null, reject);
        });

        return texture.then(() => {
            URL.revokeObjectURL(objectURL);
            return texture;
        })
    }

    async importEXR(buffer, options, THREE) {
        const setupFiles = async () => {
            if (!isZip(buffer)) {
                let c = {"exr": URL.createObjectURL(new Blob([buffer]))};
                return Promise.resolve(c);
            }

            return this.setupFilesInZip(buffer, {"exr": "ArrayBuffer"});
        };

        let contents = await setupFiles();

        return new Promise((resolve, reject) => {
            return new THREE.EXRLoader().load(contents.exr, resolve, null, reject);
        }).then((obj) => {
            Object.keys(contents).forEach((k) => {
                if (contents[k] && k !== "imgContents") {
                    URL.revokeObjectURL(contents[k]);
                }
            });
            return obj;
        });
    }
}

export function addMeshProperties(obj3d, shadow, singleSide, noFog, fullBright, THREE) {
    obj3d.traverse(n => {
        if(n.material) {
            if(noFog)n.material.fog = false;
            if(fullBright){
                let transfer = n.material;
                console.log("material", transfer)
                n.material = new THREE.MeshBasicMaterial();
                n.material.copy( transfer );
            }
            if (singleSide) {
                n.material.side = THREE.FrontSide; //only render front side
            }
            n.material.format = THREE.RGBAFormat; // fixes a bug in GLTF import
            if(shadow){
                n.castShadow = true;
                n.receiveShadow = true;
            }
        }
    });
}

export function normalizeSVG(svgGroup, depth, shadow, three) {
    THREE = three;
    let bb = boundingBox(svgGroup);
    let ext = extent3D(svgGroup, bb);
    let cen = center3D(svgGroup, bb);
    svgGroup.scale.y *= -1;
    cen.y *= -1;
    let mx = Math.max(ext.x, ext.y);
    // scale SVG object to 1 along largest axis
    if (mx > 0) {
        // need svgGroup.aspect for positioning in jump to card
        if (ext.y) svgGroup.aspect = ext.x / ext.y;
        svgGroup.position.set(-cen.x, -cen.y, -cen.z);
        let sc = 1 / mx;
        svgGroup.position.multiplyScalar(sc);
        let sg = svgGroup.scale;
        if (depth) {
            svgGroup.scale.set(sg.x * sc, sg.y * sc, depth);
        } else {
            svgGroup.scale.multiplyScale(sc);
        }
    }

    svgGroup.traverse(obj => {
        if (obj.material) {
            normalizeUV(obj.geometry.attributes.uv.array, obj.geometry.attributes.normal.array, bb);
            if (shadow) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        }
    });
}

function normalizeUV(uvArray, uvNormal, bb) {
    let s = [bb.max.x - bb.min.x, bb.max.y - bb.min.y];
    s[0] = s[0] > 0 ? 1 / s[0] : 1;
    s[1] = s[1] > 0 ? 1 / s[1] : 1;
    let o = [bb.min.x, bb.min.y];
    let index = 0;
    let count = 0;
    for(let i = 0; i < uvArray.length;i++) {
        count += index;
        if(!uvNormal[count * 3] + 2) { // if z is 0, then do nothing
            uvArray[i] = (uvArray[i] - o[index]) * s[index];
            if (index) uvArray[i] = 1 - uvArray[i];
        }
        index = index === 0 ? 1 : 0;
    }
}

function boundingBox(obj, bigBox, depth) {
    // this needs to recursively merge the bounding box of all of the objects it contains.
    // computes the boundingBox in LOCAL coordinates.  if there's a parent, temporarily
    // remove from the parent and reset position and orientation.
    // the boundingBox reflects the extent after application of the current scale setting.

    if (!bigBox) {
        bigBox = new THREE.Box3();
        depth = 0;
    }
    if (obj.geometry) { //means it is a visible thing
        if (!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();
        const box = obj.geometry.boundingBox.clone();
        box.applyMatrix4(obj.matrixWorld);
        bigBox.union(box);
    }
    if (obj.children) {
        obj.children.forEach(child => boundingBox(child, bigBox, depth + 1));
    }
    return bigBox;
}

function extent3D(obj, bb) {
    let rVec = new THREE.Vector3();
    if (!bb) bb = boundingBox(obj);

    if (bb) {
        rVec.copy(bb.max);
        rVec.sub(bb.min);
    }
    return rVec;
}

function center3D(obj, bb) {
    let rVec = new THREE.Vector3();
    if (!bb) bb = boundingBox(obj);
    if (bb) {
        rVec.copy(bb.max);
        rVec.add(bb.min);
        rVec.multiplyScalar(0.5);
    }
    return rVec;
}

export function addTexture(group, texture) {
    //const texture = new THREE.TextureLoader().load(url);
    group.traverse((child) => {
        if (child.material) {
            if(Array.isArray(child.material)) {
                child.material[0].map = texture;
                //child.material[2].map = texture;
            } else {
                child.material.map = texture;
            }
        }
    });
}

export function addEnvMap(group, envMap){
    group.traverse((child) => {
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material[0].envMap = envMap;
                child.material[1].envMap = envMap;
            } else {
                child.material.envMap = envMap;
            }
        }
    });
}

// copied from https://github.com/Fyrestar/THREE.BufferGeometry-toIndexed
export let toIndexed = (function() {
    let THREE;

    let list = [], vertices = {};

    let _src, attributesKeys, morphKeys;

    let prec = 0, precHalf = 0, length = 0;


    function floor( array, offset ) {

        if ( array instanceof Float32Array ) {

            return Math.floor( array[ offset ] * prec );

        } else if ( array instanceof window.Float16Array ) {// does not exist

            return Math.floor( array[ offset ] * precHalf );

        } else {

            return array[ offset ];

        }

    }

    function createAttribute( src_attribute ) {

        const dst_attribute = new THREE.BufferAttribute( new src_attribute.array.constructor( length * src_attribute.itemSize ), src_attribute.itemSize );

        const dst_array = dst_attribute.array;
        const src_array = src_attribute.array;

        switch ( src_attribute.itemSize ) {
            case 1:

                for ( let i = 0, l = list.length; i < l; i++ ) {

                    dst_array[ i ] = src_array[ list[ i ] ];

                }

                break;
            case 2:

                for ( let i = 0, l = list.length; i < l; i++ ) {

                    const index = list[ i ] * 2;

                    const offset = i * 2;

                    dst_array[ offset ] = src_array[ index ];
                    dst_array[ offset + 1 ] = src_array[ index + 1 ];

                }

                break;
            case 3:

                for ( let i = 0, l = list.length; i < l; i++ ) {

                    const index = list[ i ] * 3;

                    const offset = i * 3;

                    dst_array[ offset ] = src_array[ index ];
                    dst_array[ offset + 1 ] = src_array[ index + 1 ];
                    dst_array[ offset + 2 ] = src_array[ index + 2 ];


                }

                break;
            case 4:

                for ( let i = 0, l = list.length; i < l; i++ ) {

                    const index = list[ i ] * 4;

                    const offset = i * 4;

                    dst_array[ offset ] = src_array[ index ];
                    dst_array[ offset + 1 ] = src_array[ index + 1 ];
                    dst_array[ offset + 2 ] = src_array[ index + 2 ];
                    dst_array[ offset + 3 ] = src_array[ index + 3 ];


                }

                break;
        }

        return dst_attribute;

    }

    function hashAttribute( attribute, offset ) {

        const array = attribute.array;

        switch ( attribute.itemSize ) {
            case 1:

                return floor( array, offset );

            case 2:

                return floor( array, offset ) + '_' + floor( array, offset + 1 );

            case 3:

                return floor( array, offset ) + '_' + floor( array, offset + 1 ) + '_' + floor( array, offset + 2 );

            case 4:

                return floor( array, offset ) + '_' + floor( array, offset + 1 ) + '_' + floor( array, offset + 2 ) + '_' + floor( array, offset + 3 );

        }

    }


    function store( index, n ) {

        let id = '';

        for ( let i = 0, l = attributesKeys.length; i < l; i++ ) {

            const key = attributesKeys[ i ];
            const attribute = _src.attributes[ key ];

            const offset = attribute.itemSize * index * 3 + n * attribute.itemSize;

            id += hashAttribute( attribute, offset ) + '_';

        }

        for ( let i = 0, l = morphKeys.length; i < l; i++ ) {

            const key = morphKeys[ i ];
            const attribute = _src.morphAttributes[ key ];

            const offset = attribute.itemSize * index * 3 + n * attribute.itemSize;

            id += hashAttribute( attribute, offset ) + '_';

        }


        if ( vertices[ id ] === undefined ) {

            vertices[ id ] = list.length;

            list.push( index * 3 + n );

        }

        return vertices[ id ];

    }

    function storeFast( x, y, z, v ) {


        const id = Math.floor( x * prec ) + '_' + Math.floor( y * prec ) + '_' + Math.floor( z * prec );

        if ( vertices[ id ] === undefined ) {

            vertices[ id ] = list.length;


            list.push( v );

        }

        return vertices[ id ];

    }


    function indexBufferGeometry( src, dst, fullIndex ) {

        _src = src;

        attributesKeys = Object.keys( src.attributes );
        morphKeys = Object.keys( src.morphAttributes );



        const position = src.attributes.position.array;
        const faceCount = position.length / 3 / 3;

        const typedArray = faceCount * 3 > 65536 ? Uint32Array : Uint16Array;
        const indexArray = new typedArray( faceCount * 3 );


        // Full index only connects vertices where all attributes are equal

        if ( fullIndex ) {

            for ( let i = 0, l = faceCount; i < l; i++ ) {

                indexArray[ i * 3 ] = store( i, 0 );
                indexArray[ i * 3 + 1 ] = store( i, 1 );
                indexArray[ i * 3 + 2 ] = store( i, 2, );

            }

        } else {

            for ( let i = 0, l = faceCount; i < l; i++ ) {

                const offset = i * 9;

                indexArray[ i * 3 ] = storeFast( position[ offset ], position[ offset + 1 ], position[ offset + 2 ], i * 3 );
                indexArray[ i * 3 + 1 ] = storeFast( position[ offset + 3 ], position[ offset + 4 ], position[ offset + 5 ], i * 3 + 1 );
                indexArray[ i * 3 + 2 ] = storeFast( position[ offset + 6 ], position[ offset + 7 ], position[ offset + 8 ], i * 3 + 2 );

            }

        }


        // Index

        dst.index = new THREE.BufferAttribute( indexArray, 1 );

        length = list.length;


        // Attributes

        for ( let i = 0, l = attributesKeys.length; i < l; i++ ) {

            const key = attributesKeys[ i ];

            dst.attributes[ key ] = createAttribute( src.attributes[ key ] );

        }

        // Morph Attributes

        for ( let i = 0, l = morphKeys.length; i < l; i++ ) {

            const key = morphKeys[ i ];

            dst.morphAttributes[ key ] = createAttribute( src.morphAttributes[ key ] );

        }


        if ( src.boundingSphere ) {

            dst.boundingSphere = src.boundingSphere.clone();

        } else {

            dst.boundingSphere = new THREE.Sphere;
            dst.computeBoundingSphere();

        }


        if ( src.boundingBox ) {

            dst.boundingBox = src.boundingBox.clone();

        } else {

            dst.boundingBox = new THREE.Box3;
            dst.computeBoundingBox();

        }


        // Groups

        const groups = src.groups;

        for ( let i = 0, l = groups.length; i < l; i ++ ) {

            const group = groups[ i ];

            dst.addGroup( group.start, group.count, group.materialIndex );

        }


        // Release data

        vertices = {};
        list = [];

        _src = null;
        attributesKeys = [];
        morphKeys = [];

    }


    return function (srcGeometry, three, fullIndex, precision ) {
        THREE = three;

        precision = precision || 6;

        prec = Math.pow( 10, precision );
        precHalf = Math.pow( 10, Math.floor( precision / 2 ) );

        const geometry = new THREE.BufferGeometry;

        indexBufferGeometry( srcGeometry, geometry, fullIndex === undefined ? true : fullIndex );


        return geometry;
    }

})();
