/* globals JSZip Croquet */

const MAX_IMPORT_MB = 100; // aggregate

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
        }
            
        const file = item.getAsFile(); // getAsFile() is a method of DataTransferItem
        const type = this.getFileType(file.name);
        if (file && type) {
            return Promise.resolve({type, file});
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

        this.fullPath = entry.fullPath;

        return this.checkFile(entry, item, importSizeChecker);
    }

    async analyzeDirectory(dirEntry, importSizeChecker) {
        // recursively examine the directory contents, adding files to zip and figure out type
        const todo = [{path: dirEntry.fullPath, entry: dirEntry, depth: 0}];

        let zip = new JSZip();

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
        }).then(() => zip);
    }

    getFileType(fileName) {
        const fileExtensionTest = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/;
        const match = fileName.match(fileExtensionTest);
        return match ? match[0].toLowerCase() : "";
    }

    async fetchSpecForDroppedFile(file, fileType) {
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        }).then((buffer) => {
            const mimeType = fileType === ".mp4" ? "video/mp4" : null; // so far, mp4 is the only case that seems to matter (in Safari); see fetchSharedBlob()
            return { name: file.name, type: fileType, blob: file, buffer, mimeType };
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

        return this.handleFileDrop(evt.dataTransfer.items).then((zip) => {
            return zip.generateAsync({type : "uint8array"});
        }).then((buffer) => {
            return {fileName: this.fullPath, buffer};
        });
    }

    setupHandlersOn(dom, callback) {
        dom.ondragover = (evt) => evt.preventDefault();
        dom.ondrop = (evt) => {
            evt.preventDefault();
            this.drop(evt).then((obj) => {
                let {buffer, fileName} = obj;
                if (callback) {
                    callback(buffer, fileName);
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

    load(buffer, THREE) {
        return new Loader().importOBJ(buffer, THREE);
    }
}

export class Loader {
    async importOBJ(buffer, THREE) {
        let zipFile = new JSZip();
        let zip = await zipFile.loadAsync(buffer);

        let mtlFile = Object.keys(zip.files).find((name) => name.endsWith(".mtl"));
        let mtlContent = await zip.file(mtlFile).async("string");
        let mtlUrl = URL.createObjectURL(new Blob([mtlContent]));

        let objFile = Object.keys(zip.files).find((name) => name.endsWith(".obj"));
        let objContent = await zip.file(objFile).async("string");
        let objUrl = URL.createObjectURL(new Blob([objContent]));

        let pngFile = Object.keys(zip.files).find((name) => name.endsWith(".png"));
        let pngContent = await zip.file(objFile).async("uint8array");
        let pngUrl = URL.createObjectURL(new Blob([pngContent]));

        const manager = new THREE.LoadingManager();

        manager.setURLModifier(urlStr => {
            console.log(`handling request for ${urlStr}`);

            if (urlStr.endsWith(".png")) {
                console.log(`returning pngUrl`);
                return pngUrl;
            }
            console.log(`returning ${urlStr}`);
            return urlStr;
        });

        const mtlLoader = new THREE.MTLLoader(manager);
        let mtl = await new Promise((resolve, reject) => {
            mtlLoader.load(mtlUrl, resolve, null, reject);
        });//.catch((err) => console.log("laoding material failed"));
                 
        const objLoader = new THREE.OBJLoader(manager);
        let obj = await new Promise((resolve, reject) => {
            if (mtl) {
                objLoader.setMaterials(mtl);
            }
            objLoader.load(objUrl, resolve, null, reject);
        });//.catch((err) => console.log("laoding material failed"));

        URL.revokeObjectURL(mtlUrl);
        URL.revokeObjectURL(objUrl);
        URL.revokeObjectURL(pngUrl);

        return obj;
    }
}
