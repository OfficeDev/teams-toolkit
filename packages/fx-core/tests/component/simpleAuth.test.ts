// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { Container } from "typedi";
import { ComponentNames } from "../../src/component/constants";
import "../../src/component/core";
import { TeamsfxCore } from "../../src/component/core";
import "../../src/component/feature/bot/bot";
import "../../src/component/feature/sql";
import "../../src/component/resource/botService/botService";
import { createContextV3 } from "../../src/component/utils";
import { newEnvInfoV3 } from "../../src/core/environment";
import { setTools } from "../../src/core/globalVars";
import { Utils } from "../../src/component/resource/simpleAuth/utils/common";
import { deleteFolder, MockTools, randomAppName } from "../core/utils";
describe("Simple auth component V3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const context = createContextV3();
  const fx = Container.get<TeamsfxCore>("fx");
  afterEach(() => {
    sandbox.restore();
  });

  after(async () => {
    deleteFolder(projectPath);
  });

  it("simple-auth.provision(local)", async () => {
    sandbox.stub(Utils, "downloadZip").resolves();
    context.envInfo = newEnvInfoV3("local");
    context.tokenProvider = tools.tokenProvider;
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const component = Container.get(ComponentNames.SimpleAuth) as any;
    const res = await component.provision(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });

  it("simple-auth.configure(local)", async () => {
    context.envInfo = newEnvInfoV3("local");
    context.tokenProvider = tools.tokenProvider;
    context.envInfo.state = {
      solution: {},
      [ComponentNames.TeamsTab]: {
        endpoint: "https://11111.com",
      },
      [ComponentNames.AadApp]: {
        clientId: "clientId",
        clientSecret: "clientSecret",
        oauthAuthority: "oauthAuthority",
        applicationIdUris: "applicationIdUris",
      },
    };
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const component = Container.get(ComponentNames.SimpleAuth) as any;
    const res = await component.configure(context, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
});
