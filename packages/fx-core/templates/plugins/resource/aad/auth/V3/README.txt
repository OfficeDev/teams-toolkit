//Full content, plan to be put in Github wiki page
Enable Single Sign-on for Teams Applications
-------------------------

On click of Visual Studio menu Project -> Teams Toolkit -> Add Authentication Code, couple of files for Single Sign-on are generated in "TeamsFx-Auth" folder, including a manifest template file for Azure AD application and authentication redirect pages.  

Teams Toolkit helps you generate the authentication files, then you will need to link the files to your Teams application by updating authentication configurations to make sure the Single Sign-on works for your application. Please be noted that for different Teams application type like Tab or Bot, the detailed steps are slightly different.

Basically you will need take care these configurations: 

* In the Azure AD manifest file, you need to specify URIs such as the URI to identify the Azure AD authentication app and the redirect URI for returning token. 
* In the Teams manifest file, add the SSO application to link it with Teams application. 
* Add SSO application information in Teams Toolkit configuration files in order to make sure the authentication app can be registered on backend service and started by Teams Toolkit when you debugging or previewing Teams application.

For Teams Tab Application
-------------------------
1. Update AAD app manifest
  A template of Azure AD app is provided in `TeamsFx-Auth/aad.manifest.template.json`.
  You can copy and paste this file to any folder of your project and take notes of the path to this file. Because the path will be useful later.
  You need to make some updates on the following two parts in the template to create/update an Azure AD app for SSO:

  1.1. "identifierUris": Used to uniquely identify and access the resource.
    [HelpLink] "https://learn.microsoft.com/en-us/azure/active-directory/develop/reference-app-manifest#identifieruris-attribute"
    
    You need to set correct Redirect Uris into "identifierUris" for successfully identify this app.
    For example:
    ```
    "identifierUris":[
      "api://tab-domian/${{AAD_APP_CLIENT_ID}}"
    ]
    ```
    Note: You can use use ${{ENV_NAME}} to reference variables in `teamsfx/.env.{TEAMSFX_ENV}`.

    -------------------------
    Example for TeamsFx Tab template
    -------------------------
    ```
    "identifierUris":[
      "api://${{TAB_DOMAIN}}/${{AAD_APP_CLIENT_ID}}"
    ]
    ```
    -------------------------
    

  1.2. "replyUrlsWithType": List of registered redirect_uri values that Azure AD will accept as destinations when returning tokens.
    [HelpLink] https://learn.microsoft.com/en-us/azure/active-directory/develop/reference-app-manifest#replyurlswithtype-attribute
    
    You need to set necessary Redirect Uris into "replyUrlsWithType" for successfully returning token.
    For example:
    ```
    "replyUrlsWithType":[
      {
        "url": "${{TAB_ENDPOINT}}/auth-end.html",
        "type": "Web"
      }
    ]
    ```
    Note: You can use ${{ENV_NAME}} to reference envs in `teamsfx/.env.{TEAMSFX_ENV}`.

    -------------------------
    Example for TeamsFx Tab template
    -------------------------
    ```
    "replyUrlsWithType":[
      {
        "url": "${{TAB_ENDPOINT}}/auth-end.html",
        "type": "Web"
      },
      {
        "url": "${{TAB_ENDPOINT}}/auth-end.html?clientId=${{AAD_APP_CLIENT_ID}}",
        "type": "Spa"
      },
      {
        "url": "${{TAB_ENDPOINT}}/blank-auth-end.html",
        "type": "Spa"
      }
    ]
    ```
    -------------------------

  1.3. "name": Replace the value with your expected AAD app name.

