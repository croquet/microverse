#!/bin/sh

DIST=${1}

if [ -z ${DIST} ]
then
    echo "specify the destination dir"
    exit 1;
fi

SECRETS=(worlds/factory.js behaviors/factory)

for i in ${SECRETS[@]}
do
    rm -rf ${DIST}/$i
done
