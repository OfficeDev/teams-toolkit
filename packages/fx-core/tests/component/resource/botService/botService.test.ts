// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zhijie <zhihuan@microsoft.com>
 */
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
import Sinon, { createSandbox } from "sinon";
import * as utils from "../../../../src/component/utils";
import { setTools } from "../../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../../core/utils";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { BotService } from "../../../../src/component/resource/botService/botService";
import { ComponentNames } from "../../../../src/component/constants";
import { AppStudioClient } from "../../../../src/component/resource/botService/appStudio/appStudioClient";
import { TeamsfxCore } from "../../../../src/component/core";
import { AppManifest } from "../../../../src/component/resource/appManifest/appManifest";
import { provisionUtils } from "../../../../src/component/provisionUtils";
import { TeamsFxUrlNames } from "../../../../src/component/resource/botService/constants";
import { GraphClient } from "../../../../src/component/resource/botService/botRegistration/graphClient";
import { AppStudioClient as AppStudio } from "../../../../src/component/resource/appManifest/appStudioClient";
import { RetryHandler } from "../../../../src/component/resource/botService/retryHandler";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import { TelemetryUtils } from "../../../../src/component/resource/appManifest/utils/telemetry";
import { AppStudioResultFactory } from "../../../../src/component/resource/appManifest/results";
import { APP_STUDIO_API_NAMES } from "../../../../src/component/resource/appManifest/constants";

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
    sandbox.stub(AppStudio, "sendStartEvent").returns();
    sandbox.stub(AppStudio, "sendSuccessEvent").returns();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("local debug bot with existing bot reg", async () => {
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "botID",
      botPassword: "botPassword",
    };
    sandbox.stub(AppStudioClient, "getBotRegistration").resolves({} as any);
    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });
  it("wrap app studio error", async () => {
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "",
      botPassword: "botPassword",
    };
    sandbox.stub(RetryHandler, "Retry").resolves(undefined);
    sandbox.stub(GraphClient, "registerAadApp").resolves({
      clientId: "clientId",
      clientSecret: "clientSecret",
    });
    sandbox.stub(TelemetryUtils, "sendErrorEvent").returns();
    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
    }
  });
  it("send telemetry for app studio error when local debug", async () => {
    sandbox.stub(AppManifest.prototype, "provision").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "preProvision").resolves(ok(undefined));
    const telemetryStub = sandbox
      .stub(context.telemetryReporter, "sendTelemetryErrorEvent")
      .resolves();
    sandbox.stub(GraphClient, "registerAadApp").resolves({
      clientId: "clientId",
      clientSecret: "clientSecret",
    });
    sandbox.stub(RetryHandler, "Retry").resolves(undefined);
    sandbox.stub(TelemetryUtils, "sendErrorEvent").returns();

    context.projectSetting.components.push({
      name: ComponentNames.BotService,
      provision: true,
    });
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "",
      botPassword: "botPassword",
    };

    const fxComponent = new TeamsfxCore();
    const res = await fxComponent.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.equal(error.name, AppStudioError.DeveloperPortalAPIFailedError.name);
    }
  });

  it("local bot registration error with existing bot id and cannot get bot", async () => {
    context.envInfo.state[ComponentNames.TeamsBot] = {
      botId: "botId",
      botPassword: "botPassword",
    };
    sandbox.stub(AppStudioClient, "getBotRegistration").returns(Promise.resolve(undefined));
    sandbox.stub(AppStudioClient, "createBotRegistration").throwsException(
      AppStudioResultFactory.SystemError(
        AppStudioError.DeveloperPortalAPIFailedError.name,
        ["", ""],
        {
          teamsfxUrlName: TeamsFxUrlNames[APP_STUDIO_API_NAMES.CREATE_BOT],
        }
      )
    );
    sandbox.stub(GraphClient, "registerAadApp").resolves({
      clientId: "clientId",
      clientSecret: "clientSecret",
    });
    sandbox.stub(TelemetryUtils, "sendErrorEvent").returns();

    const res = await component.provision(context as ResourceContextV3, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      const error = res.error;
      assert.equal(error.name, "AlreadyCreatedBotNotExist");
    }
  });
});
