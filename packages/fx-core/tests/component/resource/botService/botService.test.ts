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
import * as utils from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../../core/utils";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { BotService } from "../../../../src/component/resource/botService/botService";
import { ComponentNames } from "../../../../src/component/constants";
import { AppStudio } from "../../../../src/component/resource/botService/appStudio/appStudio";
import { TeamsfxCore } from "../../../../src/component/core";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import { provisionUtils } from "../../../../src/component/provisionUtils";
import { TelemetryKeys } from "../../../../src/component/resource/botService/constants";

describe("Bot service", () => {
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
      response: { status: 500 },
    });
    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.equal(error.name, "ProvisionError");
      assert.exists(error.innerError);
      assert.equal(error.innerError?.response?.status, 500);
    }
  });
  it("send telemetry for app studio error when local debug", async () => {
    sandbox.stub(AppManifest.prototype, "provision").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "preProvision").resolves(ok(undefined));
    const telemetryStub = sandbox
      .stub(context.telemetryReporter, "sendTelemetryErrorEvent")
      .resolves();

    context.projectSetting.components.push({
      name: ComponentNames.BotService,
      provision: true,
    });
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "botID",
      botPassword: "botPassword",
    };
    sandbox.stub(AppStudio, "getBotRegistration").rejects({
      response: { status: 500 },
      toJSON: () => ({
        config: {
          url: "https://dev.teams.microsoft.com/api/botframework",
          method: "post",
        },
      }),
    });
    const fxComponent = new TeamsfxCore();
    const res = await fxComponent.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.equal(error.name, "ProvisionError");
      assert.exists(error.innerError);
      assert.equal(error.innerError?.response?.status, 500);
    }
    assert.isTrue(telemetryStub.calledTwice);
    const props = telemetryStub.args[1]?.[1];
    assert.equal(props?.[TelemetryKeys.StatusCode], "500");
    assert.equal(props?.[TelemetryKeys.Url], "<create-bot-registration>");
    assert.equal(props?.[TelemetryKeys.Method], "post");
  });
});
