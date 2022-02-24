#!/usr/bin/env bash
set -x

TEMPLATE_TEAMSBOT_FILE_PREFIX=./templates/mustache-templates/teamsBot
LANGUAGE_LIST=(js ts csharp)

TEMPLATE_LIST=(
    function-base.default
    function-triggers.HTTPTrigger
    tab.default
    bot-msgext.default
    blazor-base.default
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
        
        if [ ${SCOPE} == "bot-msgext" ] && [ ${LANGUAGE} != "csharp" ]; then
            IS_ME=true IS_BOT=true mo ${TEMPLATE_TEAMSBOT_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/teamsBot.${LANGUAGE}
        fi

        cd ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}
        zip -rq ../../../../${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
        cd -
    done
done