2. Update Teams app manifest
  Open your Teams app manifest file, add a `WebApplicationInfo` object with the value of your SSO app.
  [HelpLink] https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#webapplicationinfo
  
  For example:
  ```
  "webApplicationInfo": {
    "id": "${{AAD_APP_CLIENT_ID}}",
    "resource": "SAME_AS_YOUR_IDENTIFIERURIS"
  }
  ```
  Note: update the value of resource to your `identifierUris` configed in step 1.1, and use ${{ENV_NAME}} to reference envs in `teamsfx/.env.{TEAMSFX_ENV}`.

  -------------------------
  Example for TeamsFx Tab template
  -------------------------
  Open `appPackage/manifest.template.json`, and append the following object in the manifest:
  ```
  "webApplicationInfo": {
    "id": "${{AAD_APP_CLIENT_ID}}",
    "resource": "api://${{TAB_DOMAIN}}/${{AAD_APP_CLIENT_ID}}"
  }
  ```
  -------------------------

3. Update `teamsfx/app.yml` and `teamsfx/app.local.yml`
  AAD related changes and configs needs to be added into your `yml` files:
    - add `aadApp/create` under 'registerApp':
      For creating new AAD apps used for SSO.
      [HelpLink] https://aka.ms/teamsfx-actions/aadapp-create
    - add `aadApp/update` under 'configureApp'
      For updating your AAD app with AAD app manifest in step 1.
      [HelpLink] https://aka.ms/teamsfx-actions/aadapp-update
    - update `appsettings/generate`
      For adding following environment variables when local debug:
        a. ClientId: AAD app client id
        b. ClientSecret: AAD app client secret
        c. OAuthAuthority: AAD app oauth authority
      [HelpLink] https://aka.ms/teamsfx-actions/appsettings-generate

  -------------------------
  Example for TeamsFx Tab template
  -------------------------
  In both `teamsfx/app.yml` and 'teamsfx/app.local.yml':
    - Add following lines under `registerApp` to create AAD app.
      ```
      - uses: aadApp/create # Creates a new AAD app to authenticate users if AAD_APP_CLIENT_ID environment variable is empty
        with:
          name: "YOUR_AAD_APP_NAME" # Note: when you run configure/aadApp, the AAD app name will be updated based on the definition of manifest. If you don't want to change the name, ensure the name in AAD manifest is same with the name defined here.
          generateClientSecret: true # If the value is false, the action will not generate client secret for you
        # Output: following environment variable will be persisted in current environment's .env file.
        # AAD_APP_CLIENT_ID: the client id of AAD app
        # AAD_APP_CLIENT_SECRET: the client secret of AAD app
        # AAD_APP_OBJECT_ID: the object id of AAD app
        # AAD_APP_TENANT_ID: the tenant id of AAD app
        # AAD_APP_OAUTH_AUTHORITY_HOST: the host of OAUTH authority of AAD app
        # AAD_APP_OAUTH_AUTHORITY: the OAUTH authority of AAD app
      ```
      Note: Replace the value of "name" with your expected AAD app name.
    
    - Add following lines under `configureApp` to configure AAD app with AAD app template in the step 1.
      ```
      - uses: aadApp/update # Apply the AAD manifest to an existing AAD app. Will use the object id in manifest file to determine which AAD app to update.
        with:
          manifestTemplatePath: "YOUR_PATH_TO_AAD_APP_MANIFEST" # Relative path to teamsfx folder. Environment variables in manifest will be replaced before apply to AAD app
          outputFilePath : ./build/aad.manifest.${{TEAMSFX_ENV}}.json
      # Output: following environment variable will be persisted in current environment's .env file.
      # AAD_APP_ACCESS_AS_USER_PERMISSION_ID: the id of access_as_user permission which is used to enable SSO
      ```
      Note: Replace the value of "manifestTemplatePath" with the relative path of AAD app manifest noted in step 1.
            For example, './aad.manifest.template.json'

  In `teamsfx/app.local.yml` only:
    - Add following lines under `configureApp` to add AAD related configs to local debug service.
      ```
      - uses: appsettings/generate
        with:
          target: ./appsettings.Development.json
          appsettings:
            TeamsFx:
              Authentication:
                ClientId: ${{AAD_APP_CLIENT_ID}}
                ClientSecret: ${{SECRET_AAD_APP_CLIENT_SECRET}}
                OAuthAuthority: ${{AAD_APP_OAUTH_AUTHORITY}}
      ```
  -------------------------

