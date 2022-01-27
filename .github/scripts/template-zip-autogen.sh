#!/usr/bin/env bash
set -x


TEMPLATE_FILE_PREFIX=./templates/mustache-templates
TEMPLATE_TEAMSBOT_FILE_PREFIX=./templates/mustache-templates/teamsBot
LANGUAGE_LIST=(js ts csharp)

TEMPLATE_LIST=(
    function-base.default
    function-triggers.HTTPTrigger
    tab.default
    bot.default
    msgext.default
    bot-msgext.default
    blazor-base.tab
    blazor-base.bot
    blazor-base.tabbot
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
            continue
        fi        
        
        # Generate code from Mustache templates for js and ts
        if [ ${SCOPE} == "bot" ] && [ ${LANGUAGE} != "csharp" ]; then           
            IS_BOT=true mo ${TEMPLATE_TEAMSBOT_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/teamsBot.${LANGUAGE}
        fi
        if [ ${SCOPE} == "msgext" ] && [ ${LANGUAGE} != "csharp" ]; then
            IS_ME=true mo ${TEMPLATE_TEAMSBOT_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/messageExtensionBot.${LANGUAGE}
        fi
        if [ ${SCOPE} == "bot-msgext" ] && [ ${LANGUAGE} != "csharp" ]; then
            IS_ME=true IS_BOT=true mo ${TEMPLATE_TEAMSBOT_FILE_PREFIX}.${LANGUAGE}.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/teamsBot.${LANGUAGE}
        fi

        # Generate code from Mustache templates for csharp
        if [ ${SCOPE} == "blazor-base" ] && [ ${SCENARIO} = "tab" ]; then           
            IS_TAB=true mo ${TEMPLATE_FILE_PREFIX}/appsettings.Development.json.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/appsettings.Development.json
            IS_TAB=true mo ${TEMPLATE_FILE_PREFIX}/appsettings.json.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/appsettings.json
            IS_TAB=true mo ${TEMPLATE_FILE_PREFIX}/BlazorAppServer.csproj.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/BlazorAppServer.csproj
            IS_TAB=true placeholder={{BlazorAppServer}} mo ${TEMPLATE_FILE_PREFIX}/Program.cs.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/Program.cs.tpl
        fi
        if [ ${SCOPE} == "blazor-base" ] && [ ${SCENARIO} = "bot" ]; then
            IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}/appsettings.Development.json.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/appsettings.Development.json
            IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}/appsettings.json.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/appsettings.json
            IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}/BlazorAppServer.csproj.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/BlazorAppServer.csproj
            IS_BOT=true placeholder={{BlazorAppServer}} mo ${TEMPLATE_FILE_PREFIX}/Program.cs.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/Program.cs.tpl
        fi
        if [ ${SCOPE} == "blazor-base" ] && [ ${SCENARIO} = "tabbot" ]; then
            IS_TAB=true IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}/appsettings.Development.json.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/appsettings.Development.json
            IS_TAB=true IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}/appsettings.json.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/appsettings.json
            IS_TAB=true IS_BOT=true mo ${TEMPLATE_FILE_PREFIX}/BlazorAppServer.csproj.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/BlazorAppServer.csproj
            IS_TAB=true IS_BOT=true placeholder={{BlazorAppServer}} mo ${TEMPLATE_FILE_PREFIX}/Program.cs.mustache > ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}/Program.cs.tpl
        fi

        cd ./templates/${SCOPE}/${LANGUAGE}/${SCENARIO}
        zip -rq ../../../../${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
        cd -
    done
done




