# Built-in environment variables
TEAMSFX_ENV=dev

# Updating AZURE_SUBSCRIPTION_ID or AZURE_RESOURCE_GROUP_NAME after provision may also require an update to RESOURCE_SUFFIX, because some services require a globally unique name across subscriptions/resource groups.
AZURE_SUBSCRIPTION_ID=
AZURE_RESOURCE_GROUP_NAME=
RESOURCE_SUFFIX=

# Generated during provision, you can also add your own variables.
TEAMS_APP_ID=
AAD_APP_CLIENT_ID=
AAD_APP_OBJECT_ID=
AAD_APP_OAUTH2_PERMISSION_ID=
AAD_APP_TENANT_ID=
AAD_APP_OAUTH_AUTHORITY_HOST=
AAD_APP_OAUTH_AUTHORITY=
TAB_AZURE_STORAGE_RESOURCE_ID=
TAB_ENDPOINT=
M365_CLIENT_ID=
M365_CLIENT_SECRET=
M365_TENANT_ID=
M365_OAUTH_AUTHORITY_HOST=

# Secrets. You can add your own secret value, prefixed with SECRET_
SECRET_AAD_APP_CLIENT_SECRET=