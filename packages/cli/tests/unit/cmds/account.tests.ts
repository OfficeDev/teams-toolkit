// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, LogLevel, ok, UserError } from "@microsoft/teamsfx-api";

import Account, { AzureLogin, M365Login } from "../../../src/cmds/account";
import * as Utils from "../../../src/utils";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotFoundSubscriptionId } from "../../../src/error";
import M365TokenProvider from "../../../src/commonlib/m365Login";
import AzureTokenProvider from "../../../src/commonlib/azureLogin";
import { signedIn, signedOut } from "../../../src/commonlib/common/constant";
import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/identity";
import * as tools from "@microsoft/teamsfx-core/build/common/tools";
import mockedEnv, { RestoreFn } from "mocked-env";
class MockTokenCredentials implements TokenCredential {
  public async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    return {
      token: "a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c",
      expiresOnTimestamp: 1234,
    };
  }
}

describe("Account Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let loglevels: LogLevel[] = [];
  let mockedEnvRestore: RestoreFn;
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

    sandbox.stub(Utils, "setSubscriptionId").callsFake(async (id?: string, folder?: string) => {
      if (!id) return ok(null);
      else return err(NotFoundSubscriptionId());
    });
    sandbox.stub(tools, "setRegion").callsFake(async () => {});

    sandbox.stub(M365TokenProvider, "setStatusChangeMap").resolves(ok(true));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .onFirstCall()
      .returns(Promise.resolve(ok({ status: signedIn })))
      .onSecondCall()
      .returns(Promise.resolve(ok({ status: signedOut })))
      .onThirdCall()
      .returns(Promise.resolve(ok({ status: signedOut })));
    sandbox.stub(M365TokenProvider, "getAccessToken").resolves(ok(""));
    sandbox
      .stub(M365TokenProvider, "getJsonObject")
      .onFirstCall()
      .returns(Promise.resolve(ok({ upn: "M365@xxx.com" })))
      .onSecondCall()
      .returns(Promise.resolve(ok({ upn: "M365@xxx.com" })))
      .onThirdCall()
      .returns(Promise.resolve(err(new UserError("login", "not login", "not login"))));
    sandbox
      .stub(M365TokenProvider, "signout")
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
      .stub(AzureTokenProvider, "getIdentityCredentialAsync")
      .onFirstCall()
      .returns(Promise.resolve(new MockTokenCredentials()))
      .onSecondCall()
      .returns(Promise.resolve(new MockTokenCredentials()))
      .onThirdCall()
      .returns(Promise.resolve(new MockTokenCredentials()))
      .onCall(4)
      .returns(Promise.resolve(undefined))
      .onCall(5)
      .returns(Promise.resolve(undefined))
      .onCall(6)
      .returns(Promise.resolve(undefined));
    sandbox
      .stub(AzureTokenProvider, "getJsonObject")
      .onFirstCall()
      .returns(Promise.resolve({}))
      .onSecondCall()
      .returns(Promise.resolve({}))
      .onThirdCall()
      .returns(Promise.resolve({}))
      .onCall(4)
      .returns(Promise.resolve(undefined))
      .onCall(5)
      .returns(Promise.resolve(undefined))
      .onCall(6)
      .returns(Promise.resolve(undefined));
    sandbox.stub(AzureTokenProvider, "listSubscriptions").returns(Promise.resolve([]));
    sandbox
      .stub(AzureTokenProvider, "readSubscription")
      .onFirstCall()
      .returns(
        Promise.resolve({
          subscriptionName: "",
          subscriptionId: "",
          tenantId: "",
        })
      )
      .onSecondCall()
      .returns(Promise.resolve(undefined));
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
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
  });
  afterEach(() => {
    mockedEnvRestore();
  });

  it("Builder Check", () => {
    const cmd = new Account();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals([
      "account <action>",
      "show",
      "login <service>",
      "m365",
      "azure",
      "logout <service>",
      "set",
    ]);
    expect(options).deep.equals([
      "action",
      "tenant",
      "service-principal",
      "username",
      "password",
      "folder",
      "subscription",
    ]);
    expect(positionals).deep.equals(["service"]);
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
    const cmd = new AzureLogin();
    await cmd!.handler({});
    expect(loglevels).deep.equals([LogLevel.Info, LogLevel.Info, LogLevel.Info]);
  });

  it("Account Login Azure Command Running Check - Failed", async () => {
    const cmd = new AzureLogin();
    await cmd!.handler({});
    expect(loglevels).deep.equals([LogLevel.Error]);
  });

  it("Account Login M365 Command Running Check - Success", async () => {
    const cmd = new M365Login();
    await cmd!.handler({});
    expect(loglevels).deep.equals([LogLevel.Info]);
  });

  it("Account Login M365 Command Running Check - Failed", async () => {
    const cmd = new M365Login();
    await cmd!.handler({});
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
