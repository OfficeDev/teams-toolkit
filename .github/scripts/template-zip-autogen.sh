#!/usr/bin/env bash
set -x

cd ./templates/

for SCOPE_PATH in */; do
    SCOPE=$(echo $SCOPE_PATH | tr -d "/")
    if [ $SCOPE = "node_modules" ]; then
        continue
    fi
    for LANGUAGE_PATH in ${SCOPE_PATH}*/; do
        for SCENARIO_PATH in ${LANGUAGE_PATH}*/; do
            TEMPLATE=($(echo $SCENARIO_PATH | tr "/" "\n"))
            LANGUAGE=${TEMPLATE[1]}
            SCENARIO=${TEMPLATE[2]}
            cd ./${SCOPE}/${LANGUAGE}/${SCENARIO}
            zip -rq ../../../../${SCOPE}.${LANGUAGE}.${SCENARIO}.zip .
            cd -
        done
    done
done