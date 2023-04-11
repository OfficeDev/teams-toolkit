  - uses: m365Title/acquire # Upload your app to Outlook and the Microsoft 365 app
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to the built app package.
    writeToEnvironmentFile: # Write the information of created resources into environment file for the specified environment variable(s).
      titleId: M365_TITLE_ID
      appId: M365_APP_ID