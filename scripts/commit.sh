#!/bin/sh

META=`git show -s --format='commit: %H Date: %cd'`
COMMIT=`echo ${META} | awk '{print $2}'`

DIST=${1}
DIST=${DIST:=dist}

mkdir -p ${DIST}/meta
echo ${META} > ${DIST}/meta/version.txt
