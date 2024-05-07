# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.5/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: v1.5

deploy:
  # Install development tool(s)
  - uses: devTool/install
    with:
      testTool:
        version: ~0.2.1
        symlinkDir: ./devTools/teamsapptester

  # Generate runtime environment variables
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: ./.env
      envs:
        TEAMSFX_NOTIFICATION_STORE_FILENAME: ${{TEAMSFX_NOTIFICATION_STORE_FILENAME}}
        BOT_ID: ""
        BOT_PASSWORD: ""
        {{#useAzureOpenAI}}
        AZURE_OPENAI_API_KEY: ${{SECRET_AZURE_OPENAI_API_KEY}}
        AZURE_OPENAI_MODEL_DEPLOYMENT_NAME: ${{AZURE_OPENAI_MODEL_DEPLOYMENT_NAME}}
        AZURE_OPENAI_ENDPOINT: ${{AZURE_OPENAI_ENDPOINT}}
        AZURE_OPENAI_EMBEDDING_DEPLOYMENT: ${{AZURE_OPENAI_EMBEDDING_DEPLOYMENT}}
        {{/useAzureOpenAI}}
        {{#useOpenAI}}
        OPENAI_API_KEY: ${{SECRET_OPENAI_API_KEY}}
        {{/useOpenAI}}
        AZURE_SEARCH_KEY: ${{SECRET_AZURE_SEARCH_KEY}}
        AZURE_SEARCH_ENDPOINT: ${{AZURE_SEARCH_ENDPOINT}}
