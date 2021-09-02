#!/bin/bash
# clientId=$(echo $creds | jq -r '.clientId')
# clientSecret=$(echo $creds | jq -r '.clientSecret')
# subscriptionId=$(echo $creds | jq -r '.subscriptionId')
# tenantId=$(echo $creds | jq -r '.tenantId')
# tokencc=$(curl -X POST -F "grant_type=client_credentials" -F "client_id=$clientId" -F "client_secret=$clientSecret" -F "scope=https://vault.azure.net/.default" "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" | jq -r '.access_token') 
if [ $1 == 'e2e' ]; then
declare -A E2EMap=(["E2E-AZURE-ACCOUNT-NAME"]="AZURE_ACCOUNT_NAME" ["E2E-AZURE-ACCOUNT-PASSWORD"]="AZURE_ACCOUNT_PASSWORD"\
 ["E2E-AZURE-SUBSCRIPTION-ID"]="AZURE_SUBSCRIPTION_ID" ["E2E-AZURE-TENANT-ID"]="AZURE_TENANT_ID" ["M365_ACCOUNT_NAME"]="E2E-M365-ACCOUNT-NAME" \
 ["E2E-M365-ACCOUNT-PASSWORD"]="M365_ACCOUNT_PASSWORD" ["E2E-M365-TENANT-ID"]="M365_TENANT_ID" ["E2E-TEST-COLLABORATOR-USER-NAME"]="M365_ACCOUNT_COLLABORATOR")
# value=$(curl -H 'Accept: application/json' -H "Authorization: Bearer $tokencc" https://e2etestenv.vault.azure.net/secrets/$1?api-version=2016-10-01 |jq -r '.value')
# echo value
for key in ${!E2EMap[*]}; do
    echo $key
    echo ${E2EMap[$key]}
done
elif [ $1 == 'simpleauth']; then

elif [ $1 == 'function-extension' ]; then
fi
