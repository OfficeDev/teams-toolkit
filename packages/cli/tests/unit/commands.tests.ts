import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { createCommand } from "../../src/commands/models/create";
import * as activate from "../../src/activate";
import { FxCore, UserCancelError } from "@microsoft/teamsfx-core";
import { err, ok } from "@microsoft/teamsfx-api";
import { CLIContext } from "../../src/commands/types";
import { createSampleCommand } from "../../src/commands/models/createSample";
import { listSampleCommand } from "../../src/commands/models/listSamples";
import { accountShowCommand } from "../../src/commands/models/accountShow";
import { accountLoginAzureCommand } from "../../src/commands/models/accountLoginAzure";
import { accountLoginM365Command } from "../../src/commands/models/accountLoginM365";
import { accountLogoutCommand } from "../../src/commands/models/accountLogout";
import { logger } from "../../src/commonlib/logger";
import AzureTokenProvider from "../../src/commonlib/azureLogin";
import { signedIn, signedOut } from "../../src/commonlib/common/constant";
import M365TokenProvider from "../../src/commonlib/m365Login";
import * as utils from "../../src/utils";
import * as codeFlowLogin from "../../src/commonlib/codeFlowLogin";
import * as accountUtils from "../../src/cmds/account";

describe("CLI new commands", () => {
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
      sandbox.stub(FxCore.prototype, "createProject").resolves(ok("..."));
      const ctx: CLIContext = {
        command: createCommand,
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
        command: createCommand,
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
      sandbox.stub(FxCore.prototype, "createProject").resolves(ok("..."));
      const ctx: CLIContext = {
        command: createSampleCommand,
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
        command: createSampleCommand,
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
        command: listSampleCommand,
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await listSampleCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("accountLoginAzureCommand", async () => {
    it("should success when service-principal = false", async () => {
      sandbox.stub(AzureTokenProvider, "signout");
      sandbox.stub(accountUtils, "outputAzureInfo").resolves();
      const ctx: CLIContext = {
        command: accountLoginAzureCommand,
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
        command: accountLoginAzureCommand,
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
        command: accountLoginAzureCommand,
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
        command: accountLoginM365Command,
        optionValues: { "service-principal": false },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await accountLoginM365Command.handler!(ctx);
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
        command: accountShowCommand,
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
        command: accountShowCommand,
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
        command: accountShowCommand,
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
        command: accountShowCommand,
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
        command: accountLogoutCommand,
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
        command: accountLogoutCommand,
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
        command: accountLogoutCommand,
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
        command: accountLogoutCommand,
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
});
