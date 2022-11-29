function main() {
    let fs = require("fs");
    let path = require("path");

    function copyFileSync(source, target, noOverwrite) {
        let targetFile = target;

        // If target is a directory, a new file with the same name will be created.
        // if the target already exists and noOverwrite flag is true, it skips the file.
        if (fs.existsSync(targetFile)) {
            if (fs.lstatSync(target).isDirectory()) {
                targetFile = path.join(target, path.basename(source));
            }
        }

        if (fs.existsSync(targetFile) && noOverwrite) {
            return;
        }

        console.log(targetFile, source);
        fs.writeFileSync(targetFile, fs.readFileSync(source));
    }

    function copyFolderRecursiveSync(source, target, noOverwrite) {
        let files = [];

        // Check if folder needs to be created or integrated
        let targetFolder = path.join(target, path.basename(source));

        if (!fs.existsSync(targetFolder)) {
            console.log("mkdirSync", targetFolder, source);
            fs.mkdirSync(targetFolder, {recursive: true});
        }

        // Copy
        if (fs.lstatSync(source).isDirectory()) {
            files = fs.readdirSync(source);
            files.forEach((file) => {
                let curSource = path.join(source, file);
                if (fs.lstatSync(curSource).isDirectory()) {
                    copyFolderRecursiveSync(curSource, targetFolder, noOverwrite);
                } else {
                    copyFileSync(curSource, targetFolder, noOverwrite);
                }
            });
        }
    }

    function deleteDir(target) {
        // target should be a directory. All files under the directory will be removed recursively.
        console.log("deleteDir:", target);
        if (fs.existsSync(target)) {
            if (fs.lstatSync(target).isDirectory()) {
                console.log("deleting: ", target);
                if (fs.rmSync) {
                    try {
                        fs.rmSync(target, {recursive: true});
                    } catch (e) {
                        console.log("failed to remove dir");
                    }
                }
            }
        }
    }

    let dist = process.env.INIT_CWD;
    let sep = path.sep;

    function copyFiles() {
        console.log("starting to copy files", process.cwd());
        copyFolderRecursiveSync(`behaviors${sep}croquet`, `${dist}${sep}behaviors`);
        copyFolderRecursiveSync(`behaviors${sep}default`, `${dist}${sep}behaviors`, true);
        copyFolderRecursiveSync("assets", dist);
        copyFolderRecursiveSync("worlds", dist, true);
        copyFolderRecursiveSync("meta", dist);
        copyFolderRecursiveSync("lib", dist);
        copyFileSync("index.html", `${dist}${sep}index.html`);
        copyFileSync("apiKey.js-example", `${dist}${sep}apiKey.js-example`);
        copyFileSync("gitignore", `${dist}${sep}.gitignore`, true);
    }

    deleteDir(`${dist}${sep}lib`);
    copyFiles();
}

if (require.main === module) {
    main();
}
