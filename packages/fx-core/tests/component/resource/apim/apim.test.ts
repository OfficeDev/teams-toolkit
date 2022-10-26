// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  Platform,
  ProjectSettings,
  ResourceContextV3,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import * as uuid from "uuid";
import { randomAppName } from "../../../core/utils";
import {
  MockedAzureAccountProvider,
  MockedM365Provider,
  MockedV2Context,
} from "../../../plugins/solution/util";
import {
  APIMResource,
  getQuestionsForDeployAPIM,
} from "../../../../src/component/resource/apim/apim";
import { createContextV3 } from "../../../../src/component/utils";
import { ComponentNames } from "../../../../src/component/constants";
import { createSandbox } from "sinon";
import { AadManager } from "../../../../src/component/resource/apim/managers/aadManager";
import { TeamsAppAadManager } from "../../../../src/component/resource/apim/managers/teamsAppAadManager";
import { ApimManager } from "../../../../src/component/resource/apim/managers/apimManager";
describe("APIM V3 API", () => {
  const sandbox = createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("getQuestionsForDeploy", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "fx-solution-azure",
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365Provider(),
    };
    const envInfoV3: v3.EnvInfoV3 = {
      envName: "dev",
      config: {},
      state: { solution: {}, "fx-resource-apim": {} },
    };
    const context = ctx as ContextV3;
    context.envInfo = envInfoV3;
    context.tokenProvider = mockedTokenProvider;
    const res = await getQuestionsForDeployAPIM(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });

  it("provision local", async () => {
    const context = createContextV3();
    const apimResource = new APIMResource();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365Provider(),
    };
    const envInfoV3: v3.EnvInfoV3 = {
      envName: "local",
      config: {},
      state: { solution: {}, [ComponentNames.APIM]: {} },
    };

    context.envInfo = envInfoV3;
    context.tokenProvider = mockedTokenProvider;
    const res = await apimResource.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });

  it("provision non-local", async () => {
    const context = createContextV3();
    const apimResource = new APIMResource();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365Provider(),
    };
    const envInfoV3: v3.EnvInfoV3 = {
      envName: "dev",
      config: {},
      state: {
        solution: { subscriptionId: "test-subscription-id" },
        [ComponentNames.APIM]: {
          serviceResourceId:
            "/subscriptions/test-subscription-id/resourceGroups/test-resource-group-existing/providers/Microsoft.ApiManagement/service/test-service-existing",
        },
      },
    };

    context.envInfo = envInfoV3;
    context.tokenProvider = mockedTokenProvider;

    sandbox.stub(AadManager.prototype, "provision").resolves();
    sandbox.stub(ApimManager.prototype, "provision").resolves();
    const res = await apimResource.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });

  it("configure local", async () => {
    const context = createContextV3();
    const apimResource = new APIMResource();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365Provider(),
    };
    const envInfoV3: v3.EnvInfoV3 = {
      envName: "local",
      config: {},
      state: { solution: {}, [ComponentNames.APIM]: {} },
    };

    context.envInfo = envInfoV3;
    context.tokenProvider = mockedTokenProvider;
    const res = await apimResource.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });

  it("configure non-local", async () => {
    const context = createContextV3();
    const apimResource = new APIMResource();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365Provider(),
    };
    const envInfoV3: v3.EnvInfoV3 = {
      envName: "dev",
      config: {},
      state: { solution: {}, [ComponentNames.APIM]: {} },
    };

    context.envInfo = envInfoV3;
    context.tokenProvider = mockedTokenProvider;
    sandbox.stub(TeamsAppAadManager.prototype, "postProvision").resolves();
    sandbox.stub(AadManager.prototype, "postProvision").resolves();
    const res = await apimResource.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });
});
