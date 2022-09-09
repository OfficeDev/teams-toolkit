#!/bin/bash
VAR=$@
echo ============= Inputs: $VAR ================
stringarray=($VAR)
if [ -z $stringarray ]; then
    echo "for all the pkgs"
    exit 0
else 
    git update-index --assume-unchanged "lerna.json"
    content=$(jq ".common" .github/scripts/lernaDeps.json)
    for i in "${stringarray[@]}"
    do :
        echo package name: $i
        if [ $(jq --arg v "$i" 'has($v)' .github/scripts/lernaDeps.json) == 'false' ]; then
            echo "Get Error Inputs:" $i
            exit -1
        fi
        pkgContent=$(jq --arg a "$i" '.[$a]' -r .github/scripts/lernaDeps.json)
        content=$(jq --argjson arr1 "$content" --argjson arr2 "$pkgContent" -n '$arr1 + $arr2 | unique')
    done
    echo ======== deps: $content ==========
    lernaBase=$(jq 'del(.packages)' lerna.json)
    jq --argjson arr1 "$content" --argjson arr2 "$lernaBase" -n '$arr2 + {"packages": $arr1}' > tmp.$$.json
    mv tmp.$$.json lerna.json
    cat lerna.json
fi