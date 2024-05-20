{
  "profiles": {
{{^isNewProjectTypeEnabled}}
    "Copilot (browser)": {
      "commandName": "Project",
      "commandLineArgs": "host start --port 5130 --pause-on-error",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "https://www.office.com/chat?auth=2&cspoff=1&M365ChatFeatures=immersive-bizchat-avalon-endpoint%2cimmersive-bizchat-sydney-response-unpack-v2%2c-immersive-bizchat-send-conv-id-for-new-chat%2c-immersive-bizchat-handoff-buttons%2c-immersive-bizchat-enable-calendar-handoff%2c-immersive-bizchat-analytics-skill%2cimmersive-bizchat-enable-sydney-verbosity%2c-immersive-bizchat-chat-input-transform-spo-file-url%2cimmersive-bizchat-gpt",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "hotReloadProfile": "aspnetcore"
    }
    //// Uncomment following profile to debug project only (without launching Teams)
    //,
    //"Start Project (not in Teams)": {
    //  "commandName": "Project",
    //  "commandLineArgs": "host start --port 5130 --pause-on-error",
    //  "dotnetRunMessages": true,
    //  "applicationUrl": "https://localhost:7130;http://localhost:5130",
    //  "environmentVariables": {
    //    "ASPNETCORE_ENVIRONMENT": "Development"
    //  },
    //  "hotReloadProfile": "aspnetcore"
    //}
{{/isNewProjectTypeEnabled}}
{{#isNewProjectTypeEnabled}}
    "Start Project": {
      "commandName": "Project",
      "commandLineArgs": "host start --port 5130 --pause-on-error",
      "dotnetRunMessages": true,
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "hotReloadProfile": "aspnetcore"
    }
{{/isNewProjectTypeEnabled}}
  }
}
