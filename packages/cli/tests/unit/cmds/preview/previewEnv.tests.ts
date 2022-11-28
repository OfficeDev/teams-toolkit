// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs, { Options } from "yargs";
import { FxError, IProgressHandler, ok, Result } from "@microsoft/teamsfx-api";
import * as tools from "@microsoft/teamsfx-core";
import * as packageJson from "@microsoft/teamsfx-core/build/common/local/packageJsonHelper";
import { envUtil } from "@microsoft/teamsfx-core";
import { expect } from "../../utils";
import PreviewEnv from "../../../../src/cmds/preview/previewEnv";
import cliLogger from "../../../../src/commonlib/log";
import { signedIn, signedOut } from "../../../../src/commonlib/common/constant";
import M365TokenInstance from "../../../../src/commonlib/m365Login";
import CLIUIInstance from "../../../../src/userInteraction";
import * as Utils from "../../../../src/utils";

describe("Preview --env", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn = () => {};
  let options: string[] = [];
  let defaultOptions: { [k: string]: any } = {};
  let logs: string[] = [];

  beforeEach(() => {
    mockedEnvRestore = () => {};
    options = [];
    defaultOptions = {};
    logs = [];
    sandbox.stub(yargs, "options").callsFake((ops: { [key: string]: Options }, more?: any) => {
      if (typeof ops === "string") {
        options.push(ops);
        defaultOptions[ops as string] = more?.default;
      } else {
        for (const key of Object.keys(ops)) {
          options.push(key);
          defaultOptions[key] = ops[key].default;
        }
      }
      return yargs;
    });
    sandbox.stub(cliLogger, "necessaryLog").callsFake((lv, msg, white) => {
      logs.push(msg);
    });
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("Builder Check", () => {
    const cmd = new PreviewEnv();
    cmd.builder(yargs);

    expect(options).includes("folder", JSON.stringify(options));
    expect(options).includes("env", JSON.stringify(options));
    expect(options).includes("run-command", JSON.stringify(options));
    expect(options).includes("running-pattern", JSON.stringify(options));
    expect(options).includes("m365-host", JSON.stringify(options));
    expect(options).includes("browser", JSON.stringify(options));
    expect(options).includes("browser-arg", JSON.stringify(options));
  });

  it("Preview Command Running - Default", async () => {
    sandbox.stub(Utils, "isWorkspaceSupported").returns(true);
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(PreviewEnv.prototype, <any>"checkM365Account").resolves(ok({}));
    sandbox.stub(PreviewEnv.prototype, <any>"detectRunCommand").resolves(ok({}));

    const cmd = new PreviewEnv();
    cmd.builder(yargs);

    await cmd.handler(defaultOptions);

    expect(logs.length).greaterThanOrEqual(2);
    expect(logs[0]).satisfy((l: string) => l.startsWith("Set 'run-command'"));
    expect(logs[1]).satisfy((l: string) => l.startsWith("Set 'run-command'"));
  });
});

describe("PreviewEnv Steps", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn = () => {};
  let logs: string[] = [];

  // wrapper class to expose protected functions
  class PreviewEnvTest extends PreviewEnv {
    public checkM365Account(appTenantId?: string): Promise<
      Result<
        {
          tenantId?: string;
          loginHint?: string;
        },
        FxError
      >
    > {
      return super.checkM365Account(appTenantId);
    }

    public detectRunCommand(projectPath: string): Promise<
      Result<
        {
          runCommand: string;
        },
        FxError
      >
    > {
      return super.detectRunCommand(projectPath);
    }
  }

  beforeEach(() => {
    mockedEnvRestore = () => {};
    logs = [];
    sandbox.stub(cliLogger, "necessaryLog").callsFake((lv, msg, white) => {
      logs.push(msg);
    });
    sandbox.stub(CLIUIInstance, "createProgressBar").returns(new MockProgressHandler());
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("checkM365Account - signin", async () => {
    const token = "test-token";
    const tenantId = "test-tenant-id";
    const upn = "test-user";
    sandbox.stub(M365TokenInstance, "getStatus").returns(
      Promise.resolve(
        ok({
          status: signedIn,
          token: token,
          accountInfo: {
            tid: tenantId,
            upn: upn,
          },
        })
      )
    );
    sandbox.stub(tools, "getSideloadingStatus").resolves(true);

    const previewEnv = new PreviewEnvTest();
    const accountRes = await previewEnv.checkM365Account(undefined);
    expect(accountRes.isOk()).to.be.true;
    const account = (accountRes as any).value;
    expect(account.tenantId).equals(tenantId);
    expect(account.loginHint).equals(upn);
  });

  it("checkM365Account - signout", async () => {
    const token = "test-token";
    const tenantId = "test-tenant-id";
    const upn = "test-user";
    const getStatusStub = sandbox.stub(M365TokenInstance, "getStatus");
    getStatusStub.onCall(0).resolves(
      ok({
        status: signedOut,
      })
    );
    getStatusStub.onCall(1).resolves(
      ok({
        status: signedIn,
        token: token,
        accountInfo: {
          tid: tenantId,
          upn: upn,
        },
      })
    );
    sandbox.stub(M365TokenInstance, "getAccessToken").resolves(ok(token));
    sandbox.stub(tools, "getSideloadingStatus").resolves(true);

    const previewEnv = new PreviewEnvTest();
    const accountRes = await previewEnv.checkM365Account(undefined);
    expect(accountRes.isOk()).to.be.true;
    const account = (accountRes as any).value;
    expect(account.tenantId).equals(tenantId);
    expect(account.loginHint).equals(upn);
  });

  it("checkM365Account - no sideloading permission", async () => {
    const token = "test-token";
    const tenantId = "test-tenant-id";
    const upn = "test-user";
    sandbox.stub(M365TokenInstance, "getStatus").returns(
      Promise.resolve(
        ok({
          status: signedIn,
          token: token,
          accountInfo: {
            tid: tenantId,
            upn: upn,
          },
        })
      )
    );
    sandbox.stub(tools, "getSideloadingStatus").resolves(false);

    const previewEnv = new PreviewEnvTest();
    const accountRes = await previewEnv.checkM365Account(undefined);
    expect(accountRes.isErr()).to.be.true;
    const error = (accountRes as any).error;
    // eslint-disable-next-line no-secrets/no-secrets
    expect(error.name).equals("PrerequisitesValidationM365AccountError");
    expect(error.message).satisfy((m: string) => m.includes("sideloading permission"));
  });

  it("detectRunCommand - node", async () => {
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readdir").resolves([]);
    // eslint-disable-next-line no-secrets/no-secrets
    sandbox.stub(packageJson, "loadTeamsFxDevScript").resolves("test");

    const previewEnv = new PreviewEnvTest();
    const runCommandRes = await previewEnv.detectRunCommand("./");
    expect(runCommandRes.isOk()).to.be.true;
    const runCommand = (runCommandRes as any).value;
    expect(runCommand.runCommand).equals("npm run dev:teamsfx");
  });

  it("detectRunCommand - .net web", async () => {
    sandbox.stub(fs, "pathExists").resolves(false);
    sandbox.stub(fs, "readdir").resolves(["test.csproj"]);
    sandbox.stub(fs, "readFile").resolves(
      Buffer.from(
        `
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>
</Project>
`
      )
    );

    const previewEnv = new PreviewEnvTest();
    const runCommandRes = await previewEnv.detectRunCommand("./");
    expect(runCommandRes.isOk()).to.be.true;
    const runCommand = (runCommandRes as any).value;
    expect(runCommand.runCommand).equals("dotnet run");
  });

  it("detectRunCommand - .net func", async () => {
    sandbox.stub(fs, "pathExists").resolves(false);
    sandbox.stub(fs, "readdir").resolves(["test.csproj"]);
    sandbox.stub(fs, "readFile").resolves(
      Buffer.from(
        // eslint-disable-next-line no-secrets/no-secrets
        `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="4.1.3" />
  </ItemGroup>
</Project>
`
      )
    );

    const previewEnv = new PreviewEnvTest();
    const runCommandRes = await previewEnv.detectRunCommand("./");
    expect(runCommandRes.isOk()).to.be.true;
    const runCommand = (runCommandRes as any).value;
    expect(runCommand.runCommand).equals("func start");
  });
});

class MockProgressHandler implements IProgressHandler {
  start(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  next(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  end(success: boolean): Promise<void> {
    return Promise.resolve();
  }
}