4. Update Infra
  AAD related configs needs to be configured in your remote service. Following example shows the configs on Azure Webapp.
    a. TeamsFx__Authentication__ClientId: AAD app client id
    b. TeamsFx__Authentication__ClientSecret: AAD app client secret
    c. TeamsFx__Authentication__OAuthAuthority: AAD app oauth authority
  
  -------------------------
  Example for TeamsFx Tab template
  -------------------------
  Open `infra/azure.parameter.json` and add following lines into `parameters`:
  ```
  "tabAadAppClientId": {
    "value": "${{AAD_APP_CLIENT_ID}}"
  },
  "tabAadAppClientSecret": {
    "value": "${{SECRET_AAD_APP_CLIENT_SECRET}}"
  },
  "tabAadAppOauthAuthorityHost": {
    "value": "${{AAD_APP_OAUTH_AUTHORITY_HOST}}"
  },
  "tabAadAppTenantId": {
    "value": "${{AAD_APP_TENANT_ID}}"
  }
  ```

  Open `infra/azure.bicep` find follow line:
  ```
  param location string = resourceGroup().location
  ```
  and add following lines:
  ```
  param tabAadAppClientId string
  param tabAadAppOauthAuthorityHost string
  param tabAadAppTenantId string
  @secure()
  param tabAadAppClientSecret string
  ```
  and add following configs in webApp.properties.siteConfig.appSettings
  ```
  {
    name: 'TeamsFx__Authentication__ClientId'
    value: tabAadAppClientId
  }
  {
    name: 'TeamsFx__Authentication__ClientSecret'
    value: tabAadAppClientSecret
  }
  {
    name: 'TeamsFx__Authentication__OAuthAuthority'
    value: uri(tabAadAppOauthAuthorityHost, tabAadAppTenantId)
  }
  ```
  -------------------------

5. Update `appsettings.json` and `appsettings.Development.json`
  AAD related configs needs to be configure to your .Net project settings:
    ```
    TeamsFx: {
      Authentication: {
        ClientId: AAD app client id
        ClientSecret: AAD app client secret,
        OAuthAuthority: AAD app oauth authority
      }
    }
    ```
  Note: You can use use $ENV_NAME$ to reference envs in local/remote service.

  -------------------------
  Example for TeamsFx Tab template
  -------------------------
  Open `appsettings.json` and `appsettings.Development.json`, and append the following lines:
  ```
  "TeamsFx": {	
    "Authentication": {	
      "ClientId": "$clientId$",	
      "ClientSecret": "$client-secret$",	
      "OAuthAuthority": "$oauthAuthority$"	
    }	
  }
  ```
  -------------------------

6. Update source code
  With all changes above, your environment is ready and can update your code to add SSO to your Teams app.
  You can find samples in following pages:
    - TeamsFx SDK: https://www.nuget.org/packages/Microsoft.TeamsFx/
    - Sample Code: under `TeamsFx-Auth/Tab`
  
  -------------------------
  Example for TeamsFx Tab template
  -------------------------
  1) Create `Config.cs` and paste the following code:
    ```
    using Microsoft.TeamsFx.Configuration;

    namespace {{YOUR_NAMESPACE}}
    {
        public class ConfigOptions
        {
            public TeamsFxOptions TeamsFx { get; set; }
        }
        public class TeamsFxOptions
        {
            public AuthenticationOptions Authentication { get; set; }
        }
    }
    ```
    Note: You need to replace {{YOUR_NAMESPACE}} with your namespace name
  
  2) Move `TeamsFx-Auth/Tab/GetUserProfile.razor` to `Components/`
  3) Find following line in `Component/Welcome.razor`:
    ```
    <AddSSO />
    ```
    and replace with:
    ```
    <GetUserProfile />
    ```

  4) Open `Program.cs`, find following line:
    ```
    builder.Services.AddScoped<MicrosoftTeams>();
    ```
    and add following code after:
    ```
    var config = builder.Configuration.Get<ConfigOptions>();
    builder.Services.AddTeamsFx(config.TeamsFx.Authentication);
    ```

  Note: You need to exclude the sample code under `TeamsFx-Auth` to avoid build failure by adding following lines into your `.csproj` file:
  ```
  <ItemGroup>
    <Compile Remove="TeamsFx-Auth/**/*" />
    <None Include="TeamsFx-Auth/**/*" />
    <Content Remove="TeamsFx-Auth/Tab/GetUserProfile.razor"/>
  </ItemGroup>
  ```
  -------------------------

