#!/usr/bin/env node

function main() {
    let { execSync } = require("child_process");
    let fs = require("fs");
    let path = require("path");

    function copyFileSync(source, target) {
        let targetFile = target;

        // If target is a directory, a new file with the same name will be created
        if (fs.existsSync(target)) {
            if (fs.lstatSync(target).isDirectory()) {
                targetFile = path.join(target, path.basename(source));
            }
        }

        fs.writeFileSync(targetFile, fs.readFileSync(source));
    }

    function copyFolderRecursiveSync(source, target) {
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
                    copyFolderRecursiveSync(curSource, targetFolder);
                } else {
                    copyFileSync(curSource, targetFolder);
                }
            });
        }
    }

    function copyFiles() {
        let dist = process.env.INIT_CWD;
        copyFolderRecursiveSync("behaviors", dist);
        copyFolderRecursiveSync("assets", dist);
        copyFolderRecursiveSync("worlds", dist);
        copyFolderRecursiveSync("meta", dist);
        copyFolderRecursiveSync("lib", dist);
        copyFileSync("index.html", dist + "/index.html");
    }

    console.log("starting to copy files", process.cwd());

    copyFiles();
}

if (require.main === module) {
    main();
}
