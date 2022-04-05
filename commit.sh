#!/bin/sh

META=`git log --no-walk|grep -v '^Author' |head -2 |tr '\n' ' '`
COMMIT=`echo ${META} | awk '{print $2}'`

DIST=${1}
DIST=${DIST:=dist}

mkdir -p ${DIST}/meta
echo ${META} > ${DIST}/meta/version.txt