7. To check the SSO app works as expected, run `Local Debug` in Visual Studio. Or run the app in cloud by clicking `Provision in the cloud` and then `Deploy to the cloud` to make the updates taking effects.

For Bot projects
-------------------------
1. Update AAD app manifest
  A template of Azure AD app is provided in `TeamsFx-Auth/aad.manifest.template.json`.
  You can copy and paste this file in your project and note the path of this file. This path will be used later.
  You still need to make some updates on the following two parts in the template to create/update an AAD app for SSO:

  1.1 "identifierUris": Used to uniquely identify and access the resource.
    [HelpLink] "https://learn.microsoft.com/en-us/azure/active-directory/develop/reference-app-manifest#identifieruris-attribute"
    
    You need to set correct Redirect Uris into "identifierUris" for successfully identify this app.
    For example:
    ```
    "identifierUris":[
      "api://botid-${{BOT_ID}}"
    ]
    ```
    Note: You can use use ${{ENV_NAME}} to reference variables in `teamsfx/.env.{TEAMSFX_ENV}`.

    -------------------------
    Example for TeamsFx Bot template
    -------------------------
    ```
    "identifierUris":[
      "api://botid-${{BOT_ID}}"
    ]
    ```
    -------------------------
    

  1.2 "replyUrlsWithType": List of registered redirect_uri values that Azure AD will accept as destinations when returning tokens.
    [HelpLink] https://learn.microsoft.com/en-us/azure/active-directory/develop/reference-app-manifest#replyurlswithtype-attribute
    
    You need to set necessary Redirect Uris into "replyUrlsWithType" for successfully returning token.
    For example:
    ```
    "replyUrlsWithType":[
      {
        "url": "https://${{BOT_DOMAIN}}/bot-auth-end.html",
        "type": "Web"
      }
    ]
    ```
    Note: You can use use ${{ENV_NAME}} to reference envs in `teamsfx/.env.{TEAMSFX_ENV}`.

    -------------------------
    Example for TeamsFx Tab template
    -------------------------
    ```
    "replyUrlsWithType":[
      {
      "url": "https://${{BOT_DOMAIN}}/bot-auth-end.html",
      "type": "Web"
      }
    ]
    ```
    -------------------------

  1.3 "name": Replace the value with your expected AAD app name.

2. Update Teams app manifest
  
  2.1 A `WebApplicationInfo` object needs to be added into your Teams app manifest to enable SSO in the Teams app.
    [HelpLink] https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#webapplicationinfo
    For example:
    Open your Teams app manifest template, and append the following object in the manifest:
    ```
    "webApplicationInfo": {
      "id": "${{AAD_APP_CLIENT_ID}}",
      "resource": "SAME_AS_YOUR_IDENTIFIERURIS"
    }
    ```
    Note: You need to update the value of resource to your `identifierUris` configed in step 1.1,
      and use ${{ENV_NAME}} to reference envs in `teamsfx/.env.{TEAMSFX_ENV}`.

    -------------------------
    Example for TeamsFx Bot template
    -------------------------
    Open `appPackage/manifest.template.json`, and append the following object in the manifest:
    ```
    "webApplicationInfo": {
      "id": "${{AAD_APP_CLIENT_ID}}",
      "resource": "api://botid-${{BOT_ID}}"
    }
    ```
    -------------------------

  2.2 You can also register your command  under `commands` in `commandLists` of your bot:
    ```
    {
      "title": "YOUR_COMMAND_TITLE",
      "description": "YOUR_COMMAND_DESCRIPTION"
    }
    ```

    -------------------------
    Example for TeamsFx Bot template
    -------------------------
    {
      "title": "show",
      "description": "Show user profile using Single Sign On feature"
    }
    -------------------------

