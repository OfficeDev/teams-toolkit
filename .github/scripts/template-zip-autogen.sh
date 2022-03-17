#!/usr/bin/env bash
set -x

if [ "$1" = "" ]; then
    echo "Must input a path for templates folder"
    exit -1
fi

TEMPLATE_OUTPUT_DIR=$1
mkdir -p ${TEMPLATE_OUTPUT_DIR}

LANGUAGE_LIST=(js ts csharp)

TEMPLATE_LIST=(
    function-base.default
    function-triggers.HTTPTrigger
    tab.default
    bot.default
    bot.notification
    bot.notification-function-base
    bot.notification-trigger-http
    bot.notification-trigger-timer
    blazor-base.default
    tab.non-sso
)

for LANGUAGE in ${LANGUAGE_LIST[@]}; do
    for TEMPLATE in ${TEMPLATE_LIST[@]}; do
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
            continue
        fi

        cd ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}
        zip -rq ${TEMPLATE_OUTPUT_DIR}/${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
        cd -
    done
done