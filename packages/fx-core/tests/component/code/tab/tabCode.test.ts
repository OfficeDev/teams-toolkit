// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { TabCodeProvider } from "../../../../src/component/code/tab/tabCode";
import { ComponentNames } from "../../../../src/component/constants";
import { createContextV3, newProjectSettingsV3 } from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { MockTools } from "../../../core/utils";

describe("TabCode", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  afterEach(() => {
    sandbox.restore();
  });
  it("collectEnvs", async () => {
    const projectSettings = newProjectSettingsV3();
    projectSettings.components = [
      { name: ComponentNames.TeamsTab, sso: true },
      { name: ComponentNames.TeamsApi, functionNames: ["getMe"] },
      { name: ComponentNames.SimpleAuth },
    ];
    const context = createContextV3(projectSettings);
    const envInfo = newEnvInfoV3();
    envInfo.state[ComponentNames.AadApp] = {
      clientId: "mock-client-id",
    };
    envInfo.state[ComponentNames.TeamsApi] = {
      functionEndpoint: "https://abc.api.com",
    };
    envInfo.state[ComponentNames.SimpleAuth] = {
      endpoint: "https://abc.sa.com",
    };
    context.envInfo = envInfo;
    const tabCode = new TabCodeProvider();
    const res = tabCode.collectEnvs(context);
    assert.isDefined(res["REACT_APP_TEAMSFX_ENDPOINT"]);
  });
});
