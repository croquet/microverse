#!/bin/sh

cd `dirname "$0"`/..

DIST=${1}
DIST=${DIST:=dist}

find ${DIST}/assets/avatars -type f ! \( -name 'newwhite.zip' \) -exec rm -f {} +
find ${DIST}/assets/SVG -type f ! \( -name 'edit.svg' \) -exec rm -f {} +
find ${DIST}/assets/images -type f ! \( -name 'grid.png' \) -exec rm -f {} +
rm -rf ${DIST}/assets/sky
rm -rf ${DIST}/assets/3D
rm -rf ${DIST}/assets/fonts
rm -rf ${DIST}/assets/avatar-images
mkdir -p ${DIST}/assets/fonts

cp -rp assets/fonts/css assets/fonts/webfonts assets/fonts/Roboto* ${DIST}/assets/fonts

rm -rf ${DIST}/apps
rm -rf ${DIST}/docs

rm -rf ${DIST}/apiKey.js
cp apiKey.js-example ${DIST}/apiKey.js-example

rm -rf ${DIST}/behaviors
mkdir -p ${DIST}/behaviors/default
cp -rp behaviors/croquet ${DIST}/behaviors
cp -p behaviors/default/lights.js ${DIST}/behaviors/default/lights.js

rm -rf ${DIST}/worlds
mkdir -p ${DIST}/worlds
cp worlds/test.js ${DIST}/worlds/default.js
