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

    setSessionId(sessionId) {
        this.sessionId = sessionId;
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
        // The droppef file might have been named like
        // abc.glb.zip, but it might have been abc.zip
        // so we don't know for sure what it was.

        if (isZip(buffer)) {
            let zipFile = new JSZip();
            let zip = await zipFile.loadAsync(buffer);
            let files = Object.keys(zip.files);

            if (files.find((name) => name.endsWith(".glb"))) {
                return new Loader().importGLB(buffer, THREE);
            }

            if (files.find((name) => name.endsWith(".obj"))) {
                return new Loader().importOBJ(buffer, THREE);
            }
            if (files.find((name) => name.endsWith(".fbx"))) {
                return new Loader().importFBX(buffer, THREE);
            }

            throw new Error("unknown file type");
        } else {
            // mostly trust the incoming type derived from the file name
            if (type === "glb") {
                return new Loader().importGLB(buffer, THREE);
            }
            if (type === "obj") {
                return new Loader().importOBJ(buffer, THREE);
            }
            if (type === "fbx") {
                return new Loader().importFBX(buffer, THREE);
            }
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

    async importOBJ(buffer, THREE) {
        let imgType = (n) => {
            // returns a MIME-subtype string or null
            if (n.endsWith(".png")) {
                return "png";
            }
            if (n.endsWith(".jpeg") || n.endsWith(".jpg")) {
                return "jpeg";
            }
            return null;
        };

        let mtlUrl;
        let mtl;
        let objUrl;
        let imgContents;
        
        const setupFiles = async () => {
            if (!isZip(buffer)) {
                objUrl = URL.createObjectURL(new Blob([buffer]));
                return Promise.resolve(buffer);
            }
        
            let zipFile = new JSZip();
            let zip = await zipFile.loadAsync(buffer);

            let files = Object.keys(zip.files);

            let mtlFile = files.find((name) => name.endsWith(".mtl"));
            let mtlContent = await zip.file(mtlFile).async("string");
            mtlUrl = URL.createObjectURL(new Blob([mtlContent]));

            let objFile = files.find((name) => name.endsWith(".obj"));
            let objContent = await zip.file(objFile).async("string");
            objUrl = URL.createObjectURL(new Blob([objContent]));

            let imgFiles = files.map((n) => ({name: n, type: imgType(n)})).filter((o) => o.type);
            imgContents = {}; // {[name after slash]: objectURL}

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

            return Promise.all(imgPromises);
        };

        await setupFiles();

        const manager = new THREE.LoadingManager();

        manager.setURLModifier(urlStr => {
            console.log(`handling request for ${urlStr}`);

            if (imgType(urlStr)) {
                console.log(`returning imgUrl`);
                let localName = this.localName(urlStr);
                return imgContents[localName] || ""; // it may not have the file
            }
            console.log(`returning ${urlStr}`);
            return urlStr;
        });

        if (mtlUrl) {
            const mtlLoader = new THREE.MTLLoader(manager);
            mtl = await new Promise((resolve, reject) => {
                mtlLoader.load(mtlUrl, resolve, null, reject);
            });//.catch((err) => console.log("laoding material failed"));
        }
                 
        const objLoader = new THREE.OBJLoader(manager);
        let obj = await new Promise((resolve, reject) => {
            if (mtl) {
                objLoader.setMaterials(mtl);
            }
            objLoader.load(objUrl, resolve, null, reject);
        });//.catch((err) => console.log("laoding material failed"));

        if (mtlUrl) {
            URL.revokeObjectURL(mtlUrl);
        }
        URL.revokeObjectURL(objUrl);
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
                return Promise.resolve(buffer);
            }
        };

        return getBuffer().then((data) => {
            let loader = new THREE.GLTFLoader();
            return new Promise((resolve, reject) => {
                return loader.parse(data, null, (obj) => resolve(obj.scene));
            });
        });
    }

    async importFBX(buffer, THREE) {
        // While FBX might refer to other files, we don't deal with them here as we don't support multiple files dropped
        // (see https://archive.blender.org/wiki/index.php/User:Mont29/Foundation/FBX_File_Structure/)

        let imgType = (n) => {
            // returns a MIME-subtype string or null
            if (n.endsWith(".png")) {
                return "png";
            }
            if (n.endsWith(".jpeg") || n.endsWith(".jpg")) {
                return "jpeg";
            }
            return null;
        };

        let fbxUrl;
        let imgContents;
        
        const setupFiles = async () => {
            if (!isZip(buffer)) {
                fbxUrl = URL.createObjectURL(new Blob([buffer]));
                return Promise.resolve(buffer);
            }
        
            let zipFile = new JSZip();
            let zip = await zipFile.loadAsync(buffer);

            let files = Object.keys(zip.files);

            let fbxFile = files.find((name) => name.endsWith(".fbx"));
            let fbxContent = await zip.file(fbxFile).async("ArrayBuffer");
            fbxUrl = URL.createObjectURL(new Blob([fbxContent]));

            let imgFiles = files.map((n) => ({name: n, type: imgType(n)})).filter((o) => o.type);
            imgContents = {}; // {[name after slash]: objectURL}

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

            return Promise.all(imgPromises);
        };

        await setupFiles();

        const manager = new THREE.LoadingManager();

        manager.setURLModifier(urlStr => {
            console.log(`handling request for ${urlStr}`);

            if (imgType(urlStr)) {
                console.log(`returning imgUrl`);
                let localName = this.localName(urlStr);
                return imgContents[localName] || ""; // it may not have the file
            }
            console.log(`returning ${urlStr}`);
            return urlStr;
        });

        const fbxLoader = new THREE.FBXLoader(manager);
        let obj = await new Promise((resolve, reject) => {
            return fbxLoader.load(fbxUrl, resolve, null, reject);
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

        URL.revokeObjectURL(fbxUrl);
        return obj;
    }
}
