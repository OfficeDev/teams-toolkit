# This file includes environment variables that will not be committed to git by default. You can set these environment variables in your CI/CD system for your project.

# If you're adding a secret value, add SECRET_ prefix to the name so Teams Toolkit can handle them properly
# Secrets. Keys prefixed with `SECRET_` will be masked in Teams Toolkit logs.
{{#openAIKey}}
SECRET_OPENAI_API_KEY='{{{openAIKey}}}'
{{/openAIKey}}
{{^openAIKey}}
SECRET_OPENAI_API_KEY=' '
{{/openAIKey}}
SECRET_OPENAI_ASSISTANT_ID=' ' # See README.md for how to fill in this value.