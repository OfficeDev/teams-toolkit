#!/usr/bin/env bash
set -x


TEMPLATE_FILE_PREFIX=./templates/mustache-templates/teamsBot
LANGUAGE_LIST=(js ts)

TEMPLATE_LIST=(
    function-base.default
    function-triggers.HTTPTrigger
    tab.default
    bot.default
    msgext.default
    bot-msgext.default
)

# Copy bot code to msgext-bot, except readme and images
rsync -az --recursive --exclude "*.md" --exclude "*images/*" ./templates/bot/ ./templates/bot-msgext/

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
            exit -1
        fi        
        
        # Generate code from Mustache templates
        if [ ${SCOPE} == "bot" ]; then           
            IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/teamsBot.${LANGUAGE}
        fi
        if [ ${SCOPE} == "msgext" ]; then
            IS_ME=true mo ${TEMPLATE_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/messageExtensionBot.${LANGUAGE}
        fi
        if [ ${SCOPE} == "bot-msgext" ]; then
            IS_ME=true IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/teamsBot.${LANGUAGE}
        fi

        cd ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}
        zip -rq ../../../../${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
        cd -
    done
done