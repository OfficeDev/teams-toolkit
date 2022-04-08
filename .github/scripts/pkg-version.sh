#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)
REPO_ROOT_DIR=$(cd $SCRIPT_DIR/../.. && pwd)
TEMPLATE_DIR=$(cd $REPO_ROOT_DIR/templates && pwd)
FX_CORE_API_CONNECTOR_CONFIG_DIR=$(cd $REPO_ROOT_DIR/packages/fx-core/templates/plugins/resource/apiconnector && pwd)

echo "------ script dir: " $SCRIPT_DIR
echo "------ repo root dir: " $REPO_ROOT_DIR
echo "------ templates dir: " $TEMPLATE_DIR
echo "------ fx-core api-connector dir: " $FX_CORE_API_CONNECTOR_CONFIG_DIR

if [ $1 == 'templates' ]; then
    if [[ $SkipSyncup == *"template"* ]]; then
        echo "skip sync up templates version with sdk version"
    elif [[ -z "$(git diff -- ../../templates)" ]]; then
        echo "need bump up templates version since templates do not bump up by themselves"
        node ../../.github/scripts/sdk-sync-up-version.js sdk yes;
    else 
        echo "no need to bump up templates version"
        node ../../.github/scripts/sdk-sync-up-version.js sdk
    fi
    git add ../../templates
elif [ $1 == 'fx-core' ]; then
    if [[ -z "$(git diff -- ../fx-core)" ]]; then
        echo "need bump up fx-core version since fx-core does not bump up by itself"
        node ../../.github/scripts/sync-up-dotnet-ver.js yes;
    else 
        echo "no need to bump up templates version"
        node ../../.github/scripts/sync-up-dotnet-ver.js
    fi
    git add ../fx-core
elif [ $1 == 'function-extension' ]; then   
    if [[ -z "$(git diff -- ../../templates)" ]]; then
        echo "need to bump up templates version since templates do not bump up by themselves"
        node ../../.github/scripts/sync-up-dotnet-ver.js yes
    else 
        echo "no need to bump up templates version"
        node ../../.github/scripts/sync-up-dotnet-ver.js
    fi
    git add ../../templates
elif [ $1 == 'core-template' ]; then
    echo "need to bump up templates' fallback version in fx-core"
    node ../.github/scripts/fxcore-sync-up-version.js
    git add ../packages/fx-core
elif [ $1 == 'template-adaptive-card' ]; then
    if [[ $SkipSyncup == *"template"* ]]; then
        echo "skip sync up templates version with adaptive-card version"
    elif [[ -z "$(git diff -- ../../templates)" ]]; then
        echo "need bump up templates version since templates do not bump up by themselves"
        node ../../.github/scripts/sdk-sync-up-version.js adaptivecards-tools-sdk yes;
    else 
        echo "no need to bump up templates version"
        node ../../.github/scripts/sdk-sync-up-version.js adaptivecards-tools-sdk
    fi
    git add ../../templates
else [ $1 == 'template-sync' ]; then
    echo "sync up templates deps' version with all the lerna pkgs"
    node $SCRIPT_DIR/sync-version.js
    git add .
elif [ $1 == 'api-connector-sync' ]; then
    echo "sync up api connector config version with sdk"
    node $SCRIPT_DIR/sync-version.js $FX_CORE_API_CONNECTOR_CONFIG_DIR
    git add .
fi