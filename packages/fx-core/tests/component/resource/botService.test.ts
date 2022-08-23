// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  InputsWithProjectPath,
  M365TokenProvider,
  ok,
  Platform,
  ResourceContextV3,
  TokenRequest,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import { createSandbox } from "sinon";
import * as utils from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../core/utils";
import "../../../src/component/core";
import { newEnvInfoV3 } from "../../../src/core/environment";
import { BotService } from "../../../src/component/resource/botService";
import { ComponentNames } from "../../../src/component/constants";
import { AppStudio } from "../../../src/plugins/resource/bot/appStudio/appStudio";
import { ProvisionError } from "../../../src/plugins/resource/bot/errors";
import { getAppStudioEndpoint } from "../../../src/component/resource/appManifest/constants";

describe("Bot Feature", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
  const component = new BotService();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "app-name": appName,
  };
  let context: ResourceContextV3;
  setTools(tools);
  beforeEach(() => {
    context = utils.createContextV3() as ResourceContextV3;
    context.tokenProvider.m365TokenProvider = {
      getAccessToken: async (tokenRequest: TokenRequest) => ok("token"),
    } as M365TokenProvider;
    context.envInfo = newEnvInfoV3("local");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("local debug bot with existing bot reg", async () => {
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "botID",
      botPassword: "botPassword",
    };
    sandbox.stub(AppStudio, "getBotRegistration").resolves({} as any);
    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });
  it("wrap app studio error", async () => {
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "botID",
      botPassword: "botPassword",
    };
    sandbox.stub(AppStudio, "getBotRegistration").rejects({
      config: { url: `${getAppStudioEndpoint()}/api/botframework/xxx`, methos: "post" },
      response: { status: 500 },
    });
    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.equal(error.name, "ProvisionError");
      assert.exists(error.innerError);
      assert.equal(error.innerError?.response?.status, 500);
      assert.equal(error.innerError?.toJSON?.config?.method, "post");
      assert.include(error.innerError?.config?.url, "botframwork");
    }
  });
});
