
param simpleAuth_sku string = 'F1'
param simpleAuth_serverFarmsName string = 'simpleAuth-serverfarms-${uniqueString('${resourceBaseName}${utcNow()}')}'
param simpleAuth_webAppName string = 'simpleAuth-webapp-${uniqueString('${resourceBaseName}${utcNow()}')}'
param simpleAuth_packageUri string = 'https://github.com/OfficeDev/TeamsFx/releases/download/simpleauth@0.1.0/Microsoft.TeamsFx.SimpleAuth_0.1.0.zip'
