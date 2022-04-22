#!/bin/sh

DIST=${1}

if [ -z ${DIST} ]
then
    echo "specify the destination dir"
    exit 1;
fi

SECRETS=(assets/SVG/Verizon.svg assets/SVG/5G.svg worlds/verizon.js)

for i in ${SECRETS[@]}
do
    rm ${DIST}/$i
done