3. Update `teamsfx/app.yml` and `teamsfx/app.local.yml`
  AAD related changes and configs needs to be added into your `yml` files:
    - add `aadApp/create` under 'registerApp':
      For creating new AAD apps used for SSO.
      [HelpLink] https://aka.ms/teamsfx-actions/aadapp-create
    - add `aadApp/update` under 'configureApp'
      For updating your AAD app with AAD app manifest in step 1.
      [HelpLink] https://aka.ms/teamsfx-actions/aadapp-update
    - update `appsettings/generate`
      For adding following environment variables when local debug:
        a. ClientId: AAD app client id
        b. ClientSecret: AAD app client secret
        c. OAuthAuthority: AAD app oauth authority
      [HelpLink] https://aka.ms/teamsfx-actions/appsettings-generate

  -------------------------
  Example for TeamsFx Bot template
  -------------------------
  In both `teamsfx/app.yml` and 'teamsfx/app.local.yml':
    - Add following lines under `registerApp` to create AAD app.
      ```
      - uses: aadApp/create # Creates a new AAD app to authenticate users if AAD_APP_CLIENT_ID environment variable is empty
        with:
          name: "YOUR_AAD_APP_NAME" # Note: when you run configure/aadApp, the AAD app name will be updated based on the definition of manifest. If you don't want to change the name, ensure the name in AAD manifest is same with the name defined here.
          generateClientSecret: true # If the value is false, the action will not generate client secret for you
        # Output: following environment variable will be persisted in current environment's .env file.
        # AAD_APP_CLIENT_ID: the client id of AAD app
        # AAD_APP_CLIENT_SECRET: the client secret of AAD app
        # AAD_APP_OBJECT_ID: the object id of AAD app
        # AAD_APP_TENANT_ID: the tenant id of AAD app
        # AAD_APP_OAUTH_AUTHORITY_HOST: the host of OAUTH authority of AAD app
        # AAD_APP_OAUTH_AUTHORITY: the OAUTH authority of AAD app
      ```
      Note: Replace the value of "name" with your expected AAD app name.
    
    - Add following lines under `configureApp` to configure AAD app with AAD app template in the step 1.
      ```
      - uses: aadApp/update # Apply the AAD manifest to an existing AAD app. Will use the object id in manifest file to determine which AAD app to update.
        with:
          manifestTemplatePath: "YOUR_PATH_TO_AAD_APP_MANIFEST" # Relative path to teamsfx folder. Environment variables in manifest will be replaced before apply to AAD app
          outputFilePath : ./build/aad.manifest.${{TEAMSFX_ENV}}.json
      # Output: following environment variable will be persisted in current environment's .env file.
      # AAD_APP_ACCESS_AS_USER_PERMISSION_ID: the id of access_as_user permission which is used to enable SSO
      ```
      Note: Replace the value of "manifestTemplatePath" with the relative path of AAD app manifest noted in step 1.
            For example, './aad.manifest.template.json'

  In `teamsfx/app.local.yml` only:
    - Update `appsettings/generate` under `provision` to add AAD related configs to local debug service.
      ```
      - uses: appsettings/generate
        with:
          target: ./appsettings.Development.json
          appsettings:
            BOT_ID: ${{BOT_ID}}
            BOT_PASSWORD: ${{SECRET_BOT_PASSWORD}}
            TeamsFx:
              Authentication:
                ClientId: ${{AAD_APP_CLIENT_ID}}
                ClientSecret: ${{SECRET_AAD_APP_CLIENT_SECRET}}
                OAuthAuthority: ${{AAD_APP_OAUTH_AUTHORITY}}/${{AAD_APP_TENANT_ID}}
                ApplicationIdUri: api://botid-${{BOT_ID}}
                Bot:
                  InitiateLoginEndpoint: https://${{BOT_DOMAIN}}/bot-auth-start
      ```
  -------------------------

