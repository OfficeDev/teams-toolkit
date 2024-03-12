# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.3/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: v1.3

deploy:
  # Install development tool(s)
  - uses: devTool/install
    with:
      testTool:
        version: ~0.1.0-beta
        symlinkDir: ./devTools/teamsapptester

  # Run npm command
  - uses: cli/runNpmCommand
    with:
      args: install --no-audit

  # Generate runtime environment variables
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: ./.localConfigs.testTool
      envs:
        {{#useOpenAI}}
        OPENAI_API_KEY: ${{SECRET_OPENAI_API_KEY}}
        {{/useOpenAI}}
        {{#useAzureOpenAI}}
        AZURE_OPENAI_API_KEY: ${{SECRET_AZURE_OPENAI_API_KEY}}
        AZURE_OPENAI_ENDPOINT: ${{AZURE_OPENAI_ENDPOINT}}
        AZURE_OPENAI_DEPLOYMENT: ${{AZURE_OPENAI_DEPLOYMENT}}
        {{/useAzureOpenAI}}
        TEAMSFX_NOTIFICATION_STORE_FILENAME: ${{TEAMSFX_NOTIFICATION_STORE_FILENAME}}