// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok } from "@microsoft/teamsfx-api";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import Account, { AzureLogin, M365Login } from "../../../src/cmds/account";
import AzureTokenProvider from "../../../src/commonlib/azureLogin";
import * as codeFlowLogin from "../../../src/commonlib/codeFlowLogin";
import { signedIn, signedOut } from "../../../src/commonlib/common/constant";
import M365TokenProvider from "../../../src/commonlib/m365Login";
import { ConfigNotFoundError, NotFoundSubscriptionId } from "../../../src/error";
import * as Utils from "../../../src/utils";
import { expect, mockLogProvider, mockYargs } from "../utils";

describe("Account Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let messages: string[] = [];
  let mockedEnvRestore: RestoreFn = () => {};

  beforeEach(() => {
    mockYargs(sandbox);
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

  it("Builder Check - V2", () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new Account();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(cmd.subCommands).to.be.lengthOf(4);
  });

  it("Account Command Running Check", async () => {
    const cmd = new Account();
    await cmd.runCommand({});
  });

  it("Account Show Command Running Check - signedIn - V2", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    sandbox.stub(M365TokenProvider, "getStatus").resolves(ok({ status: signedIn }));
    sandbox.stub(M365TokenProvider, "getJsonObject").resolves(ok({ upn: "M365@xxx.com" }));
    sandbox.stub(AzureTokenProvider, "getStatus").resolves({ status: signedIn });
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves({ upn: "Azure@xxx.com" });
    sandbox.stub(AzureTokenProvider, "listSubscriptions").resolves([]);
    sandbox.stub(AzureTokenProvider, "readSubscription").resolves({
      subscriptionName: "",
      subscriptionId: "",
      tenantId: "",
    });
    sandbox.stub(AzureTokenProvider, "setRootPath");
    sandbox.stub(codeFlowLogin, "checkIsOnline").resolves(true);
    const cmd = new Account();
    const show = cmd.subCommands.find((cmd) => cmd.commandHead === "show");
    expect(show).not.to.be.undefined;
    await show!.runCommand({});
    expect(messages).to.be.lengthOf(2);
  });

  it("Account Show Command Running Check - Azure signedIn but no Active Sub - V2", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    sandbox.stub(M365TokenProvider, "getStatus").resolves(ok({ status: signedIn }));
    sandbox.stub(M365TokenProvider, "getJsonObject").resolves(ok({ upn: "M365@xxx.com" }));
    sandbox.stub(AzureTokenProvider, "getStatus").resolves({ status: signedIn });
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves({ upn: "Azure@xxx.com" });
    sandbox.stub(AzureTokenProvider, "listSubscriptions").resolves([]);
    sandbox.stub(AzureTokenProvider, "readSubscription").resolves(undefined);
    sandbox.stub(codeFlowLogin, "checkIsOnline").resolves(true);
    const cmd = new Account();
    const show = cmd.subCommands.find((cmd) => cmd.commandHead === "show");
    expect(show).not.to.be.undefined;
    await show!.runCommand({});
    expect(messages).to.be.lengthOf(4);
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

  it("Account Show Command Running Check - Failed - V2", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    sandbox.stub(M365TokenProvider, "getStatus").resolves(ok({ status: signedIn }));
    sandbox.stub(M365TokenProvider, "getJsonObject").resolves(ok({ upn: "M365@xxx.com" }));
    sandbox.stub(AzureTokenProvider, "getStatus").resolves({ status: signedIn });
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves({ upn: "Azure@xxx.com" });
    sandbox.stub(AzureTokenProvider, "listSubscriptions").resolves([]);
    sandbox.stub(AzureTokenProvider, "readSubscription").rejects(ConfigNotFoundError("test"));
    sandbox.stub(codeFlowLogin, "checkIsOnline").resolves(true);
    const cmd = new Account();
    const show = cmd.subCommands.find((cmd) => cmd.commandHead === "show");
    expect(show).not.to.be.undefined;
    await show!.runCommand({});
    expect(messages).to.be.lengthOf(3);
  });

  it("Account Login Azure Command Running Check - Success", async () => {
    sandbox.stub(AzureTokenProvider, "signout");
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves({ upn: "Azure@xxx.com" });
    sandbox.stub(AzureTokenProvider, "listSubscriptions").resolves([]);
    const cmd = new AzureLogin();
    await cmd!.runCommand({});
    expect(messages).to.be.lengthOf(2);
  });

  it("Account Login Azure Command Running Check - Success - V2", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    sandbox.stub(AzureTokenProvider, "signout");
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves({ upn: "Azure@xxx.com" });
    sandbox.stub(AzureTokenProvider, "listSubscriptions").resolves([]);
    const cmd = new AzureLogin();
    await cmd!.runCommand({});
    expect(messages).to.be.lengthOf(3);
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

  it("Account Login M365 Command Running Check - Success - V2", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    sandbox.stub(M365TokenProvider, "signout");
    sandbox.stub(M365TokenProvider, "getJsonObject").resolves(ok({ upn: "M365@xxx.com" }));
    const cmd = new M365Login();
    await cmd!.runCommand({});
    expect(messages).to.be.lengthOf(1);
  });

  it("Account Login M365 Command Running Check - Failed", async () => {
    sandbox.stub(M365TokenProvider, "signout");
    sandbox.stub(M365TokenProvider, "getJsonObject").resolves(err(ConfigNotFoundError("test")));
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

  it("Account Set Subscription Command Running Check - Success", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    sandbox.stub(Utils, "setSubscriptionId").resolves(ok(null));
    sandbox.stub(AzureTokenProvider, "getJsonObject").resolves({ upn: "Azure@xxx.com" });
    sandbox.stub(AzureTokenProvider, "listSubscriptions").resolves([]);
    const cmd = new Account();
    const set = cmd.subCommands.find((cmd) => cmd.commandHead === "set");
    await set!.runCommand({});
    expect(messages).to.be.lengthOf(3);
  });

  it("Account Set Subscription Command Running Check - Failed", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    sandbox.stub(Utils, "setSubscriptionId").resolves(err(NotFoundSubscriptionId()));
    const cmd = new Account();
    const set = cmd.subCommands.find((cmd) => cmd.commandHead === "set");
    const result = await set!.runCommand({});
    expect(result.isErr()).to.be.true;
  });
});
