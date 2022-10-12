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
import { ComponentNames } from "../../../../src/component/constants";
import { AppStudio } from "../../../../src/component/resource/botService/appStudio/appStudio";
import { TeamsfxCore } from "../../../../src/component/core";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import { provisionUtils } from "../../../../src/component/provisionUtils";
import { TelemetryKeys } from "../../../../src/component/resource/botService/constants";

describe("Bot service telemetry helper", () => {
  const tools = new MockTools();
  const sandbox = createSandbox();
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
    sandbox.stub(AppManifest.prototype, "provision").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "preProvision").resolves(ok(undefined));
    context.projectSetting.components.push({
      name: ComponentNames.BotService,
      provision: true,
    });
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "botID",
      botPassword: "botPassword",
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("increase ut coverage", async () => {
    const telemetryStub = sandbox
      .stub(context.telemetryReporter, "sendTelemetryErrorEvent")
      .resolves();

    sandbox.stub(AppStudio, "getBotRegistration").rejects({
      toJSON: () => ({
        config: {
          url: "https://dev.teams.microsoft.com/api/botframework",
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
    }
    assert.isTrue(telemetryStub.calledTwice);
    const props = telemetryStub.args[1]?.[1];
    assert.equal(props?.[TelemetryKeys.Url], "<create-bot-registration>");
  });
  it("increase ut coverage", async () => {
    const telemetryStub = sandbox
      .stub(context.telemetryReporter, "sendTelemetryErrorEvent")
      .resolves();

    sandbox.stub(AppStudio, "getBotRegistration").rejects({});

    const fxComponent = new TeamsfxCore();
    const res = await fxComponent.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.equal(error.name, "ProvisionError");
      assert.exists(error.innerError);
    }
    assert.isTrue(telemetryStub.calledTwice);
  });
});
