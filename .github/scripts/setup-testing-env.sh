#!/bin/bash
clientId=$(echo $creds | jq -r '.clientId')
clientSecret=$(echo $creds | jq -r '.clientSecret')
subscriptionId=$(echo $creds | jq -r '.subscriptionId')
tenantId=$(echo $creds | jq -r '.tenantId')
token=$(curl -X POST -F "grant_type=client_credentials" -F "client_id=$clientId" -F "client_secret=$clientSecret" -F "scope=https://vault.azure.net/.default" "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" | jq -r '.access_token') 
if [ $1 == 'e2e' ]; then
declare -A E2EMap=(["E2E-AZURE-ACCOUNT-NAME"]="AZURE_ACCOUNT_NAME" ["E2E-AZURE-ACCOUNT-PASSWORD"]="AZURE_ACCOUNT_PASSWORD"\
 ["E2E-AZURE-SUBSCRIPTION-ID"]="AZURE_SUBSCRIPTION_ID" ["E2E-AZURE-TENANT-ID"]="AZURE_TENANT_ID" ["E2E-M365-ACCOUNT-NAME"]="M365_ACCOUNT_NAME" \
 ["E2E-M365-ACCOUNT-PASSWORD"]="M365_ACCOUNT_PASSWORD" ["E2E-M365-TENANT-ID"]="M365_TENANT_ID" ["E2E-TEST-COLLABORATOR-USER-NAME"]="M365_ACCOUNT_COLLABORATOR")
for key in ${!E2EMap[*]}; do
    value=$(curl -H 'Accept: application/json' -H "Authorization: Bearer $token" "https://e2etestenv.vault.azure.net/secrets/$key?api-version=2016-10-01" |jq -r '.value')
    echo "${E2EMap[$key]}=$value" >> $2
done
elif [ $1 == 'simpleauth' ]; then
declare -A SimpleAuthMap=(["SIMPLE-AUTH-TEST-ADMIN-CLIENT-ID"]="TEAMS_SIMPLE_AUTH_IntegrationTestSettings__AdminClientId" ["SIMPLE-AUTH-TEST-ADMIN-CLIENT-SECRET"]="TEAMS_SIMPLE_AUTH_IntegrationTestSettings__AdminClientSecret"\
 ["SIMPLE-AUTH-TEST-TENANT-ID"]="TEAMS_SIMPLE_AUTH_IntegrationTestSettings__TenantId" ["SIMPLE-AUTH-TEST-USER-NAME"]="TEAMS_SIMPLE_AUTH_IntegrationTestSettings__TestUserName" ["SIMPLE-AUTH-TEST-PASSWORD"]="TEAMS_SIMPLE_AUTH_IntegrationTestSettings__TestPassword"\
 ["SIMPLE-AUTH-TEST-USER-NAME-2"]="TEAMS_SIMPLE_AUTH_IntegrationTestSettings__TestUserName2" ["SIMPLE-AUTH-TEST-PASSWORD-2"]="TEAMS_SIMPLE_AUTH_IntegrationTestSettings__TestPassword2") 
for key in ${!SimpleAuthMap[*]}; do
    value=$(curl -H 'Accept: application/json' -H "Authorization: Bearer $token" "https://e2etestenv.vault.azure.net/secrets/$key?api-version=7.0" |jq -r '.value')
    echo "${SimpleAuthMap[$key]}=$value" >> $2
done
elif [ $1 == 'function-extension' ]; then
declare -A FuncExtMap=(["FUNCTION-EXTENSION-CLIENTID"]="TeamsFx_BINDING_IntegrationTestSettings__ClientId" ["FUNCTION-EXTENSION-CLIENT-SECRET"]="TeamsFx_BINDING_IntegrationTestSettings__ClientSecret"\
 ["FUNCTION-EXTENSION-UNAUTHORIZED-AAD-APP-CLIENT-ID"]="TeamsFx_BINDING_IntegrationTestSettings__UnauthorizedAadAppClientId" ["FUNCTION-EXTENSION-UNAUTHORIZED-AAD-APP-CLIENT-SECRET"]="TeamsFx_BINDING_IntegrationTestSettings__UnauthorizedAadAppClientSecret" ["FUNCTION-EXTENSION-ALLOWED-APP-CLIENT-ID"]="TeamsFx_BINDING_IntegrationTestSettings__AllowedAppClientId"\
 ["FUNCTION-EXTENSION-ALLOWED-APP-CLIENT-SECRET"]="TeamsFx_BINDING_IntegrationTestSettings__AllowedAppClientSecret" ["FUNCTION-EXTENSION-AUTHORITY-HOST"]="TeamsFx_BINDING_IntegrationTestSettings__AuthorityHost" [""]="TeamsFx_BINDING_IntegrationTestSettings__TenantId") 
for key in ${!FuncExtMap[*]}; do
    value=$(curl -H 'Accept: application/json' -H "Authorization: Bearer $token" "https://e2etestenv.vault.azure.net/secrets/$key?api-version=7.0" |jq -r '.value')
    echo "${SimpleAuthMap[$key]}=$value" >> $2
done
fi
