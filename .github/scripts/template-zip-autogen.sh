#!/usr/bin/env bash
set -x

# Generate code from mustache template
# Download
curl -sSL https://git.io/get-mo -o mo
# Make executable
chmod +x mo

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

        # Copy bot code to msgext-bot, except readme and images
        rsync -avz --recursive --exclude "*.md" --exclude "*images/*" ./templates/bot/ ./templates/bot-msgext/
        
        # Generate code from Mustache templates
        if [ ${SCOPE} == "bot" ]; then           
            export IS_BOT=true
            mo ${TEMPLATE_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/teamsBot.${LANGUAGE}
        fi
        if [ ${SCOPE} == "msgext" ]; then
            export IS_ME=true
            mo ${TEMPLATE_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/messageExtensionBot.${LANGUAGE}
        fi
        if [ ${SCOPE} == "bot-msgext" ]; then
            export IS_ME=true
            export IS_BOT=true
            mo ${TEMPLATE_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/teamsBot.${LANGUAGE}
        fi

        cd ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}
        zip -rq ../../../../${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
        cd -
    done
done
