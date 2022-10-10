// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";

import { InputsWithProjectPath, Platform, ResourceContextV3 } from "@microsoft/teamsfx-api";
import * as dotenv from "dotenv";
import * as faker from "faker";
import * as fs from "fs-extra";
import { LocalStateSimpleAuthKeys } from "../../../../../src/common/localStateConstants";
import { getAllowedAppIds } from "../../../../../src/common/tools";
import { SimpleAuth } from "../../../../../src/component/resource/simpleAuth/index";
import { MockTools } from "../../../../core/utils";
import { createContextV3, newProjectSettingsV3 } from "../../../../../src/component/utils";
import { setTools } from "../../../../../src/core/globalVars";
import { ComponentNames } from "../../../../../src/component/constants";
import { newEnvInfoV3 } from "../../../../../src/core/environment";
import { MyTokenCredential } from "../../../solution/util";
chai.use(chaiAsPromised);

dotenv.config();
const testWithAzure: boolean = process.env.UT_TEST_ON_AZURE ? true : false;

describe("simpleAuthPlugin", () => {
  const sandbox = sinon.createSandbox();
  let simpleAuthPlugin: SimpleAuth;
  const tools = new MockTools();
  const context = createContextV3();
  setTools(tools);
  before(async () => {});

  beforeEach(async () => {
    simpleAuthPlugin = new SimpleAuth();
    context.tokenProvider = tools.tokenProvider;
    sandbox
      .stub(context.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    sandbox.stub(context.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "subscriptionId",
      tenantId: "tenantId",
      subscriptionName: "subscriptionName",
    });
    context.projectSetting = newProjectSettingsV3();
    context.projectSetting.components = [
      { name: ComponentNames.TeamsTab },
      { name: ComponentNames.SimpleAuth },
      { name: ComponentNames.AadApp },
    ];
    context.envInfo = newEnvInfoV3("local");
    context.envInfo.state = {
      solution: {
        resourceNameSuffix: "testsuffix",
        subscriptionId: "subscriptionId",
        resourceGroupName: "mockRG",
        location: "eastus",
        remoteTeamsAppId: faker.datatype.uuid(),
      },
      [ComponentNames.AadApp]: {
        clientId: "mock-clientId",
        clientSecret: "mock-clientSecret",
        applicationIdUris: "mock-applicationIdUris",
        oauthAuthority: "https://login.microsoftonline.com/mock-teamsAppTenantId",
      },
      [ComponentNames.TeamsTab]: {
        endpoint: "https://endpoint.mock",
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("provision and configure", async function () {
    // Act
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    await simpleAuthPlugin.provision(context as ResourceContextV3, inputs);
    await simpleAuthPlugin.configure(context as ResourceContextV3, inputs);

    // Assert
    const filePath: string =
      context.envInfo!.state[ComponentNames.SimpleAuth][
        LocalStateSimpleAuthKeys.SimpleAuthFilePath
      ];
    chai.assert.isOk(filePath);
    chai.assert.isTrue(await fs.pathExists(filePath));
    const expectedEnvironmentVariableParams = `CLIENT_ID="mock-clientId" CLIENT_SECRET="mock-clientSecret" OAUTH_AUTHORITY="https://login.microsoftonline.com/mock-teamsAppTenantId" IDENTIFIER_URI="mock-applicationIdUris" ALLOWED_APP_IDS="${getAllowedAppIds().join(
      ";"
    )}" TAB_APP_ENDPOINT="https://endpoint.mock" AAD_METADATA_ADDRESS="https://login.microsoftonline.com/mock-teamsAppTenantId/v2.0/.well-known/openid-configuration"`;
    chai.assert.strictEqual(
      context.envInfo!.state[ComponentNames.SimpleAuth][
        LocalStateSimpleAuthKeys.EnvironmentVariableParams
      ],
      expectedEnvironmentVariableParams
    );
  });
});
