/**
 * a barebones HTTP server in JS
 * originally by:
 *
 * @author zz85 https://github.com/zz85
 *
 * and modified by Croquet Corp
 *
 * Usage: node server.js <port number>
 *
 * do not use in production servers
 */

let port = 8000,
    http = require('http'),
    urlParser = require('url'),
    fs = require('fs'),
    path = require('path'),
    currentDir = process.cwd();


port = process.argv[2] ? parseInt(process.argv[2], 0) : port;

function fileTypes(name) {
    if (name.endsWith(".mjs")) {
       return "application/javascript";
    }
    if (name.endsWith(".js")) {
       return "application/javascript";
    }
    if (name.endsWith(".css")) {
       return "text/css";
    }
    if (name.endsWith(".png")) {
       return "image/png";
    }
    if (name.endsWith(".svg")) {
       return "image/svg+xml";
    }
    if (name.endsWith(".html")) {
       return "text/html";
    }
    if (name.endsWith(".pdf")) {
       return "application/pdf";
    }
    return "application/octet-stream";
}

function header(type) {
    let base = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, PROPFIND",
        "Access-Control-Allow-Headers": "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range",
        "Access-Control-Max-Age": "0",
        "Cache-Control": "no-cache"
    };

    if (type) {
        base["Content-Type"] = type;
    }
    return base;
}

function get(request, response, pathname) {
    if (pathname.endsWith('/')) {pathname += 'index.html';}
    let filePath = path.join(currentDir, pathname);
    fs.stat(filePath, (err, stats) => {
        if (err) {
            response.writeHead(404, {});
            response.end('File not found!');
            return;
        }

        if (stats.isFile()) {
            fs.readFile(filePath, (resErr, data) => {
                if (resErr) {
                    response.writeHead(404, {});
                    response.end('Resource not found');
                    return;
                }

                let type = fileTypes(filePath);
                response.writeHead(200, header(type));
                response.write(data);
                response.end();
            });
        } else if (stats.isDirectory()) {
            fs.readdir(filePath, (error, files) => {
                if (error) {
                    response.writeHead(500, {});
                    response.end();
                    return;
                }

                if (!pathname.endsWith('/')) {pathname += '/';}
                response.writeHead(200, {'Content-Type': "text/html"});
                response.write('<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>' + filePath + '</title></head><body>');
                response.write('<h1>' + filePath + '</h1>');
                response.write('<ul style="list-style:none;font-family:courier new;">');
                files.unshift('.', '..');
                files.forEach((item) => {
                    let urlpath = pathname + item,
                        itemStats = fs.statSync(currentDir + urlpath);
                    if (itemStats.isDirectory()) {
                        urlpath += '/';
                        item += '/';
                    }

                    response.write(`<li><a href="${urlpath}">${item}</a></li>`);
                });

                response.end('</ul></body></html>');
            });
        }
    });
}

function put(request, response, pathname) {
    let filePath = path.join(currentDir, pathname);
    let buf;
    request.on('data', (chunk) => {
        try {
            if (!buf) {
                buf = chunk;
            } else {
                buf = Buffer.concat([buf, chunk]);
            }
        } catch (e) {
            console.log(e);
        }
    });

    request.on('end', () => {
        let dirname = path.dirname(filePath);
        fs.mkdir(dirname, { recursive: true }, (err) => {
            if (err) {
                response.statusCode = 404;
                response.setHeader('Content-Type', 'text/html');
                response.end(`<h1>Cannot Create Directory</h1>\n<p>${dirname}</p>`);
                return;
            }

            fs.writeFile(filePath, buf, (writeErr) => {
                if (writeErr) {
                    response.statusCode = 404;
                    response.setHeader('Content-Type', 'text/html');
                    response.end(`<h1>Cannot Save File</h1>\n<p>${filePath}</p>`);
                    return;
                }
                console.log(filePath + ' saved (' + buf.length + ')');

                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/plain');
                response.end('');
            });
        });
    });
}

function propfind(request, response, pathname) {
    let dirname = path.dirname(pathname);
    fs.stat(dirname, (err, stats) => {
        if (err) {
            console.log('error', err);
            response.statusCode = 404;
            response.setHeader('Content-Type', 'text/html');
            response.end(`<h1>Directory Not found</h1>\n<p>${dirname}</p>`);
            return;
        }
        if (!stats.isDirectory()) {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'text/html');
            response.end(`<h1>Directory Not found</h1>\n<p>${dirname}</p>`);
            return;
        }

        fs.readdir(dirname, (readErr, list) => {
            if (readErr) {
                response.statusCode = 404;
                response.setHeader('Content-Type', 'text/html');
                response.end(`<h1>Cannot Read Directory</h1>\n<p>${dirname}</p>`);
                return;
            }
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/plain');
            response.end(JSON.stringify(list));
        });
  });
}

function handleRequest(request, response) {
    let urlObject = urlParser.parse(request.url, true);
    let pathname = decodeURIComponent(urlObject.pathname);
    let method = request.method;

    console.log(`[${(new Date()).toUTCString()}] "${method} ${pathname}"`);
    if (method === 'GET') {
        return get(request, response, pathname);
    }
    /*
    if (method === 'PUT') {
        return put(request, response, pathname);
    }
    if (method === 'PROPFIND') {
        return propfind(request, response, pathname);
    }
    */
    return null;
}

http.createServer(handleRequest).listen(port);

require('dns').lookup(require('os').hostname(), (err, addr, _fam) => {
    console.log(`Running at http://${addr}${((port === 80) ? '' : ':')}${port}/`);
});

console.log('The simple server has started...');
console.log('Base directory at ' + currentDir);
