// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
import { TestHelper } from "../helper";
import { FrontendPlugin as WebappPlugin } from "../../../../../src";
import { mockSolutionGenerateArmTemplates, ResourcePlugins } from "../../util";
import {
  HostTypeOptionAzure,
  TabOptionItem,
} from "../../../../../src/plugins/solution/fx-solution/question";

const provisionModule = `@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverFarmsName = contains(provisionParameters, 'webappServerfarmsName') ? provisionParameters['webappServerfarmsName'] : '\${resourceBaseName}webapp'
var sku = contains(provisionParameters, 'webappServerfarmsSku') ? provisionParameters['webappServerfarmsSku'] : 'F1'
var webAppName = contains(provisionParameters, 'webappWebappName') ? provisionParameters['webappWebappName'] : '\${resourceBaseName}webapp'

resource serverFarms 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: serverFarmsName
  location: resourceGroup().location
  sku: {
    name: sku
  }
  kind: 'app'
}

resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  name: webAppName
  location: resourceGroup().location
  properties: {
    serverFarmId: serverFarms.id
    keyVaultReferenceIdentity: userAssignedIdentityId
    siteConfig: {
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '\${userAssignedIdentityId}': {}
    }
  }
}

var siteDomain = webApp.properties.defaultHostName

output resourceId string = webApp.id
output endpoint string = 'https://\${siteDomain}'
output domain string = siteDomain
`;
const provisionModuleFilePath = "./webappProvision.result.bicep";
const provisionOrchestration = `// Resources for web app
module webappProvision '${provisionModuleFilePath}' = {
  name: 'webappProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output webappOutput object = {
  teamsFxPluginId: 'fx-resource-frontend-hosting'
  domain: webappProvision.outputs.domain
  endpoint: webappProvision.outputs.endpoint
  webAppResourceId: webappProvision.outputs.resourceId
}
`;

const configModule = `// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webappName = split(provisionOutputs.webappOutput.value.webappResourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
var m365ClientSecret = provisionParameters['m365ClientSecret']

var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)

var webappDomain = provisionOutputs.webappOutput.value.domain
var webappEndpoint = provisionOutputs.webappOutput.value.endpoint


var m365ApplicationIdUri = 'api://\${webappDomain}/\${m365ClientId}'
var aadMetadataAddress = uri(m365OauthAuthorityHost, '\${m365TenantId}/v2.0/.well-known/openid-configuration')
var initiateLoginEndpoint = uri(webappEndpoint, 'auth-start.html')

var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var officeWebAppClientId1 = '4345a7b9-9a63-4910-a426-35363201d503'
var officeWebAppClientId2 = '4765445b-32c6-49b0-83e6-1d93765276ca'
var outlookDesktopAppClientId = 'd3590ed6-52b3-4102-aeff-aad2292ab01c'
var outlookWebAppClientId = '00000002-0000-0ff1-ce00-000000000000'
var authorizedClientApplicationIds = '\${teamsMobileOrDesktopAppClientId};\${teamsWebAppClientId};\${officeWebAppClientId1};\${officeWebAppClientId2};\${outlookDesktopAppClientId};\${outlookWebAppClientId}'

resource appSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '\${webappName}/appsettings'
  properties: union({
    AAD_METADATA_ADDRESS: aadMetadataAddress
    CLIENT_ID: m365ClientId
    CLIENT_SECRET: m365ClientSecret
    IDENTIFIER_URI: m365ApplicationIdUri
    OAUTH_AUTHORITY: oauthAuthority
    TAB_APP_ENDPOINT: webappEndpoint
    TeamsFx__Authentication__ClientId: m365ClientId
    TeamsFx__Authentication__InitiateLoginEndpoint: initiateLoginEndpoint
    TeamsFx__Authentication__SimpleAuthEndpoint: webappEndpoint
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    M365_TENANT_ID: m365TenantId
    IDENTITY_ID: provisionOutputs.identityOutput.value.identityClientId
  }, currentAppSettings)
}
`;
const configModuleFilePath = "./webappConfig.result.bicep";
const configOrchestration = `var webappCurrentAppSettings = list('\${provisionOutputs.webappOutput.value.webAppResourceId}/config/appsettings', '2021-02-01').properties

module teamsFxWebappConfig '${configModuleFilePath}' = {
  name: 'addTeamsFxWebappConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: webappCurrentAppSettings
  }
}
`;

chai.use(chaiAsPromised);

describe("WebappPlugin", () => {
  let plugin: WebappPlugin;

  beforeEach(() => {
    plugin = new WebappPlugin();
  });

  it("generate bicep arm templates", async () => {
    // Act
    const activeResourcePlugins = [ResourcePlugins.Aad, ResourcePlugins.FrontendHosting];
    const pluginContext: PluginContext = TestHelper.getFakePluginContext();
    pluginContext.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: activeResourcePlugins,
      capabilities: [TabOptionItem.id],
    } as AzureSolutionSettings;
    const result = await plugin.generateArmTemplates(pluginContext);

    // Assert
    const mockedSolutionDataContext = {
      Plugins: {
        "fx-resource-frontend-hosting": {
          Provision: {
            webapp: {
              path: provisionModuleFilePath,
            },
          },
          Configuration: {
            webapp: {
              path: configModuleFilePath,
            },
          },
        },
        "fx-resource-identity": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
          },
          References: {
            identityClientId: "provisionOutputs.identityOutput.value.identityClientId",
            identityResourceId: "userAssignedIdentityProvision.outputs.identityResourceId",
          },
        },
      },
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionGenerateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      chai.assert.strictEqual(expectedResult.Provision!.Modules!.webapp, provisionModule);
      chai.assert.strictEqual(expectedResult.Provision!.Orchestration, provisionOrchestration);
      chai.assert.strictEqual(expectedResult.Configuration!.Modules!.webapp, configModule);
      chai.assert.strictEqual(expectedResult.Configuration!.Orchestration, configOrchestration);
      chai.assert.isNotNull(expectedResult.Reference);
      chai.assert.isUndefined(expectedResult.Parameters);
    }
  });
});
