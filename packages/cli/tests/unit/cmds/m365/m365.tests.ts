// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, LogLevel, ok } from "@microsoft/teamsfx-api";
import { PackageService } from "@microsoft/teamsfx-core";
import sinon from "sinon";
import yargs, { Options } from "yargs";

import { expect } from "../../utils";
import M365 from "../../../../src/cmds/m365/m365";
import M365TokenProvider from "../../../../src/commonlib/m365Login";
import CLILogProvider from "../../../../src/commonlib/log";
import { signedIn } from "../../../../src/commonlib/common/constant";
import { CLILogLevel } from "../../../../src/constants";
import { UserCancelError } from "@microsoft/teamsfx-core";

describe("M365", () => {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let logs: string[] = [];
  let logLevel = CLILogProvider.getLogLevel();

  afterEach(() => {
    sandbox.restore();
    CLILogProvider.setLogLevel(logLevel);
  });

  beforeEach(() => {
    registeredCommands = [];
    logs = [];
    sandbox.stub(process, "exit");
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(yargs, "options").callsFake((ops: { [key: string]: Options }) => {
      return yargs;
    });
    sandbox.stub(CLILogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
    });
    sandbox.stub(CLILogProvider, "log").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
      return Promise.resolve(true);
    });
    logLevel = CLILogProvider.getLogLevel();
    CLILogProvider.setLogLevel(CLILogLevel.error);
  });

  it("M365 is empty command", async () => {
    const m365 = new M365();
    m365.builder(yargs);
    expect(registeredCommands).deep.equals(["sideloading", "unacquire", "launchinfo"]);

    const res = await m365.runCommand({});
    expect(res.isOk()).to.be.true;
    expect((res as any).value).equals(null);
  });

  it("M365 Sideloading command", async () => {
    sandbox.stub(M365TokenProvider, "getAccessToken").returns(Promise.resolve(ok("test-token")));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .returns(Promise.resolve(ok({ status: signedIn, accountInfo: { upn: "test" } })));
    sandbox.stub(PackageService.prototype, "sideLoading").resolves();

    const m365 = new M365();
    const sideloading = m365.subCommands.find((cmd) => cmd.commandHead === "sideloading");
    expect(sideloading).not.undefined;

    await sideloading!.handler({ "file-path": "test" });
    expect(logs.length).greaterThan(0);
  });

  it("M365 Unacquire command (title-id)", async () => {
    sandbox.stub(M365TokenProvider, "getAccessToken").returns(Promise.resolve(ok("test-token")));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .returns(Promise.resolve(ok({ status: signedIn, accountInfo: { upn: "test" } })));
    sandbox.stub(PackageService.prototype, "unacquire").resolves();

    const m365 = new M365();
    const unacquire = m365.subCommands.find((cmd) => cmd.commandHead === "unacquire");
    expect(unacquire).not.undefined;

    await unacquire!.handler({ "title-id": "test-title-id" });
    expect(logs.length).greaterThan(0);
  });

  it("M365 Unacquire command (manifest-id)", async () => {
    sandbox.stub(M365TokenProvider, "getAccessToken").returns(Promise.resolve(ok("test-token")));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .returns(Promise.resolve(ok({ status: signedIn, accountInfo: { upn: "test" } })));
    sandbox.stub(PackageService.prototype, "retrieveTitleId").resolves("test-title-id");
    sandbox.stub(PackageService.prototype, "unacquire").resolves();

    const m365 = new M365();
    const unacquire = m365.subCommands.find((cmd) => cmd.commandHead === "unacquire");
    expect(unacquire).not.undefined;

    await unacquire!.handler({ "manifest-id": "test" });
    expect(logs.length).greaterThan(0);
  });

  it("M365 Unacquire command (undefined)", async () => {
    const m365 = new M365();
    const unacquire = m365.subCommands.find((cmd) => cmd.commandHead === "unacquire");
    expect(unacquire).not.undefined;

    const result = await unacquire!.runCommand({});
    expect(result).not.undefined;
    expect(result.isErr()).to.be.true;
  });

  it("M365 LaunchInfo command (title-id)", async () => {
    sandbox.stub(M365TokenProvider, "getAccessToken").returns(Promise.resolve(ok("test-token")));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .returns(Promise.resolve(ok({ status: signedIn, accountInfo: { upn: "test" } })));
    sandbox.stub(PackageService.prototype, "getLaunchInfoByTitleId").resolves({ foo: "bar" });

    const m365 = new M365();
    const launchInfo = m365.subCommands.find((cmd) => cmd.commandHead === "launchinfo");
    expect(launchInfo).not.undefined;

    await launchInfo!.handler({ "title-id": "test-title-id" });
    expect(logs.length).greaterThan(0);
  });

  it("M365 LaunchInfo command (manifest-id)", async () => {
    sandbox.stub(M365TokenProvider, "getAccessToken").returns(Promise.resolve(ok("test-token")));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .returns(Promise.resolve(ok({ status: signedIn, accountInfo: { upn: "test" } })));
    sandbox.stub(PackageService.prototype, "retrieveTitleId").resolves("test-title-id");
    sandbox.stub(PackageService.prototype, "getLaunchInfoByTitleId").resolves({ foo: "bar" });

    const m365 = new M365();
    const launchInfo = m365.subCommands.find((cmd) => cmd.commandHead === "launchinfo");
    expect(launchInfo).not.undefined;

    await launchInfo!.handler({ "manifest-id": "test" });
    expect(logs.length).greaterThan(0);
  });

  it("M365 LaunchInfo command (undefined)", async () => {
    const m365 = new M365();
    const launchInfo = m365.subCommands.find((cmd) => cmd.commandHead === "launchinfo");
    expect(launchInfo).not.undefined;

    const result = await launchInfo!.runCommand({});
    expect(result).not.undefined;
    expect(result.isErr()).to.be.true;
  });

  it("M365 Token Error", async () => {
    sandbox
      .stub(M365TokenProvider, "getAccessToken")
      .returns(Promise.resolve(err(new UserCancelError())));

    const m365 = new M365();
    const sideloading = m365.subCommands.find((cmd) => cmd.commandHead === "sideloading");
    expect(sideloading).not.undefined;

    let actualError = undefined;
    try {
      await sideloading!.runCommand({});
    } catch (error) {
      actualError = error;
    }
    expect(actualError).not.undefined;
  });

  it("M365 UPN undefined", async () => {
    sandbox.stub(M365TokenProvider, "getAccessToken").returns(Promise.resolve(ok("test-token")));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .returns(Promise.resolve(err(new UserCancelError())));
    sandbox.stub(PackageService.prototype, "retrieveTitleId").resolves("test-title-id");
    sandbox.stub(PackageService.prototype, "getLaunchInfoByTitleId").resolves({ foo: "bar" });

    const m365 = new M365();
    const launchInfo = m365.subCommands.find((cmd) => cmd.commandHead === "launchinfo");
    expect(launchInfo).not.undefined;

    await launchInfo!.handler({ "manifest-id": "test" });
    expect(logs.length).greaterThan(0);
  });
});
