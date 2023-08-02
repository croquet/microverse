#!/bin/sh

cd `dirname "$0"`/..

DIST=${1}
DIST=${DIST:=dist}

find ${DIST}/assets/avatars -type f ! \( -name 'newwhite.zip' \) -exec rm -f {} +
rm -rf ${DIST}/assets/sky
rm -rf ${DIST}/assets/3D
rm -rf ${DIST}/assets/fonts
rm -rf ${DIST}/assets/avatar-images
rm -rf ${DIST}/assets/SVG
rm -rf ${DIST}/assets/images

mkdir -p ${DIST}/assets/fonts
cp -rp assets/fonts/Roboto* assets/fonts/Poppins*.woff2 ${DIST}/assets/fonts

mkdir -p ${DIST}/assets/avatar-animations
cp -rp assets/avatar-animations ${DIST}/assets/

rm -rf ${DIST}/apps
rm -rf ${DIST}/docs

rm -rf ${DIST}/apiKey.js
rm -rf ${DIST}/apiKey-dev.js
cp apiKey.js-example ${DIST}/apiKey.js-example

rm -rf ${DIST}/behaviors
mkdir -p ${DIST}/behaviors/default
cp -rp behaviors/croquet ${DIST}/behaviors
cp -p behaviors/default/lights.js ${DIST}/behaviors/default/lights.js

rm -rf ${DIST}/worlds
mkdir -p ${DIST}/worlds
cp worlds/test.js ${DIST}/worlds/default.js

cp npm/package.json ${DIST}/package.json
cp npm/install.js ${DIST}/install.js
cp npm/gitignore ${DIST}/gitignore
