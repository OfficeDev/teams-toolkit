import { CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { CapabilityOptions, FxCore, UserCancelError, envUtil } from "@microsoft/teamsfx-core";
import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import * as activate from "../../src/activate";
import * as accountUtils from "../../src/cmds/account";
import {
  accountLoginAzureCommand,
  accountLoginM365Command,
  accountLogoutCommand,
  accountShowCommand,
  addSPFxWebpartCommand,
  configGetCommand,
  configSetCommand,
  createCommand,
  createSampleCommand,
  deployCommand,
  envAddCommand,
  envListCommand,
  listCapabilitiesCommand,
  listSamplesCommand,
  printGlobalConfig,
  provisionCommand,
  publishCommand,
} from "../../src/commands/models";
import AzureTokenProvider from "../../src/commonlib/azureLogin";
import * as codeFlowLogin from "../../src/commonlib/codeFlowLogin";
import { signedIn, signedOut } from "../../src/commonlib/common/constant";
import { logger } from "../../src/commonlib/logger";
import M365TokenProvider from "../../src/commonlib/m365Login";
import { UserSettings } from "../../src/userSetttings";
import * as utils from "../../src/utils";

describe("CLI commands", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(logger, "info").resolves(true);
    sandbox.stub(logger, "error").resolves(true);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("createCommand", async () => {
    it("happy path", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(ok({ projectPath: "..." }));
      const ctx: CLIContext = {
        command: { ...createCommand, fullName: "teamsfx new" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("core return error", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: { ...createCommand, fullName: "teamsfx new" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
  });

  describe("createSampleCommand", async () => {
    it("happy path", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createSampleProject").resolves(ok({ projectPath: "..." }));
      const ctx: CLIContext = {
        command: { ...createSampleCommand, fullName: "teamsfx new sample" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createSampleCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("core return error", async () => {
      sandbox.stub(activate, "createFxCore").returns(new FxCore({} as any));
      sandbox.stub(FxCore.prototype, "createProject").resolves(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: { ...createSampleCommand, fullName: "teamsfx new sample" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await createSampleCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
  });
  describe("listSampleCommand", async () => {
    it("happy path", async () => {
      sandbox.stub(utils, "getTemplates").resolves([]);
      const ctx: CLIContext = {
        command: { ...listSamplesCommand, fullName: "teamsfx list samples" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await listSamplesCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("listCapabilitiesCommand", async () => {
    it("happy path", async () => {
      const ctx: CLIContext = {
        command: { ...listCapabilitiesCommand, fullName: "teamsfx list capabilities" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await listCapabilitiesCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("accountLoginAzureCommand", async () => {
    it("should success when service-principal = false", async () => {
      sandbox.stub(AzureTokenProvider, "signout");
      sandbox.stub(accountUtils, "outputAzureInfo").resolves();
      const ctx: CLIContext = {
        command: { ...accountLoginAzureCommand, fullName: "teamsfx account login azure" },
        optionValues: { "service-principal": false },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountLoginAzureCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("should fail when service-principal = true", async () => {
      sandbox.stub(AzureTokenProvider, "signout");
      sandbox.stub(accountUtils, "outputAzureInfo").resolves();
      const ctx: CLIContext = {
        command: { ...accountLoginAzureCommand, fullName: "teamsfx account login azure" },
        optionValues: { "service-principal": true },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountLoginAzureCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
    it("should fail service-principal = false", async () => {
      sandbox.stub(AzureTokenProvider, "signout");
      sandbox.stub(accountUtils, "outputAzureInfo").resolves();
      const ctx: CLIContext = {
        command: { ...accountLoginAzureCommand, fullName: "teamsfx account login azure" },
        optionValues: { "service-principal": false, username: "abc" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountLoginAzureCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
  });
  describe("accountLoginM365Command", async () => {
    it("should success", async () => {
      sandbox.stub(M365TokenProvider, "signout");
      sandbox.stub(accountUtils, "outputM365Info").resolves();
      const ctx: CLIContext = {
        command: { ...accountLoginM365Command, fullName: "teamsfx account login m365" },
        optionValues: { "service-principal": false },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountLoginM365Command.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });

  describe("addSPFxWebpartCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "addWebpart").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...addSPFxWebpartCommand, fullName: "teamsfx add spfx-web-part" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await addSPFxWebpartCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("deployCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "deployArtifacts").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...deployCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await deployCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("envAddCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "createEnv").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...envAddCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envAddCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("envListCommand", async () => {
    it("success", async () => {
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev"]));
      const ctx: CLIContext = {
        command: { ...envListCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envListCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("error", async () => {
      sandbox.stub(envUtil, "listEnv").resolves(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: { ...envListCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envListCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("provisionCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "provisionResources").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...provisionCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await provisionCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("publishCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "publishApplication").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...publishCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await publishCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
});

describe("CLI read-only commands", () => {
  const sandbox = sinon.createSandbox();

  let messages: string[] = [];

  beforeEach(() => {
    sandbox.stub(logger, "info").callsFake(async (message: string) => {
      messages.push(message);
      return true;
    });
    sandbox.stub(logger, "error").callsFake(async (message: string) => {
      messages.push(message);
      return true;
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("accountShowCommand", async () => {
    it("both signedOut", async () => {
      sandbox.stub(M365TokenProvider, "getStatus").resolves(ok({ status: signedOut }));
      sandbox.stub(AzureTokenProvider, "getStatus").resolves({ status: signedOut });
      messages = [];
      const ctx: CLIContext = {
        command: { ...accountShowCommand, fullName: "teamsfx account show" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountShowCommand.handler!(ctx);
      assert.isTrue(res.isOk());
      assert.isTrue(
        messages.includes(
          "Use `teamsfx account login azure` or `teamsfx account login m365` to log in to Azure or Microsoft 365 account."
        )
      );
    });
    it("both signedIn and checkIsOnline = true", async () => {
      sandbox.stub(M365TokenProvider, "getStatus").resolves(ok({ status: signedIn }));
      sandbox.stub(AzureTokenProvider, "getStatus").resolves({ status: signedIn });
      sandbox.stub(codeFlowLogin, "checkIsOnline").resolves(true);
      const outputM365Info = sandbox.stub(accountUtils, "outputM365Info").resolves();
      const outputAzureInfo = sandbox.stub(accountUtils, "outputAzureInfo").resolves();
      messages = [];
      const ctx: CLIContext = {
        command: { ...accountShowCommand, fullName: "teamsfx account show" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountShowCommand.handler!(ctx);
      assert.isTrue(res.isOk());
      assert.isTrue(outputM365Info.calledOnce);
      assert.isTrue(outputAzureInfo.calledOnce);
    });
    it("both signedIn and checkIsOnline = false", async () => {
      sandbox
        .stub(M365TokenProvider, "getStatus")
        .resolves(ok({ status: signedIn, accountInfo: { upn: "xxx" } }));
      sandbox
        .stub(AzureTokenProvider, "getStatus")
        .resolves({ status: signedIn, accountInfo: { upn: "xxx" } });
      sandbox.stub(codeFlowLogin, "checkIsOnline").resolves(false);
      const outputAccountInfoOffline = sandbox
        .stub(accountUtils, "outputAccountInfoOffline")
        .resolves();
      messages = [];
      const ctx: CLIContext = {
        command: { ...accountShowCommand, fullName: "teamsfx account show" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountShowCommand.handler!(ctx);
      assert.isTrue(res.isOk());
      assert.isTrue(outputAccountInfoOffline.calledTwice);
    });
    it("M365TokenProvider.getStatus() returns error", async () => {
      sandbox.stub(M365TokenProvider, "getStatus").resolves(err(new UserCancelError()));
      messages = [];
      const ctx: CLIContext = {
        command: { ...accountShowCommand, fullName: "teamsfx account show" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountShowCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
  });

  describe("accountLogoutCommand", async () => {
    it("azure success", async () => {
      sandbox.stub(AzureTokenProvider, "signout").resolves(true);
      const ctx: CLIContext = {
        command: { ...accountLogoutCommand, fullName: "teamsfx account logout" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["azure"],
        telemetryProperties: {},
      };
      messages = [];
      const res = await accountLogoutCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("azure fail", async () => {
      sandbox.stub(AzureTokenProvider, "signout").resolves(false);
      const ctx: CLIContext = {
        command: { ...accountLogoutCommand, fullName: "teamsfx account logout" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["azure"],
        telemetryProperties: {},
      };
      messages = [];
      const res = await accountLogoutCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("m365 success", async () => {
      sandbox.stub(M365TokenProvider, "signout").resolves(true);
      const ctx: CLIContext = {
        command: { ...accountLogoutCommand, fullName: "teamsfx account logout" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["m365"],
        telemetryProperties: {},
      };
      const res = await accountLogoutCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("m365 fail", async () => {
      sandbox.stub(M365TokenProvider, "signout").resolves(false);
      const ctx: CLIContext = {
        command: { ...accountLogoutCommand, fullName: "teamsfx account logout" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["m365"],
        telemetryProperties: {},
      };
      messages = [];
      const res = await accountLogoutCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });

  describe("configGetCommand", async () => {
    it("printGlobalConfig all", async () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(ok({ a: 1, b: 2 }));
      const res = await printGlobalConfig();
      assert.isTrue(res.isOk());
      assert.isTrue(messages.includes(JSON.stringify({ a: 1, b: 2 }, null, 2)));
    });
    it("printGlobalConfig some key", async () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(ok({ a: { c: 3 }, b: 2 }));
      const res = await printGlobalConfig("a");
      assert.isTrue(res.isOk());
      assert.isTrue(messages.includes(JSON.stringify({ c: 3 }, null, 2)));
    });
    it("printGlobalConfig error", async () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(err(new UserCancelError()));
      const res = await printGlobalConfig();
      assert.isTrue(res.isErr());
    });
    it("configGetCommand", async () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(ok({ a: 1, b: 2 }));
      const ctx: CLIContext = {
        command: { ...configGetCommand, fullName: "teamsfx ..." },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["a"],
        telemetryProperties: {},
      };
      messages = [];
      const res = await configGetCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });

  describe("configSetCommand", async () => {
    it("configSetCommand", async () => {
      sandbox.stub(UserSettings, "setConfigSync").returns(ok(undefined));
      const ctx: CLIContext = {
        command: { ...configGetCommand, fullName: "teamsfx ..." },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["key", "value"],
        telemetryProperties: {},
      };
      const res = await configSetCommand.handler!(ctx);
      assert.isTrue(res.isOk());
      assert.isTrue(messages.includes(`Successfully set user configuration key.`));
    });
    it("configSetCommand error", async () => {
      sandbox.stub(UserSettings, "setConfigSync").returns(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: { ...configGetCommand, fullName: "teamsfx ..." },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["key", "value"],
        telemetryProperties: {},
      };
      const res = await configSetCommand.handler!(ctx);
      assert.isTrue(res.isErr());
      assert.isTrue(messages.includes("Set user configuration failed."));
    });
  });

  describe("listCapabilitiesCommand", async () => {
    it("success", async () => {
      sandbox.stub(UserSettings, "setConfigSync").returns(ok(undefined));
      const ctx: CLIContext = {
        command: { ...listCapabilitiesCommand, fullName: "teamsfx ..." },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["key", "value"],
        telemetryProperties: {},
      };
      const res = await listCapabilitiesCommand.handler!(ctx);
      assert.isTrue(res.isOk());
      assert.isTrue(messages.includes(JSON.stringify(CapabilityOptions.all(), undefined, 2)));
    });
  });
});
