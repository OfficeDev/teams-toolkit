// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, FxError, ok, Result, UserCancelError, Void } from "@microsoft/teamsfx-api";
import { environmentManager, FxCore } from "@microsoft/teamsfx-core";

import Provision from "../../src/cmds/provision";
import CliTelemetry from "../../src/telemetry/cliTelemetry";
import { TelemetryEvent } from "../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../src/constants";
import * as Utils from "../../src/utils";
import { expect } from "./utils";
import { NotFoundSubscriptionId } from "../../src/error";
import UI from "../../src/userInteraction";
import LogProvider from "../../src/commonlib/log";
import CLIUIInstance from "../../src/userInteraction";
import { RestoreFn } from "mocked-env";
import { VersionCheckRes } from "@microsoft/teamsfx-core/build/core/types";
import { VersionState } from "@microsoft/teamsfx-core/build/common/versionMetadata";
import { YargsCommand } from "../../src/yargsCommand";

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
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  let allArguments = new Map<string, any>();
  const mockedEnvRestore: RestoreFn = () => {};

  const existedSubId = "existedSubId";

  beforeEach(() => {
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox.stub(CliTelemetry, "sendTelemetryEvent").callsFake((eventName: string) => {
      telemetryEvents.push(eventName);
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
      });
    sandbox.stub(Utils, "setSubscriptionId").callsFake(async (id?: string, folder?: string) => {
      if (!id) return ok(null);
      if (id === existedSubId) return ok(null);
      else return err(NotFoundSubscriptionId());
    });
    sandbox.stub(UI, "updatePresetAnswers").callsFake((a: any, args: { [_: string]: any }) => {
      for (const key of Object.keys(args)) {
        allArguments.set(key, args[key]);
      }
    });
    sandbox.stub(LogProvider, "necessaryLog").returns();
    sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
    CLIUIInstance.interactive = false;
    telemetryEvents = [];
    logs = [];
    allArguments = new Map<string, any>();
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("- failed to check project version", async () => {
    sandbox.stub(FxCore.prototype, "projectVersionCheck").resolves(err(UserCancelError));
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
    sandbox.stub(FxCore.prototype, "phantomMigrationV3").resolves(ok(Void));
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
    sandbox.stub(FxCore.prototype, "phantomMigrationV3").resolves(err(UserCancelError));
    const cmd = new TestCommand();
    await expect(cmd.handler({ folder: "test" })).to.be.rejected;
  });
});