4. Update Infra
  AAD related configs needs to be configure to your remote service. Following example shows the configs on Azure Webapp.
    a. TeamsFx__Authentication__ClientId: AAD app client id
    b. TeamsFx__Authentication__ClientSecret: AAD app client secret
    c. TeamsFx__Authentication__OAuthAuthority: AAD app oauth authority
    d. TeamsFx__Authentication__Bot__InitiateLoginEndpoint: Auth start page for Bot
    e. TeamsFx__Authentication__ApplicationIdUri: AAD app identify uris

  -------------------------
  Example for TeamsFx Bot template
  -------------------------
  Open `infra/azure.parameter.json` and add following lines into `parameters`:
  ```
  "m365ClientId": {
    "value": "${{AAD_APP_CLIENT_ID}}"
  },
  "m365ClientSecret": {
    "value": "${{SECRET_AAD_APP_CLIENT_SECRET}}"
  },
  "m365TenantId": {
    "value": "${{AAD_APP_TENANT_ID}}"
  },
  "m365OauthAuthorityHost": {
    "value": "${{AAD_APP_OAUTH_AUTHORITY_HOST}}"
  }
  ```

  Open `infra/azure.bicep` find follow line:
  ```
  param location string = resourceGroup().location
  ```
  and add following lines:
  ```
  param m365ClientId string
  param m365TenantId string
  param m365OauthAuthorityHost string
  param m365ApplicationIdUri string = 'api://botid-${botAadAppClientId}'
  @secure()
  param m365ClientSecret string
  ```

  Add following lines before output
  ```
  resource webAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
    name: '${webAppName}/appsettings'
    properties: {
        TeamsFx__Authentication__ClientId: m365ClientId
        TeamsFx__Authentication__ClientSecret: m365ClientSecret
        TeamsFx__Authentication__Bot__InitiateLoginEndpoint: uri('https://${webApp.properties.defaultHostName}', 'bot-auth-start')
        TeamsFx__Authentication__OAuthAuthority: uri(m365OauthAuthorityHost, m365TenantId)
        TeamsFx__Authentication__ApplicationIdUri: m365ApplicationIdUri
        BOT_ID: botAadAppClientId
        BOT_PASSWORD: botAadAppClientSecret
        RUNNING_ON_AZURE: '1'
    }
  }
  ```
  Note: If you want add additional configs to your Azure Webapp, please add the configs in the webAppSettings.
  -------------------------

5. Update `appsettings.json` and `appsettings.Development.json`
  AAD related configs needs to be configure to your .Net project settings:
    ```
    TeamsFx: {
      Authentication: {
        ClientId: AAD app client id
        ClientSecret: AAD app client secret,
        OAuthAuthority: AAD app oauth authority,
        ApplicationIdUri: AAD app identify uri,
        Bot: {
          InitiateLoginEndpoint: Auth start page for Bot
        }
      }
    }
    ```
  Note: You can use use $ENV_NAME$ to reference envs in local/remote service.

  -------------------------
  Example for TeamsFx Bot template
  -------------------------
  Open `appsettings.json` and `appsettings.Development.json`, and append the following lines:
  ```
  "TeamsFx": {
    "Authentication": {
      "ClientId": "$clientId$",
      "ClientSecret": "$client-secret$",
      "OAuthAuthority": "$oauthAuthority$",
      "ApplicationIdUri": "$applicationIdUri$",
      "Bot": {
        "InitiateLoginEndpoint": "$initiateLoginEndpoint$"
      }
    }
  }
  ```
  -------------------------

