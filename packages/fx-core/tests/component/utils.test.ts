// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import {
  InputsWithProjectPath,
  Platform,
  v3,
  ok,
  UserError,
  SystemError,
} from "@microsoft/teamsfx-api";
import { expect } from "chai";
import { convertContext } from "../../src/component/resource/aadApp/utils";
import {
  addFeatureNotify,
  createContextV3,
  createDriverContext,
  newProjectSettingsV3,
  resetEnvInfoWhenSwitchM365,
  scaffoldRootReadme,
} from "../../src/component/utils";
import { BuiltInFeaturePluginNames } from "../../src/component/constants";
import { MockTools } from "../core/utils";
import sinon from "sinon";
import { deployUtils } from "../../src/component/deployUtils";
import { assert } from "chai";
import {
  FindFunctionAppError,
  PackDirectoryExistenceError,
  ResourceNotFoundError,
} from "../../src/component/error";
import { setTools } from "../../src/core/globalVars";
import { newEnvInfoV3 } from "../../src/core/environment";
import fs from "fs-extra";
import { MockedTelemetryReporter, MyTokenCredential } from "../plugins/solution/util";
import { expandEnvironmentVariable } from "../../src/component/utils/common";
import mockedEnv, { RestoreFn } from "mocked-env";
import { TeamsFxTelemetryReporter } from "../../src/component/utils/teamsFxTelemetryReporter";
import { getLocalizedString } from "../../src/common/localizeUtils";

describe("resetEnvInfoWhenSwitchM365", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  afterEach(() => {
    sandbox.restore();
  });

  it("clear keys and apim", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.aad]: {},
        [BuiltInFeaturePluginNames.appStudio]: {},
        [BuiltInFeaturePluginNames.apim]: {
          apimClientAADObjectId: "mockId",
          apimClientAADClientSecret: "mockSecret",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };

    resetEnvInfoWhenSwitchM365(envInfo);

    const expected = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.apim]: {},
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };
    expect(envInfo).to.eql(expected);
  });

  it("clear bot id", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.appStudio]: {},
        [BuiltInFeaturePluginNames.bot]: {
          resourceId: "mockResourceId",
          botId: "mockBotId",
          random: "random",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };

    resetEnvInfoWhenSwitchM365(envInfo);

    const expected = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.bot]: {
          random: "random",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };
    expect(envInfo).to.eql(expected);
  });

  it("convertContext", () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const envInfo = newEnvInfoV3();
    const context = createContextV3();
    context.envInfo = envInfo;
    const ctx = convertContext(context, inputs);
    expect(ctx !== undefined).to.eql(true);
  });
  it("addFeatureNotify", () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    addFeatureNotify(inputs, context.userInteraction, "Resource", ["sql", "apim"]);
    addFeatureNotify(inputs, context.userInteraction, "Capability", ["Tab"]);
    expect(true).to.eql(true);
  });

  it("checkDeployAzureSubscription case 1", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();

    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionName: "mockSubName",
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
    });
    const envInfo = newEnvInfoV3();
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isOk());
  });

  it("checkDeployAzureSubscription case 2", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .resolves(undefined);
    const envInfo = newEnvInfoV3();
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isErr());
  });

  it("checkDeployAzureSubscription case 3", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .resolves(undefined);
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(undefined);
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
      },
    ]);
    const envInfo = newEnvInfoV3();
    envInfo.state.solution.subscriptionId = "mockSubId";
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isOk());
  });

  it("checkDeployAzureSubscription case 3", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .resolves(undefined);
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(undefined);
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "mockSubId2",
        tenantId: "mockTenantId",
      },
    ]);
    const envInfo = newEnvInfoV3();
    envInfo.state.solution.subscriptionId = "mockSubId";
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isErr());
  });

  it("askForDeployConsent", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Deploy"));
    const envInfo = newEnvInfoV3();
    envInfo.state.solution.subscriptionId = "mockSubId";
    const res = await deployUtils.askForDeployConsent(
      context,
      tools.tokenProvider.azureAccountProvider,
      envInfo
    );
    assert.isTrue(res.isErr());
  });
  it("askForDeployConsentV3 confirm", async () => {
    process.env.TEAMSFX_ENV = "dev";
    const inputs: InputsWithProjectPath = {
      projectPath: ".",
      platform: Platform.VSCode,
    };
    const ctx = createDriverContext(inputs);
    sandbox.stub(ctx.ui!, "showMessage").resolves(ok(getLocalizedString("core.option.deploy")));
    const res = await deployUtils.askForDeployConsentV3(ctx);
    assert.isTrue(res.isOk());
  });
  it("askForDeployConsentV3 cancel", async () => {
    process.env.TEAMSFX_ENV = "dev";
    const inputs: InputsWithProjectPath = {
      projectPath: ".",
      platform: Platform.VSCode,
    };
    const ctx = createDriverContext(inputs);
    sandbox.stub(ctx.ui!, "showMessage").resolves(ok(undefined));
    const res = await deployUtils.askForDeployConsentV3(ctx);
    assert.isTrue(res.isErr());
  });
  it("errors", async () => {
    const error1 = new PackDirectoryExistenceError("FE");
    assert.isDefined(error1);
    const error2 = new ResourceNotFoundError("test", "");
    assert.isDefined(error2);
    const error3 = new FindFunctionAppError("FE");
    assert.isDefined(error3);
  });
  it("scaffoldRootReadme", async () => {
    sandbox.stub(fs, "pathExists").onFirstCall().resolves(true).onSecondCall().resolves(false);
    sandbox.stub(fs, "copy").resolves();
    const projectSettings = newProjectSettingsV3();
    projectSettings.components = [
      {
        name: "teams-tab",
      },
      {
        name: "teams-bot",
      },
    ];
    await scaffoldRootReadme(projectSettings, ".");
  });
});

