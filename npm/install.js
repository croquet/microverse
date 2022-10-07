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

        fs.writeFileSync(targetFile, fs.readFileSync(source));
    }

    function copyFolderRecursiveSync(source, target, noOverwrite) {
        let files = [];

        // Check if folder needs to be created or integrated
        let targetFolder = path.join(target, path.basename(source));

        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder);
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

    function copyFiles() {
        let dist = process.env.INIT_CWD;
        copyFolderRecursiveSync("behaviors", dist);
        copyFolderRecursiveSync("assets", dist);
        copyFolderRecursiveSync("worlds", dist, true);
        copyFolderRecursiveSync("meta", dist);
        copyFolderRecursiveSync("lib", dist);
        copyFileSync("index.html", `${dist}${path.sep}index.html`);
    }

    console.log("starting to copy files", process.cwd());

    copyFiles();
}

if (require.main === module) {
    main();
}
