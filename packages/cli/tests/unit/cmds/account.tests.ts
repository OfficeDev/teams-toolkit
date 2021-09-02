// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, LogLevel, ok, UserError } from "@microsoft/teamsfx-api";

import Account from "../../../src/cmds/account";
import * as Utils from "../../../src/utils";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotFoundSubscriptionId } from "../../../src/error";
import AppStudioTokenProvider from "../../../src/commonlib/appStudioLogin";
import AzureTokenProvider from "../../../src/commonlib/azureLogin";
import { signedIn, signedOut } from "../../../src/commonlib/common/constant";

describe("Account Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let loglevels: LogLevel[] = [];

  before(() => {
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(yargs, "options").callsFake((ops: { [key: string]: Options }) => {
      if (typeof ops === "string") {
        options.push(ops);
      } else {
        options = options.concat(...Object.keys(ops));
      }
      return yargs;
    });
    sandbox.stub(yargs, "positional").callsFake((name: string) => {
      positionals.push(name);
      return yargs;
    });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      loglevels.push(level);
    });

    sandbox
      .stub(AzureTokenProvider, "getSubscriptionInfoFromEnv")
      .onFirstCall()
      .returns(
        Promise.resolve({
          subscriptionId: "subscriptionId",
          subscriptionName: "subscriptionName",
          tenantId: "tenantId",
        })
      )
      .onSecondCall()
      .returns(Promise.resolve(undefined));
    sandbox.stub(Utils, "setSubscriptionId").callsFake(async (id?: string, folder?: string) => {
      if (!id) return ok(null);
      else return err(NotFoundSubscriptionId());
    });

    sandbox
      .stub(AppStudioTokenProvider, "getStatus")
      .onFirstCall()
      .returns(Promise.resolve({ status: signedIn }))
      .onSecondCall()
      .returns(Promise.resolve({ status: signedOut }))
      .onThirdCall()
      .returns(Promise.resolve({ status: signedOut }));
    sandbox
      .stub(AppStudioTokenProvider, "getJsonObject")
      .onFirstCall()
      .returns(Promise.resolve({ upn: "M365@xxx.com" }))
      .onSecondCall()
      .returns(Promise.resolve({ upn: "M365@xxx.com" }))
      .onThirdCall()
      .returns(Promise.resolve(undefined));
    sandbox
      .stub(AppStudioTokenProvider, "signout")
      .onFirstCall()
      .returns(Promise.resolve(true))
      .onSecondCall()
      .returns(Promise.resolve(true))
      .onThirdCall()
      .returns(Promise.resolve(true))
      .onCall(4)
      .returns(Promise.resolve(false));

    sandbox
      .stub(AzureTokenProvider, "getStatus")
      .onFirstCall()
      .returns(Promise.resolve({ status: signedIn }))
      .onSecondCall()
      .returns(Promise.resolve({ status: signedIn }))
      .onThirdCall()
      .returns(Promise.resolve({ status: signedOut }));
    sandbox
      .stub(AzureTokenProvider, "getAccountCredentialAsync")
      .onFirstCall()
      .returns(Promise.resolve({ username: "Azure@xxx.com" } as any))
      .onSecondCall()
      .returns(Promise.resolve({ username: "Azure@xxx.com" } as any))
      .onThirdCall()
      .returns(Promise.resolve({ username: "Azure@xxx.com" } as any))
      .onCall(4)
      .returns(Promise.resolve(undefined))
      .onCall(5)
      .returns(Promise.resolve(undefined))
      .onCall(6)
      .returns(Promise.resolve(undefined));
    sandbox.stub(AzureTokenProvider, "listSubscriptions").returns(Promise.resolve([]));
    sandbox
      .stub(AzureTokenProvider, "signout")
      .onFirstCall()
      .returns(Promise.resolve(true))
      .onSecondCall()
      .returns(Promise.resolve(true))
      .onThirdCall()
      .returns(Promise.resolve(true))
      .onCall(4)
      .returns(Promise.resolve(false));
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    options = [];
    positionals = [];
    loglevels = [];
  });

  it("Builder Check", () => {
    const cmd = new Account();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals([
      "account <action>",
      "show",
      "login <service>",
      "logout <service>",
      "set",
    ]);
    expect(options).deep.equals(["action", "tenant", "folder", "subscription"]);
    expect(positionals).deep.equals(["service", "service"]);
  });

  it("Account Command Running Check", async () => {
    const cmd = new Account();
    await cmd.handler({});
  });

  it("Account Show Command Running Check - signedIn", async () => {
    const cmd = new Account();
    const show = cmd.subCommands.find((cmd) => cmd.commandHead === "show");
    await show!.handler({});
    expect(loglevels).deep.equals([LogLevel.Info, LogLevel.Info]);
  });

  it("Account Show Command Running Check - Azure signedIn but no Active Sub", async () => {
    const cmd = new Account();
    const show = cmd.subCommands.find((cmd) => cmd.commandHead === "show");
    await show!.handler({});
    expect(loglevels).deep.equals([LogLevel.Info, LogLevel.Info, LogLevel.Info]);
  });

  it("Account Show Command Running Check - signedOut", async () => {
    const cmd = new Account();
    const show = cmd.subCommands.find((cmd) => cmd.commandHead === "show");
    await show!.handler({});
    expect(loglevels).deep.equals([LogLevel.Info]);
  });

  it("Account Login Azure Command Running Check - Success", async () => {
    const cmd = new Account();
    const login = cmd.subCommands.find((cmd) => cmd.commandHead === "login");
    await login!.handler({ service: "azure" });
    expect(loglevels).deep.equals([LogLevel.Info, LogLevel.Info, LogLevel.Info]);
  });

  it("Account Login Azure Command Running Check - Failed", async () => {
    const cmd = new Account();
    const login = cmd.subCommands.find((cmd) => cmd.commandHead === "login");
    await login!.handler({ service: "azure" });
    expect(loglevels).deep.equals([LogLevel.Error]);
  });

  it("Account Login M365 Command Running Check - Success", async () => {
    const cmd = new Account();
    const login = cmd.subCommands.find((cmd) => cmd.commandHead === "login");
    await login!.handler({ service: "m365" });
    expect(loglevels).deep.equals([LogLevel.Info]);
  });

  it("Account Login M365 Command Running Check - Failed", async () => {
    const cmd = new Account();
    const login = cmd.subCommands.find((cmd) => cmd.commandHead === "login");
    await login!.handler({ service: "m365" });
    expect(loglevels).deep.equals([LogLevel.Error]);
  });

  it("Account Logout Azure Command Running Check - Success", async () => {
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.handler({ service: "azure" });
    expect(loglevels).deep.equals([LogLevel.Info]);
  });

  it("Account Logout Azure Command Running Check - Failed", async () => {
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.handler({ service: "azure" });
    expect(loglevels).deep.equals([LogLevel.Error]);
  });

  it("Account Logout M365 Command Running Check - Success", async () => {
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.handler({ service: "m365" });
    expect(loglevels).deep.equals([LogLevel.Info]);
  });

  it("Account Logout M365 Command Running Check - Failed", async () => {
    const cmd = new Account();
    const logout = cmd.subCommands.find((cmd) => cmd.commandHead === "logout");
    await logout!.handler({ service: "m365" });
    expect(loglevels).deep.equals([LogLevel.Error]);
  });

  it("Account Set Subscription Command Running Check - Success", async () => {
    const cmd = new Account();
    const set = cmd.subCommands.find((cmd) => cmd.commandHead === "set");
    await set!.handler({});
  });

  it("Account Set Subscription Command Running Check - Failed", async () => {
    const cmd = new Account();
    const set = cmd.subCommands.find((cmd) => cmd.commandHead === "set");
    try {
      await set!.handler({ subscription: "fake" });
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotFoundSubscriptionId");
    }
  });
});
