#!/usr/bin/env bash

# This script requires jq and zip command, which are installed in GitHub Action virtual environments by default.
# See https://github.com/actions/virtual-environments/blob/main/images/linux/Ubuntu2004-Readme.md#installed-apt-packages

set -x

if [ -z "$1" ]; then
    echo "Must input a path for templates folder"
    exit -1
fi

TEMPLATE_OUTPUT_DIR=$1
mkdir -p ${TEMPLATE_OUTPUT_DIR}

TEMPLATE_LIST=$(jq -r '.templates[]' ./templates/package.json)

for TEMPLATE in ${TEMPLATE_LIST[@]}; do
    TEMPLATE=($(echo $TEMPLATE | tr "/" "\n"))
    SCOPE=${TEMPLATE[0]}
    LANGUAGE=${TEMPLATE[1]}
    SCENARIO=${TEMPLATE[2]}

    if [ -z "$SCOPE" ]; then
        echo "SCOPE is empty."
        exit -1
    fi

    if [ -z "$LANGUAGE" ]; then
        echo "LANGUAGE is empty."
        exit -1
    fi

    if [ -z "$SCENARIO" ]; then
        echo "SCENARIO is empty."
        exit -1
    fi

    if [ ! -d ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO} ]; then
        echo "The folder ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO} does not exist."
        exit -1
    fi

    cd ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}
    zip -rq ${TEMPLATE_OUTPUT_DIR}/${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
    cd -
done