describe("expandEnvironmentVariable", () => {
  const template = "ENV_A value:${{ENV_A}}" + "ENV_B value:${{ENV_B}}";

  let envRestore: RestoreFn | undefined;

  afterEach(() => {
    if (envRestore) {
      envRestore();
      envRestore = undefined;
    }
  });

  it("should expand all environment variables", () => {
    envRestore = mockedEnv({
      ENV_A: "A",
      ENV_B: "B",
    });

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("ENV_A value:A" + "ENV_B value:B");
  });

  it("should not expand placeholder when specified environment variable not exist", () => {
    envRestore = mockedEnv({
      ENV_A: "A",
    });

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("ENV_A value:A" + "ENV_B value:${{ENV_B}}");
  });

  it("should not modify original string", () => {
    envRestore = mockedEnv({
      ENV_A: "A",
      ENV_B: "B",
    });

    expandEnvironmentVariable(template);

    expect(template).to.equal("ENV_A value:${{ENV_A}}" + "ENV_B value:${{ENV_B}}");
  });

  it("should do nothing with non valid placeholder", () => {
    const template = "placeholder:${{}}";

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("placeholder:${{}}");
  });

  it("should allow leading and trailing whitespaces in environment variable name", () => {
    const template = "placeholder: ${{ ENV_A }}";

    envRestore = mockedEnv({
      ENV_A: "A",
    });

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("placeholder: A");
  });
});

