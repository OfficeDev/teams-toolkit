import { CLIContext, err, ok } from "@microsoft/teamsfx-api";
import {
  CapabilityOptions,
  CollaborationStateResult,
  FxCore,
  ListCollaboratorResult,
  PackageService,
  PermissionsResult,
  UserCancelError,
  envUtil,
} from "@microsoft/teamsfx-core";
import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import * as activate from "../../src/activate";
import * as accountUtils from "../../src/cmds/account";
import * as m365 from "../../src/cmds/m365/m365";
import { localTelemetryReporter } from "../../src/cmds/preview/localTelemetryReporter";
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
  m365LaunchInfoCommand,
  m365SideloadingCommand,
  m365UnacquireCommand,
  packageCommand,
  permissionGrantCommand,
  permissionStatusCommand,
  previewCommand,
  printGlobalConfig,
  provisionCommand,
  publishCommand,
  updateAadAppCommand,
  updateTeamsAppCommand,
  upgradeCommand,
  validateCommand,
} from "../../src/commands/models";
import AzureTokenProvider from "../../src/commonlib/azureLogin";
import * as codeFlowLogin from "../../src/commonlib/codeFlowLogin";
import { signedIn, signedOut } from "../../src/commonlib/common/constant";
import { logger } from "../../src/commonlib/logger";
import M365TokenProvider from "../../src/commonlib/m365Login";
import { UserSettings } from "../../src/userSetttings";
import * as utils from "../../src/utils";
import { MissingRequiredOptionError } from "../../src/error";

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
      sandbox.stub(utils, "isWorkspaceSupported").returns(true);
      const ctx: CLIContext = {
        command: { ...envAddCommand, fullName: "teamsfx" },
        optionValues: { projectPath: "." },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envAddCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("isWorkspaceSupported: false", async () => {
      sandbox.stub(FxCore.prototype, "createEnv").resolves(ok(undefined));
      sandbox.stub(utils, "isWorkspaceSupported").returns(false);
      const ctx: CLIContext = {
        command: { ...envAddCommand, fullName: "teamsfx" },
        optionValues: { projectPath: "." },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envAddCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
  });
  describe("envListCommand", async () => {
    it("success", async () => {
      sandbox.stub(utils, "isWorkspaceSupported").returns(true);
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev"]));
      const ctx: CLIContext = {
        command: { ...envListCommand, fullName: "teamsfx" },
        optionValues: { projectPath: "." },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envListCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("isWorkspaceSupported: false", async () => {
      sandbox.stub(FxCore.prototype, "createEnv").resolves(ok(undefined));
      sandbox.stub(utils, "isWorkspaceSupported").returns(false);
      const ctx: CLIContext = {
        command: { ...envAddCommand, fullName: "teamsfx" },
        optionValues: { projectPath: "." },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envAddCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
    it("listEnv error", async () => {
      sandbox.stub(utils, "isWorkspaceSupported").returns(true);
      sandbox.stub(envUtil, "listEnv").resolves(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: { ...envListCommand, fullName: "teamsfx" },
        optionValues: { projectPath: "." },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await envListCommand.handler!(ctx);
      assert.isTrue(res.isErr());
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
  describe("packageCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "createAppPackage").resolves(ok({ state: "OK" }));
      const ctx: CLIContext = {
        command: { ...packageCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await packageCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("permissionGrantCommand", async () => {
    it("success", async () => {
      sandbox
        .stub(FxCore.prototype, "grantPermission")
        .resolves(ok({ state: "OK" } as PermissionsResult));
      const ctx: CLIContext = {
        command: { ...permissionGrantCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await permissionGrantCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("permissionStatusCommand", async () => {
    it("listCollaborator", async () => {
      sandbox
        .stub(FxCore.prototype, "listCollaborator")
        .resolves(ok({ state: "OK" } as ListCollaboratorResult));
      const ctx: CLIContext = {
        command: { ...permissionStatusCommand, fullName: "teamsfx" },
        optionValues: { all: true },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await permissionStatusCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("checkPermission", async () => {
      sandbox
        .stub(FxCore.prototype, "checkPermission")
        .resolves(ok({ state: "OK" } as CollaborationStateResult));
      const ctx: CLIContext = {
        command: { ...permissionStatusCommand, fullName: "teamsfx" },
        optionValues: { all: false },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await permissionStatusCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("publishCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "publishApplication").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...publishCommand, fullName: "teamsfx" },
        optionValues: { env: "local" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await publishCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("previewCommand", async () => {
    it("success", async () => {
      sandbox.stub(localTelemetryReporter, "runWithTelemetryGeneric").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...previewCommand, fullName: "teamsfx" },
        optionValues: { env: "local" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await previewCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("error", async () => {
      sandbox
        .stub(localTelemetryReporter, "runWithTelemetryGeneric")
        .resolves(err(new UserCancelError()));
      const ctx: CLIContext = {
        command: { ...previewCommand, fullName: "teamsfx" },
        optionValues: { env: "local" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await previewCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
  });
  describe("updateAadAppCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "deployAadManifest").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...updateAadAppCommand, fullName: "teamsfx" },
        optionValues: { env: "local" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await updateAadAppCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("updateTeamsAppCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "deployTeamsManifest").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...updateTeamsAppCommand, fullName: "teamsfx" },
        optionValues: { env: "local" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await updateTeamsAppCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("upgradeCommand", async () => {
    it("success", async () => {
      sandbox.stub(FxCore.prototype, "phantomMigrationV3").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...upgradeCommand, fullName: "teamsfx" },
        optionValues: { force: true },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await upgradeCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });
  describe("validateCommand", async () => {
    it("conflict", async () => {
      sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...validateCommand, fullName: "teamsfx" },
        optionValues: { "manifest-path": "aaa", "app-package-file-path": "bbb" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await validateCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
    it("none", async () => {
      sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...validateCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await validateCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
    it("manifest", async () => {
      sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...validateCommand, fullName: "teamsfx" },
        optionValues: { "manifest-path": "aaa", env: "dev" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await validateCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("manifest missing env", async () => {
      sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...validateCommand, fullName: "teamsfx" },
        optionValues: { "manifest-path": "aaa" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await validateCommand.handler!(ctx);
      assert.isTrue(res.isErr() && res.error instanceof MissingRequiredOptionError);
    });
    it("package", async () => {
      sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(undefined));
      const ctx: CLIContext = {
        command: { ...validateCommand, fullName: "teamsfx" },
        optionValues: { "app-package-file-path": "bbb" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await validateCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });

  describe("m365LaunchInfoCommand", async () => {
    beforeEach(() => {
      sandbox.stub(logger, "warning");
    });
    it("success retrieveTitleId", async () => {
      sandbox.stub(m365, "getTokenAndUpn").resolves(["token", "upn"]);
      sandbox.stub(PackageService.prototype, "retrieveTitleId").resolves("id");
      sandbox.stub(PackageService.prototype, "getLaunchInfoByTitleId").resolves("id");
      const ctx: CLIContext = {
        command: { ...m365LaunchInfoCommand, fullName: "teamsfx" },
        optionValues: { "manifest-id": "aaa" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await m365LaunchInfoCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("success", async () => {
      sandbox.stub(m365, "getTokenAndUpn").resolves(["token", "upn"]);
      sandbox.stub(PackageService.prototype, "getLaunchInfoByTitleId").resolves("id");
      const ctx: CLIContext = {
        command: { ...m365LaunchInfoCommand, fullName: "teamsfx" },
        optionValues: { "title-id": "aaa" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await m365LaunchInfoCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("MissingRequiredOptionError", async () => {
      sandbox.stub(m365, "getTokenAndUpn").resolves(["token", "upn"]);
      const ctx: CLIContext = {
        command: { ...m365LaunchInfoCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await m365LaunchInfoCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
  });

  describe("m365SideloadingCommand", async () => {
    beforeEach(() => {
      sandbox.stub(logger, "warning");
    });
    it("success", async () => {
      sandbox.stub(m365, "getTokenAndUpn").resolves(["token", "upn"]);
      sandbox.stub(PackageService.prototype, "sideLoading").resolves();
      const ctx: CLIContext = {
        command: { ...m365SideloadingCommand, fullName: "teamsfx" },
        optionValues: { "manifest-id": "aaa" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await m365SideloadingCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
  });

  describe("m365UnacquireCommand", async () => {
    beforeEach(() => {
      sandbox.stub(logger, "warning");
    });
    it("MissingRequiredOptionError", async () => {
      sandbox.stub(m365, "getTokenAndUpn").resolves(["token", "upn"]);
      const ctx: CLIContext = {
        command: { ...m365UnacquireCommand, fullName: "teamsfx" },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await m365UnacquireCommand.handler!(ctx);
      assert.isTrue(res.isErr());
    });
    it("success retrieveTitleId", async () => {
      sandbox.stub(m365, "getTokenAndUpn").resolves(["token", "upn"]);
      sandbox.stub(PackageService.prototype, "retrieveTitleId").resolves("id");
      sandbox.stub(PackageService.prototype, "unacquire").resolves();
      const ctx: CLIContext = {
        command: { ...m365UnacquireCommand, fullName: "teamsfx" },
        optionValues: { "manifest-id": "aaa" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await m365UnacquireCommand.handler!(ctx);
      assert.isTrue(res.isOk());
    });
    it("success", async () => {
      sandbox.stub(m365, "getTokenAndUpn").resolves(["token", "upn"]);
      sandbox.stub(PackageService.prototype, "unacquire").resolves();
      const ctx: CLIContext = {
        command: { ...m365UnacquireCommand, fullName: "teamsfx" },
        optionValues: { "title-id": "aaa" },
        globalOptionValues: {},
        argumentValues: [],
        telemetryProperties: {},
      };
      const res = await m365UnacquireCommand.handler!(ctx);
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
  describe("listSamplesCommand", async () => {
    it("success", async () => {
      sandbox.stub(utils, "getTemplates").resolves([]);
      const ctx: CLIContext = {
        command: { ...listSamplesCommand, fullName: "teamsfx ..." },
        optionValues: {},
        globalOptionValues: {},
        argumentValues: ["key", "value"],
        telemetryProperties: {},
      };
      const res = await listSamplesCommand.handler!(ctx);
      assert.isTrue(res.isOk());
      assert.isTrue(messages.includes(JSON.stringify([], undefined, 2)));
    });
  });
});
