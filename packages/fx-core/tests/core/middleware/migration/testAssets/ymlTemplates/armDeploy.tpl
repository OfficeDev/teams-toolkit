  - uses: arm/deploy # Deploy given ARM templates parallelly.
    with:
      subscriptionId: ${{AZURE_SUBSCRIPTION_ID}} # The AZURE_SUBSCRIPTION_ID is a built-in environment variable. TeamsFx will ask you select one subscription if its value is empty. You're free to reference other environment varialbe here, but TeamsFx will not ask you to select subscription if it's empty in this case.
      resourceGroupName: ${{AZURE_RESOURCE_GROUP_NAME}} # The AZURE_RESOURCE_GROUP_NAME is a built-in environment variable. TeamsFx will ask you to select or create one resource group if its value is empty. You're free to reference other environment varialbe here, but TeamsFx will not ask you to select or create resource grouop if it's empty in this case.
      templates:
       - path: ./templates/azure/main.bicep # Relative path to this file
         parameters: ./templates/azure/azure.parameters.${{TEAMSFX_ENV}}.json # Relative path to this file. Placeholders will be replaced with corresponding environment variable before ARM deployment.
         deploymentName: teams_toolkit_deployment # Required when deploy ARM template
      bicepCliVersion: v0.4.613 # Teams Toolkit will download this bicep CLI version from github for you, will use bicep CLI in PATH if you remove this config.