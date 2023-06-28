#!/bin/bash
oss=`jq -r 'keys[]' $1`
result='{"include": []}'

while IFS= read -r os;
do
  nodes=`jq -r --arg os $os '.[$os] | keys[]' $1`
  while IFS= read -r node;
  do
    cases=`jq -r --arg os $os --arg node $node '.[$os] | .[$node] | .[]' $1`
    while IFS= read -r case;
    do
      result=`echo $result | jq --arg os $os --arg node ${node/"node-"/""} --arg case $case '.include += [{"os":$os, "node-version": $node, "test-case": $case}]'`
    done <<< $cases
  done <<< $nodes
done <<< $oss
SCRIPT_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)
echo $result > $SCRIPT_DIR/test-case-temp.json
