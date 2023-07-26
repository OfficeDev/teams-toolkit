# yaml-language-server: $schema=https://aka.ms/teams-toolkit/1.0.0/yaml.schema.json
version: 1.0.0

provision:  
  # Creates a Teams app
  - uses: teamsApp/create
    with:
      # Teams app name
      name: {{appName}}-${{TEAMSFX_ENV}}
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID  

  - uses: script # Set required variables for local launch
    with:
      run:
        echo "::set-teamsfx-env FUNC_NAME=repair";
        echo "::set-teamsfx-env FUNC_ENDPOINT=http://localhost:7071";
        
  # Validate using manifest schema
  - uses: teamsApp/validateManifest
    with:
      # Path to manifest template
      manifestPath: ./appPackage/manifest.json
  # Build Teams app package with latest env value
  - uses: teamsApp/zipAppPackage
    with:
      # Path to manifest template
      manifestPath: ./appPackage/manifest.json
      outputZipPath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./appPackage/build/manifest.${{TEAMSFX_ENV}}.json
  # Validate app package using validation rules
  - uses: teamsApp/validateAppPackage
    with:
      # Relative path to this file. This is the path for built zip file.
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
  # Apply the Teams app manifest to an existing Teams app in
  # Teams Developer Portal.
  # Will use the app id in manifest file to determine which Teams app to update.
  - uses: teamsApp/update
    with:
      # Relative path to this file. This is the path for built zip file.
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip

deploy:
  # Install development tool(s)
  - uses: devTool/install
    with:
      devCert:
        trust: true
      func:
        version: ~4.0.4670
        symlinkDir: ./devTools/func
    # Write the information of installed development tool(s) into environment
    # file for the specified environment variable(s).
    writeToEnvironmentFile:
      sslCertFile: SSL_CRT_FILE
      sslKeyFile: SSL_KEY_FILE
      dotnetPath: DOTNET_PATH
      funcPath: FUNC_PATH


  # Run npm command
  - uses: cli/runNpmCommand
    with:
      args: install --no-audit