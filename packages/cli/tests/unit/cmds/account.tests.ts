// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok } from "@microsoft/teamsfx-api";
import { M365TokenJSONNotFoundError } from "@microsoft/teamsfx-core";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import Account, { AccountLogin, AzureLogin, M365Login } from "../../../src/cmds/account";
import AzureTokenProvider from "../../../src/commonlib/azureLogin";
import { signedOut } from "../../../src/commonlib/common/constant";
import M365TokenProvider from "../../../src/commonlib/m365Login";
import { expect, mockLogProvider, mockTelemetry, mockYargs } from "../utils";

describe("Account Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let messages: string[] = [];
  const telemetryEvents: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};

  beforeEach(() => {
    mockYargs(sandbox);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox, messages);
  });

  afterEach(() => {
    sandbox.restore();
    messages = [];
    mockedEnvRestore();
  });

  it("Builder Check", () => {
    const cmd = new Account();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(cmd.subCommands).to.be.lengthOf(3);
  });

  it("Account Command Running Check", async () => {
    const cmd = new Account();
    await cmd.runCommand({});
  });
  it("Account Login ", async () => {
    const cmd = new AccountLogin();
    await cmd.runCommand({});
  });
  it("Account Show Command Running Check - signedOut", async () => {
    sandbox.stub(M365TokenProvider, "getStatus").resolves(ok({ status: signedOut }));
    sandbox.stub(AzureTokenProvider, "getStatus").resolves({ status: signedOut });
    const cmd = new Account();
    const show = cmd.subCommands.find((cmd) => cmd.commandHead === "show");
    expect(show).not.to.be.undefined;
    await show!.runCommand({});
    expect(messages).to.be.lengthOf(1);
  });

  it("Account Login Azure Command Running Check - Success", async () => {
    sandbox.stub(AzureTokenProvider, "signout");
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves({ upn: "Azure@xxx.com" });
    sandbox.stub(AzureTokenProvider, "listSubscriptions").resolves([]);
    const cmd = new AzureLogin();
    await cmd!.runCommand({});
    expect(messages).to.be.lengthOf(2);
  });

  it("Account Login Azure Command Running Check - Failed", async () => {
    sandbox.stub(AzureTokenProvider, "signout");
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves(undefined);
    const cmd = new AzureLogin();
    await cmd!.runCommand({});
    expect(messages).to.be.lengthOf(1);
  });

  it("Account Login M365 Command Running Check - Success", async () => {
    sandbox.stub(M365TokenProvider, "signout");
    sandbox.stub(M365TokenProvider, "getJsonObject").resolves(ok({ upn: "M365@xxx.com" }));
    const cmd = new M365Login();
    await cmd!.runCommand({});
    expect(messages).to.be.lengthOf(2);
  });

  it("Account Login M365 Command Running Check - Failed", async () => {
    sandbox.stub(M365TokenProvider, "signout");
    sandbox
      .stub(M365TokenProvider, "getJsonObject")
      .resolves(err(new M365TokenJSONNotFoundError()));
    const cmd = new M365Login();
    await cmd!.runCommand({});
    expect(messages).to.be.lengthOf(1);
  });

  it("Account Logout Azure Command Running Check - Success", async () => {
    sandbox.stub(AzureTokenProvider, "signout").resolves(true);
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.runCommand({ service: "azure" });
    expect(messages).to.be.lengthOf(1);
  });

  it("Account Logout Azure Command Running Check - Failed", async () => {
    sandbox.stub(AzureTokenProvider, "signout").resolves(false);
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.runCommand({ service: "azure" });
    expect(messages).to.be.lengthOf(1);
  });

  it("Account Logout M365 Command Running Check - Success", async () => {
    sandbox.stub(AzureTokenProvider, "signout").resolves(true);
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.runCommand({ service: "m365" });
    expect(messages).to.be.lengthOf(1);
  });

  it("Account Logout M365 Command Running Check - Failed", async () => {
    sandbox.stub(AzureTokenProvider, "signout").resolves(false);
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.runCommand({ service: "m365" });
    expect(messages).to.be.lengthOf(1);
  });
});
