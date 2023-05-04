#!/usr/bin/env bash

# This script requires jq and zip command, which are installed in GitHub Action virtual environments by default.
# See https://github.com/actions/virtual-environments/blob/main/images/linux/Ubuntu2004-Readme.md#installed-apt-packages

# set -x

isStringBeingUsed() {
    local string=$(echo "$1" | tr -d '"')
    if [[ $string =~ _teamstoolkit* ]]; then
        return 0
    fi
    if [[ $string =~ .*running ]] || [[ $string =~ .*blockTooltip ]]; then
        return 0
    fi
    
    local resultInSrc=$(grep -rnw './src' -e $string)
    if [ ! -z "$resultInSrc" ]; then
        # not found
        return 0
    fi
    local resultInPackageJson=$(grep -nw 'package.json' -e $string)
    if [ ! -z "$resultInPackageJson" ]; then
        return 0
    fi
    return 1
}

STRING_KEYS=$(jq 'keys | .[]' './package.nls.json')
for key in ${STRING_KEYS[@]}; do
    used=$(isStringBeingUsed $key)
    if [ $? = 1 ]; then
        echo "The string $key is not being used."
        # sed -i "/$key/d" './package.nls.json'
    fi
done
