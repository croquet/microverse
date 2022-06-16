#!/bin/sh

VERSION=138

LIBS=(postprocessing/Pass.js shaders/CopyShader.js csm/CSMFrustum.js csm/CSMShader.js \
    loaders/OBJLoader.js loaders/MTLLoader.js loaders/GLTFLoader.js loaders/FBXLoader.js \
    loaders/DRACOLoader.js loaders/SVGLoader.js loaders/EXRLoader.js \
    utils/BufferGeometryUtils.js csm/CSM.js)

echo `dirname "$0"`/..

cd `dirname "$0"`/..

for lib in ${LIBS[@]}
do
    echo $lib
    DIR=`dirname $lib`
    mkdir -p three/${DIR}
    curl -L -o three/${lib} "https://unpkg.com/three@0.${VERSION}/examples/js/${lib}"
done

(
    for lib in ${LIBS[@]}
    do
       echo three/${lib}
    done
) | xargs cat > three/bundledThreeLibs.js
