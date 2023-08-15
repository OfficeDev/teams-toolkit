// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Alive-Fish <547850391@qq.com>
 */
import { err, FxError, ok, Result, SystemError, Void } from "@microsoft/teamsfx-api";
import { FxCore, MissingEnvironmentVariablesError, UserCancelError } from "@microsoft/teamsfx-core";
import { VersionState } from "@microsoft/teamsfx-core";
import { VersionCheckRes } from "@microsoft/teamsfx-core";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs, { Options } from "yargs";
import { WorkspaceNotSupported } from "../../src/cmds/preview/errors";
import { default as CLIUIInstance, default as UI } from "../../src/userInteraction";
import { printError, YargsCommand } from "../../src/yargsCommand";
import { expect, mockLogProvider } from "./utils";
import CLILogProvider from "../../src/commonlib/log";
import { CLILogLevel } from "../../src/constants";

class TestCommand extends YargsCommand {
  public commandHead = "test";
  public command = "test";
  public description = "test";
  public params: { [_: string]: Options } = {};

  public builder(yargs: yargs.Argv): yargs.Argv {
    return yargs;
  }

  public async runCommand(args: { [argName: string]: any }): Promise<Result<any, FxError>> {
    return ok(null);
  }
}

describe("Yargs Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let logs: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};

  beforeEach(() => {
    mockLogProvider(sandbox, logs);
    sandbox.stub(process, "exit");
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox.stub(UI, "updatePresetAnswers").returns(void 0);
    CLIUIInstance.interactive = false;
    logs = [];
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("- failed to check project version", async () => {
    sandbox
      .stub(FxCore.prototype, "projectVersionCheck")
      .resolves(err(WorkspaceNotSupported("./")));
    const cmd = new TestCommand();
    await expect(cmd.handler({ folder: "test" })).to.be.rejected;
  });

  it("- project not support", async () => {
    sandbox.stub(FxCore.prototype, "projectVersionCheck").resolves(
      ok<VersionCheckRes, FxError>({
        isSupport: VersionState.unsupported,
        versionSource: "",
        currentVersion: "1.0.0",
        trackingId: "",
      })
    );
    const cmd = new TestCommand();
    await expect(cmd.handler({ folder: "test" })).to.be.rejected;
  });

  it("- project upgradable (upgrade)", async () => {
    sandbox.stub(FxCore.prototype, "projectVersionCheck").resolves(
      ok<VersionCheckRes, FxError>({
        isSupport: VersionState.upgradeable,
        versionSource: "",
        currentVersion: "1.0.0",
        trackingId: "",
      })
    );
    sandbox.stub(FxCore.prototype, "phantomMigrationV3").resolves(ok(undefined));
    const cmd = new TestCommand();
    await cmd.handler({ folder: "test" });
  });

  it("- project upgradable (cancel)", async () => {
    sandbox.stub(FxCore.prototype, "projectVersionCheck").resolves(
      ok<VersionCheckRes, FxError>({
        isSupport: VersionState.upgradeable,
        versionSource: "",
        currentVersion: "1.0.0",
        trackingId: "",
      })
    );
    sandbox.stub(FxCore.prototype, "phantomMigrationV3").resolves(err(WorkspaceNotSupported("./")));
    const cmd = new TestCommand();
    await expect(cmd.handler({ folder: "test" })).to.be.rejected;
  });
});

describe("printError", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("happy path user error", async () => {
    sandbox.stub(CLILogProvider, "getLogLevel").returns(CLILogLevel.debug);
    const stub = sandbox.stub(CLILogProvider, "outputError").returns();
    printError(new MissingEnvironmentVariablesError("test", "test"));
    expect(stub.called).to.be.true;
  });
  it("happy path system error", async () => {
    sandbox.stub(CLILogProvider, "getLogLevel").returns(CLILogLevel.debug);
    const stub = sandbox.stub(CLILogProvider, "outputError").returns();
    const error = new SystemError({ issueLink: "http://aka.ms/teamsfx-cli-help" });
    printError(error);
    expect(stub.called).to.be.true;
  });
  it("happy path inner error", async () => {
    sandbox.stub(CLILogProvider, "getLogLevel").returns(CLILogLevel.debug);
    const stub = sandbox.stub(CLILogProvider, "outputError").returns();
    const error = new SystemError({ issueLink: "http://aka.ms/teamsfx-cli-help" });
    const innerError = new Error("test");
    error.innerError = innerError;
    error.message = "";
    error.stack = undefined;
    printError(error);
    innerError.stack = undefined;
    printError(error);
    expect(stub.called).to.be.true;
  });
  it("canceled", async () => {
    const stub = sandbox.stub(CLILogProvider, "necessaryLog").returns();
    printError(new UserCancelError("test"));
    expect(stub.called).to.be.true;
  });
});
