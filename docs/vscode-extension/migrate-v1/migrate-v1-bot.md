# Teams Toolkit V1 bot / messaging extension app migration
## Debug Bot / Messaging extension App migrated from V1
Start debugging the project by hitting the `F5` key in Visual Studio Code. Alternatively use the `Run and Debug Activity Panel` in Visual Studio Code and click the `Start Debugging` green arrow button. 

> Note: A new teams app will be created for local debug.

> Note: A new bot app will be created in [Bot Framework](https://dev.botframework.com/bots) for local debug.

> Note: A new AAD app will be created for local debug.

### [Optional] Set Bot Messaging Endpoint
By default, Ngrok will be started automatically after `F5` to tunnel from the Teams client to localhost. If you want to configure the bot messaging endpoint by yourself, set the following configurations in *.fx/default.userdata* under the project root, then start debugging, like:
```
fx-resource-local-debug.skipNgrok=true
fx-resource-local-debug.localBotEndpoint=https://767787237c6b.ngrok.io/api/messages
```

## Edit the manifest
You can find the Teams app manifest in `./templates/appPackage/manifest.local.template.json`. It contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) for more.
