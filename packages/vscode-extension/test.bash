#!/usr/bin/env bash

# This script requires jq and zip command, which are installed in GitHub Action virtual environments by default.
# See https://github.com/actions/virtual-environments/blob/main/images/linux/Ubuntu2004-Readme.md#installed-apt-packages

# set -x

isStringBeingUsed() {
    local string=$(echo "$1" | tr -d '"')
    # echo "Checking if string $string is being used..."
    local resultInSrc=$(grep -rnw './src' -e $string)
    # echo "result of grep: $resultInSrc"
    if [ ! -z "$resultInSrc" ]; then
        # echo "not found"
        return 0
    fi
    local resultInPackageJson=$(grep -nw 'package.json' -e $string)
    if [ ! -z "$resultInPackageJson" ]; then
        # echo $resultInPackageJson
        return 0
    fi
    return 1
}

STRING_KEYS=$(jq 'keys | .[]' './package.nls.json')
for key in ${STRING_KEYS[@]}; do
    # echo $key
    # result=$(grep -rnw './src' -e $key)
    used=$(isStringBeingUsed $key)
    if [ $? = 1 ]; then
        echo "The string $key is not being used."
        sed -i "/$key/d" './package.nls.json'
    # else
    #     echo "The string $key is being used."
    fi
done


# set -x

# if [ -z "$1" ]; then
#     echo "Must input a path for templates folder"
#     exit -1
# fi

# TEMPLATE_OUTPUT_DIR=$1
# mkdir -p ${TEMPLATE_OUTPUT_DIR}

# TEMPLATE_BASE_DIR="./templates/scenarios"
# cd ${TEMPLATE_BASE_DIR}
# TEMPLATE_NAMES=$(ls -d *)
# cd -

# for TEMPLATE_NAME in ${TEMPLATE_NAMES[@]}; do
#     TEMPLATE_PATH=${TEMPLATE_BASE_DIR}/${TEMPLATE_NAME}
#     if [ ! -d ${TEMPLATE_PATH} ]; then
#         echo "The folder ${TEMPLATE_PATH} does not exist."
#         exit -1
#     fi

#     cd ${TEMPLATE_PATH}
#     zip -rq ${TEMPLATE_OUTPUT_DIR}/${TEMPLATE_NAME}.zip .
#     cd -
# done