#!/usr/bin/env bash
set -x

RAW_TAG=$1

# A sample of raw tag is refs/tags/templates@0.1.0
RAW_TAG_INFO=($(echo $RAW_TAG | tr "/" "\n"))
TAG=${RAW_TAG_INFO[2]}
TAG_INFO=($(echo $TAG | tr "@" "\n"))
TAG_PREFIX=${TAG_INFO[0]}
VERSION=${TAG_INFO[1]}

if [[ ${TAG_PREFIX} != "templates" ]]; then
    echo "Invalid tag prefix: ${TAG_PREFIX}."
    exit -1
fi

LANGUAGE_LIST=(js ts)

TEPLATE_LIST=(
    function-base.default
    function-triggers.HTTPTrigger
    tab.default
    bot.default
    msgext.default
    bot-msgext.default
)

for LANGUAGE in ${LANGUAGE_LIST[@]}; do
    for TEMPLATE in ${TEPLATE_LIST[@]}; do
        TEMPLATE=($(echo $TEMPLATE | tr "." "\n"))
        SCOPE=${TEMPLATE[0]}
        SCENARIO=${TEMPLATE[1]}

        if [ -z "$SCOPE" ]; then
            echo "SCOPE is empty."
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
        zip -rq ../../../../${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
        cd -
    done
done
