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

TEMPLATE_BASE_DIR="./templates/scenarios"
cd ${TEMPLATE_BASE_DIR}
TEMPLATE_NAMES=$(ls -d *)
cd -

for TEMPLATE_NAME in ${TEMPLATE_NAMES[@]}; do
    TEMPLATE_PATH=${TEMPLATE_BASE_DIR}/${TEMPLATE_NAME}
    if [ ! -d ${TEMPLATE_PATH} ]; then
        echo "The folder ${TEMPLATE_PATH} does not exist."
        exit -1
    fi

    cd ${TEMPLATE_PATH}
    zip -rq ${TEMPLATE_OUTPUT_DIR}/${TEMPLATE_NAME}.zip .
    cd -
done