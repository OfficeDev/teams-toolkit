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

TEMPLATE_LIST=$(jq -r '.templates-v3[]' ./templates/package.json)

for TEMPLATE in ${TEMPLATE_LIST[@]}; do

    if [ ! -d ./templates/scenarios/${TEMPLATE} ]; then
        echo "The folder ./templates/scenarios/${TEMPLATE}  does not exist."
        exit -1
    fi

    cd ./templates/scenarios/${TEMPLATE} 
    zip -rq ${TEMPLATE_OUTPUT_DIR}/${TEMPLATE}.zip .
    cd -
done