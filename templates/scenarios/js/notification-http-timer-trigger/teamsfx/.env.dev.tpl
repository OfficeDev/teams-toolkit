# Built-in environment variables
TEAMSFX_ENV=dev
TEAMS_APP_NAME={%appName%}
# Updating AZURE_SUBSCRIPTION_ID or AZURE_RESOURCE_GROUP_NAME after provision may also require an update to RESOURCE_SUFFIX, because some services require a globally unique name across subscriptions/resource groups.
AZURE_SUBSCRIPTION_ID=
AZURE_RESOURCE_GROUP_NAME=
RESOURCE_SUFFIX=

# Generated during provision, you can also add your own variables. If you're adding a secret value, add SECRET_ prefix to the name so Teams Toolkit can handle them properly
BOT_ID=
SECRET_BOT_PASSWORD=
TEAMS_APP_ID=
BOT_AZURE_FUNCTION_APP_RESOURCE_ID=
BOT_DOMAIN=
BOT_FUNCTION_ENDPOINT=