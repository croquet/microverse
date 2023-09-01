export class TSCompiler {
    async compile(tsCode, location) {
        if (!window.tsPromise) {
            window.tsPromise = new Promise((resolve, _reject) => {
                let script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/typescript@5.1.6/lib/typescript.min.js";
                script.onload = resolve;
                script.type = "text/javascript";
                document.head.appendChild(script);
            });
        }

        await window.tsPromise;
        if (!window.ts) {return tsCode;}
        this.options = {
            module: window.ts.ModuleKind.ESNext,
            target: window.ts.ScriptTarget.ESNext,
            noResolve: true,
        };

        this.compilerHost = this.createCompilerHost();
        this.sources = new Map([[location, tsCode]]);
        this.results = new Map();

        let program = window.ts.createProgram([location], this.options, this.compilerHost);
        let _result = program.emit();

        let compiledName = location.replace(/\.ts$/, ".js");

        let compiled = this.results.get(compiledName);

        delete this.sources;
        delete this.results;
        return compiled;
    }

    getSourceFile(fileName, languageVersion, _onError) {
        const sourceText = this.readFile(fileName);
        return sourceText !== undefined
            ? window.ts.createSourceFile(fileName, sourceText, languageVersion)
            : undefined;
    }

    readFile(fileName) {
        return this.sources.get(fileName);
    }

    writeFile(fileName, content) {
        this.results.set(fileName, content);
    }

    knownDirectories() {
        return [];
        // return ["croquet", "default"];
    }

    createCompilerHost() {
        return {
            getSourceFile: this.getSourceFile,
            getDefaultLibFileName: (defaultLibOptions) => "/" + window.ts.getDefaultLibFileName(defaultLibOptions),
            writeFile: (fileName, content) => this.writeFile(fileName, content),
            getCurrentDirectory: () => "/",
            getDirectories: (_path) => [],
            fileExists: () => true,
            readFile: (fileName) => this.readFile(fileName),
            getCanonicalFileName: (fileName) => fileName,
            useCaseSensitiveFileNames: () => true,
            getNewLine: () => "\n",
            getEnvironmentVariable: () => "", // do nothing
            resolveModuleNames: () => [],
        };
    }
}

export class JSCompiler {
    compile(jsCode, _location) {
        let result = [];

        let codeArray = jsCode.split("\n");

        for (let i = 0; i < codeArray.length; i++) {
            let line = codeArray[i];
            if (/^import/.test(line)) {
                result.push(line[line.length - 1] === "\r" ? "\r" : "");
                continue;
            }
            let test = /^\s*class(\s+)(\S+)\s+extends\s(ActorBehavior|PawnBehavior)(.*)(\r?)$/.exec(line);
            if (test) {
                let newLine = `class${test[1]}${test[2]}${test[4]}${test[5]}`;
                result.push(newLine);
                continue;
            }
            result.push(line);
        }
        return Promise.resolve(result.join("\n"));
    }
}
