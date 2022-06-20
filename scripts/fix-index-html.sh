#!/bin/sh

DIST=${1}

if [ -z ${DIST} ]
then
    echo "specify the destination dir"
    exit 1;
fi

cat ${DIST}/index.html | sed  's:<script.*index.*\.js.*<\/script>:<script defer src="node_modules/@croquet/microverse-library/lib/index.js"><\/script>:' > ${DIST}/index.html-tmp
mv ${DIST}/index.html-tmp ${DIST}/index.html
mv  ${DIST}/lib/index-*.js ${DIST}/lib/index.js
