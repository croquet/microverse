const chokidar = require('chokidar');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

const wss = new ws.WebSocketServer({port: 9011});

let directory = path.join(path.dirname(process.argv[1]), "..");
console.log(directory);
process.chdir(directory);

let files = {}; // {filename: content}
let sentFiles = new Map();// {ws: {filename: content}}

let watcher = chokidar.watch('./expanders/*.js' ,{
    persistent: true,
    ignored: /^[#]/
});

watcher.on('add', name => {
    loadFile(name).then(() => {
        sendAllFiles();
    });
});
watcher.on('change', name => {
    loadFile(name).then(() => {
        sendAllFiles();
    });
});
watcher.on('unlink', name => {
    delete files[path.basename(name, ".js")];
});

function loadFile(name) {
    let basename = path.basename(name, ".js");
    return new Promise((resolve, reject) => {
        fs.readFile(name, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    }).then((file) => {
        files[basename] = file;
        console.log(name);
    });
}

function heartbeat() {
    this.isAlive = true;
}

const interval = setInterval(function ping() {
    for (let ws of sentFiles.keys()) {
        if (ws.isAlive === false) {
            sentFiles.delete(ws);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    }
}, 30000);

wss.on('connection', (ws, request, client)  => {
    sentFiles.set(ws, {});
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    sendFiles(ws);
});

function sendFiles(socket) {
    let toSend = [];

    let newKeys = Object.keys(files);
    let sent = sentFiles.get(socket);
    
    let sentKeys = Object.keys(sent);
    
    newKeys.forEach((k) => {
        if (files[k] && files[k] !== sent[k]) {
            toSend.push({action: "add", name: k, content: files[k]});
        }
    });

    sentKeys.forEach((k) => {
        if (files[k] === undefined && sent[k]) {
            toSend.push({action: "remove", name: k});
        }
    });
    
    socket.send(JSON.stringify(toSend));
}

function sendAllFiles() {
    for (let k of sentFiles.keys()) {
        sendFiles(k);
    }
}

wss.on('close', function close() {
    console.log("close", ws);
    clearInterval(interval);
});
