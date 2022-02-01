/* globals JSZip Croquet */

const MAX_IMPORT_MB = 100; // aggregate

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
        this.assetCache = {}; // {[dataId]: {buffer, dataURL, blob, userIds: [id]}}
        this.objectURLs = {}; // {[viewId]: [dataIds]}
    }

    checkFile(entry, item, importSizeChecker) {
        if (entry.isDirectory) {
            return this.analyzeDirectory(entry, importSizeChecker).catch((err) => {
                throw new Error("directory could not be zipped");
            });
            // returns {zip, type}
        }

            
        const file = item.getAsFile(); // getAsFile() is a method of DataTransferItem
        const type = this.getFileType(file.name);
        if (file && type) {
            return this.fetchSpecForDroppedFile(file, type).then((spec) => {
                return {type, file: spec.buffer};
            });
        }
        throw new Error("could not read a file");
    }

    async handleFileDrop(items) {
        const importSizeChecker = new ImportChecker();
        const specPromises = [];

        if (items.length > 1) {
            console.warn("multiple files or dirs dropped");
        }
        
        const item = items[0];
        const entry = item.getAsEntry ? item.getAsEntry()
            : (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null);

        if (!entry) {return Promise.resolve(null);}

        return this.checkFile(entry, item, importSizeChecker).then((obj) => {
            return {...obj, fileName: entry.fullPath};
        });
    }

    async analyzeDirectory(dirEntry, importSizeChecker) {
        // recursively examine the directory contents, adding files to zip and figure out type
        const todo = [{path: dirEntry.fullPath, entry: dirEntry, depth: 0}];

        let zip = new JSZip();

        let maybeType;

        const processEntries = () => {
            const { path, entry, depth } = todo.pop();
            if (entry.isDirectory) {
                return new Promise((resolve, reject) => {
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

        return new Promise(async (resolve, reject) => {
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

    drop(evt) {
        function isFileDrop(evt) {
            const dt = evt.dataTransfer;
            for (let i = 0; i < dt.types.length; i++) {
                if (dt.types[i] === "Files") return true;
            }
            return false;
        }

        if (!isFileDrop(evt)) {return;}

        let fullPath;
        let fileType;

        return this.handleFileDrop(evt.dataTransfer.items).then(({zip, file, type, fileName}) => {
            fullPath = fileName;
            fileType = type;
            if (zip) {
                return zip.generateAsync({type : "uint8array"});
            }
            return Promise.resolve(file);
        }).then((buffer) => {
            return {fileName: fullPath, type: fileType, buffer};
        });
    }

    setupHandlersOn(dom, callback) {
        dom.ondragover = (evt) => evt.preventDefault();
        dom.ondrop = (evt) => {
            evt.preventDefault();
            this.drop(evt).then((obj) => {
                let {buffer, fileName, type} = obj;
                if (callback) {
                    callback(buffer, fileName, type);
                }
            });
        };
    }


    use(dataId, userId) {
        let obj = this.assetCache[dataId];
        if (!obj) {return null;}
        let {buffer, objectURL, blob, userIds} = obj;
        if (userIds.indexOf(userId) < 0) {
            userIds.push(userId);
        }
        if (!blob && buffer) {
            obj.blob = new Blob([buffer], { type: 'application/octet-stream'});
            obj.buffer = null;
        }
        if (!objectURL) {
            obj.objectURL = URL.createObjectURL(blob);
        }
        return obj.objectURL;
    }

    revoke(dataId, userId) {
        let obj = this.assetCache[dataId];
        if (!obj) {return null;}
        let {buffer, objectURL, blob, userIds} = obj;
        let ind = userIds.indexOf(userId);
        if (ind >= 0) {
            userIds.splice(ind, 1);
        }

        if (userIds.length === 0 && objectURL) {
            URL.revokeObjectURL(objectURL);
            obj.objectURL = null;
        }

        delete this.assetCache[dataId];
    }

    async load(buffer, type, THREE) {
        // here is a bit of checks to do. The file dropped might have been a directory,
        // and then we zipped it. But the file dropped might have been a zip file,
        // The dropped file might have been named like
        // abc.glb.zip, but it might have been abc.zip
        // so we don't know for sure what it was.

        let types = [
            {file: "glb", func: "importGLB"},
            {file: "obj", func: "importOBJ"},
            {file: "fbx", func: "importFBX"}
        ];

        if (isZip(buffer)) {
            let zipFile = new JSZip();
            let zip = await zipFile.loadAsync(buffer);
            let files = Object.keys(zip.files);

            for (let i = 0; i < types.length; i++) {
                let {file, func} = types[i];
                if (files.find((name) => name.endsWith(`.${file}`))) {
                    let f = Loader.prototype[func];
                    return f.call(new Loader(), buffer, THREE);
                }
            }

            throw new Error("unknown file type");
        } else {
            for (let i = 0; i < types.length; i++) {
                let {file, func} = types[i];
                if (type === file) {
                    let f = Loader.prototype[func];
                    return f.call(new Loader(), buffer, THREE);
                }
            }
            throw new Error("unknown file type");
        }
    }
}

export class Loader {
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
                return new Promise((resolve, reject) => {
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
            console.log(`handling request for ${urlStr}`);

            if (this.imgType(urlStr)) {
                console.log(`returning imgUrl`);
                let localName = this.localName(urlStr);
                return imgContents[localName] || ""; // it may not have the file
            }
            console.log(`returning ${urlStr}`);
            return urlStr;
        });
    }

    async importOBJ(buffer, THREE) {
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

    async importFBX(buffer, THREE) {
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
                mixer.clipAction(object.animations[0]).play();
                object._croquetAnimation = {
                    lastTime: 0,
                    mixer
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

    async importGLB(buffer, THREE) {
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
            let loader = new THREE.GLTFLoader();
            return new Promise((resolve, reject) => {
                let draco = new THREE.DRACOLoader();
                draco.setDecoderConfig({type: 'js'});
                draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
                loader.setDRACOLoader(draco);
                return loader.parse(data, null, (obj) => resolve(obj));
            }).then((loaded) => {
                let {scene, scenes, cameras, animations} = loaded;
                if (animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(scene);
                    mixer.clipAction(animations[0]).play();
                    scene._croquetAnimation = {
                        lastTime: 0,
                        mixer
                    };
                }
                return scene;
            })
        });
    }
}