6. Update source code
  With all changes above, your environment is ready and can update your code to add SSO to your Teams app.
  You can find samples in following pages:
    - TeamsFx SDK: https://www.nuget.org/packages/Microsoft.TeamsFx/
    - Sample Code: under `TeamsFx-Auth/Bot`
  
  -------------------------
  Example for TeamsFx Bot template
  -------------------------
  1) Open `Config.cs` and replace all with following lines:
    ```
    using Microsoft.TeamsFx.Configuration;

    namespace {{YOUR_NAMESPACE}}
    {
        public class TeamsFxOptions
        {
            public AuthenticationOptions Authentication { get; set; }
        }

        public class ConfigOptions
        {
            public string BOT_ID { get; set; }
            public string BOT_PASSWORD { get; set; }
            public TeamsFxOptions TeamsFx { get; set; }
        }
    }
    ```
    Note: You need to replace {{YOUR_NAMESPACE}} with your namespace name
  
  2) Move `TeamsFx-Auth/Bot/SSO` and `TeamsFx-Auth/Bot/Pages` to `/`
      Note: Remember to replace '{YOUR_NAMESPACE}' with your project namespace.

  3) Open `Program.cs`, find following line:
    ```
    builder.Services.AddSingleton<BotFrameworkAuthentication, ConfigurationBotFrameworkAuthentication>();
    ```
    and add the following code below:
    ```
    builder.Services.AddRazorPages();

    // Create the Bot Framework Adapter with error handling enabled.                                        
    builder.Services.AddSingleton<IBotFrameworkHttpAdapter, AdapterWithErrorHandler>();

    builder.Services.AddSingleton<IStorage, MemoryStorage>();
    // Create the Conversation state. (Used by the Dialog system itself.)
    builder.Services.AddSingleton<ConversationState>();

    // The Dialog that will be run by the bot.
    builder.Services.AddSingleton<SsoDialog>();

    // Create the bot as a transient. In this case the ASP Controller is expecting an IBot.
    builder.Services.AddTransient<IBot, TeamsSsoBot<SsoDialog>>();

    builder.Services.AddOptions<BotAuthenticationOptions>().Configure(options =>
    {
      options.ClientId = config.TeamsFx.Authentication.ClientId;
      options.ClientSecret = config.TeamsFx.Authentication.ClientSecret;
      options.OAuthAuthority = config.TeamsFx.Authentication.OAuthAuthority;
      options.ApplicationIdUri = config.TeamsFx.Authentication.ApplicationIdUri;
      options.InitiateLoginEndpoint = config.TeamsFx.Authentication.Bot.InitiateLoginEndpoint;
    });
    ```

    Find and delete the following code:
      '''
      // Create the bot as a transient. In this case the ASP Controller is expecting an IBot.
      builder.Services.AddTransient<IBot, TeamsBot>();
      '''
    
    Find the following code:
      '''
      app.UseEndpoints(endpoints =>
      {
        endpoints.MapControllers();
      });
      '''
      and replace with:
      '''
      app.UseEndpoints(endpoints =>
      {
        endpoints.MapControllers();
        endpoints.MapRazorPages();
      });
      '''
  
  Note: You need to exclude the sample code under `TeamsFx-Auth` to avoid build failure by adding following lines into your `.csproj` file:
  ```
  <ItemGroup>
    <Compile Remove="TeamsFx-Auth/**/*" />
    <None Include="TeamsFx-Auth/**/*" />
    <Content Remove="TeamsFx-Auth/Tab/GetUserProfile.razor"/>
  </ItemGroup>
  ```
  -------------------------

7. To check the SSO app works as expected, run `Local Debug` in Visual Studio. Or run the app in cloud by clicking `Provision in the cloud` and then `Deploy to the cloud` to make the updates taking effects.
