# This file includes environment variables that will not be committed to git by default. You can set these environment variables in your CI/CD system for your project.

# If you're adding a secret value, add SECRET_ prefix to the name so Teams Toolkit can handle them properly
# Secrets. Keys prefixed with `SECRET_` will be masked in Teams Toolkit logs.
{{#useOpenAI}}
{{#openAIKey}}
SECRET_OPENAI_API_KEY='{{{openAIKey}}}'
{{/openAIKey}}
{{^openAIKey}}
SECRET_OPENAI_API_KEY=<openai-api-key>
{{/openAIKey}}
SECRET_OPENAI_MODEL_DEPLOYMENT_NAME=<openai-model-development-name>
{{/useOpenAI}}
{{#useAzureOpenAI}}
{{#azureOpenAIKey}}
SECRET_AZURE_OPENAI_API_KEY='{{{azureOpenAIKey}}}'
{{/azureOpenAIKey}}
{{^azureOpenAIKey}}
SECRET_AZURE_OPENAI_API_KEY=<azure-openai-api-key>
{{/azureOpenAIKey}}
SECRET_AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=<azure-openai-model-development-name>
{{#azureOpenAIEndpoint}}
SECRET_AZURE_OPENAI_ENDPOINT='{{{azureOpenAIEndpoint}}}'
{{/azureOpenAIEndpoint}}
{{^azureOpenAIEndpoint}}
SECRET_AZURE_OPENAI_ENDPOINT=<azure-openai-endpoint>
{{/azureOpenAIEndpoint}}
{{/useAzureOpenAI}}