#!/bin/bash
set -xue

DISPLAY_NUM=1
ENV_FILE=.env.wsl2
HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2; exit;}')

# append or replace
if grep 'DISPLAY=' < ${ENV_FILE}; then
    sed -i "s/DISPLAY=.*/DISPLAY=${HOST}:${DISPLAY_NUM}/g" ${ENV_FILE}
else
    echo "DISPLAY=${HOST}:${DISPLAY_NUM}" >> ${ENV_FILE}
fi