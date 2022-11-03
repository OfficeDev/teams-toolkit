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

TEMPLATE_LIST=$(jq -r '.templatesV3[]' ./templates/package.json)
TEMPLATE_PATHS=$(ls -d ./templates/scenarios/*/)

for TEMPLATE_PATH in ${TEMPLATE_PATHS[@]}; do

    if [ ! -d ${TEMPLATE_PATH} ]; then
        echo "The folder ${TEMPLATE_PATH} does not exist."
        exit -1
    fi

    ARR=(${TEMPLATE_PATH//// }) # split template path by '/'
    TEMPLATE=(${ARR[3]})
    cd ${TEMPLATE_PATH}
    zip -rq ${TEMPLATE_OUTPUT_DIR}/${TEMPLATE}.zip .
    cd -
done