describe("TeamsFxTelemetryReporter", () => {
  const mockedTelemetryReporter = new MockedTelemetryReporter();
  const teamsFxTelemetryReporter = new TeamsFxTelemetryReporter(mockedTelemetryReporter);
  let reporterCalled: boolean;

  beforeEach(() => {
    reporterCalled = false;
  });

  afterEach(() => {
    sinon.restore();
    expect(reporterCalled).to.be.true; // Because TeamsFxTelemetryReport ignores all exceptions which include test failures, please check your test case to find actual errors.
  });

  describe("sendStartEvent", () => {
    it("should append -start to event name", () => {
      sinon.stub(mockedTelemetryReporter, "sendTelemetryEvent").callsFake((eventName) => {
        expect(eventName).to.equal("test-start");
        reporterCalled = true;
      });

      teamsFxTelemetryReporter.sendStartEvent({ eventName: "test" });
    });

    it("should set component property if component name exists", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).has.property("component", "test");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendStartEvent({ eventName: "test", componentName: "test" });
    });

    it("should not set component property if component name does not exist", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).to.be.undefined;
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendStartEvent({ eventName: "test" });
    });

    it("should not overwrite user provided component property", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).has.property("component", "mycomponent");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendStartEvent({
        eventName: "test",
        componentName: "test",
        properties: {
          component: "mycomponent",
        },
      });
    });

    it("should pass measurements to telemetry reporter", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties, measurements) => {
          expect(measurements).has.property("duration", 100);
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent({
        eventName: "test",
        measurements: {
          duration: 100,
        },
      });
    });
  });

  describe("sendEndEvent", () => {
    it("should call sentTelemetryEvent when not provide FxError", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties, measurements) => {
          expect(eventName).to.equal("test");
          expect(properties).has.property("success", "yes");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent({
        eventName: "test",
      });
    });

    it("should call sendTelemetryErrorEvent when provide FxError ", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryErrorEvent")
        .callsFake((eventName, properties, measurements) => {
          expect(eventName).to.equal("test");
          expect(properties).include({
            success: "no",
            "error-code": "source.name",
            "error-type": "user",
            "error-message": "message",
          });
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent(
        {
          eventName: "test",
        },
        new UserError("source", "name", "message")
      );
    });

    it("should not overwrite provided properties", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryErrorEvent")
        .callsFake((eventName, properties, measurements) => {
          expect(eventName).to.equal("test");
          expect(properties).include({
            success: "no",
            "error-code": "my error code",
            "error-type": "user",
            "error-message": "message",
            "my-property": "value",
          });
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent(
        {
          eventName: "test",
          properties: {
            "error-code": "my error code",
            "my-property": "value",
          },
        },
        new UserError("source", "name", "message")
      );
    });

    it("should merge provided errorProps", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryErrorEvent")
        .callsFake((eventName, properties, measurements, errorProps) => {
          expect(errorProps).include("test");
          expect(errorProps).include("error-message");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent(
        {
          eventName: "test",
          errorProps: ["test"],
        },
        new UserError("source", "name", "message")
      );
    });

    it("should set error type to system error when FxError is SystemError", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryErrorEvent")
        .callsFake((eventName, properties, measurements, errorProps) => {
          expect(properties).has.property("error-type", "system");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent(
        {
          eventName: "test",
        },
        new SystemError("source", "name", "message")
      );
    });

    it("should set error type to user error when FxError is UserError", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryErrorEvent")
        .callsFake((eventName, properties, measurements, errorProps) => {
          expect(properties).has.property("error-type", "user");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent(
        {
          eventName: "test",
        },
        new UserError("source", "name", "message")
      );
    });

    it("should set component property if component name exists", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).has.property("component", "test");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent({ eventName: "test", componentName: "test" });
    });

    it("should not set component property if component name does not exist", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).not.has.property("component");
          reporterCalled = true;
        });

      teamsFxTelemetryReporter.sendEndEvent({ eventName: "test" });
    });
  });

  describe("defulatConfig", () => {
    it("should merge default event name if exist", () => {
      sinon.stub(mockedTelemetryReporter, "sendTelemetryEvent").callsFake((eventName) => {
        expect(eventName).to.equal("base-event-name-test");
        reporterCalled = true;
      });

      const defaultConfig = {
        baseEventName: "base-event-name-",
      };
      const teamsFxTelemetryReporter = new TeamsFxTelemetryReporter(
        mockedTelemetryReporter,
        defaultConfig
      );
      teamsFxTelemetryReporter.sendEndEvent({ eventName: "test" });
    });

    it("should merge default component name if config does not have one", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).has.property("component", "testcomponent");
          reporterCalled = true;
        });

      const defaultConfig = {
        componentName: "testcomponent",
      };
      const teamsFxTelemetryReporter = new TeamsFxTelemetryReporter(
        mockedTelemetryReporter,
        defaultConfig
      );
      teamsFxTelemetryReporter.sendEndEvent({ eventName: "test" });
    });

    it("should not merge default component name if config already have component name", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).has.property("component", "mycomponent");
          reporterCalled = true;
        });

      const defaultConfig = {
        componentName: "testcomponent",
      };
      const teamsFxTelemetryReporter = new TeamsFxTelemetryReporter(
        mockedTelemetryReporter,
        defaultConfig
      );
      teamsFxTelemetryReporter.sendEndEvent({ eventName: "test", componentName: "mycomponent" });
    });

    it("should not modify original config object when merge", () => {
      sinon
        .stub(mockedTelemetryReporter, "sendTelemetryEvent")
        .callsFake((eventName, properties) => {
          expect(properties).has.property("component", "testcomponent");
          reporterCalled = true;
        });

      const defaultConfig = {
        componentName: "testcomponent",
      };
      const config = {
        eventName: "test",
      };
      const teamsFxTelemetryReporter = new TeamsFxTelemetryReporter(
        mockedTelemetryReporter,
        defaultConfig
      );
      teamsFxTelemetryReporter.sendEndEvent(config);

      expect(config).not.has.property("component");
    });
  });
});
