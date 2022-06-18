#!/bin/sh

cd `dirname "$0"`/..

DIST=${1}
DIST=${DIST:=dist}

find ${DIST}/assets/SVG -type f ! \( -name 'edit.svg' \) -exec rm -f {} +
find ${DIST}/assets/images -type f ! \( -name 'spark.png' \) -exec rm -f {} +
rm -rf ${DIST}/assets/sky
rm -rf ${DIST}/assets/3D

rm -rf ${DIST}/apps
rm -rf ${DIST}/docs

rm -rf ${DIST}/apiKey.js
cp apiKey.js-example ${DIST}/apiKey.js-example

rm -rf ${DIST}/behaviors
mkdir -p ${DIST}/behaviors
cp -rp behaviors/croquet ${DIST}/behaviors

rm -rf ${DIST}/worlds
mkdir -p ${DIST}/worlds
cp worlds/test.js ${DIST}/worlds/default.js
