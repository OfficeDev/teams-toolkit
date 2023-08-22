// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Void, err, ok } from "@microsoft/teamsfx-api";
import { FxCore, NotAllowedMigrationError } from "@microsoft/teamsfx-core";
import "mocha";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Add, { AddWebpart } from "../../../src/cmds/add";
import * as constants from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockTelemetry, mockYargs } from "../utils";

describe("Add SPFx Web Part Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let events: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  beforeEach(() => {
    mockYargs(sandbox, options, positionals);
    mockTelemetry(sandbox, events);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
  });

  afterEach(() => {
    events = [];
    options = [];
    positionals = [];
    sandbox.restore();
  });

  it("Builder", async () => {
    const cmd = new AddWebpart();

    await cmd.builder(yargs);
    expect(options).to.include.members([
      "spfx-folder",
      "spfx-webpart-name",
      "manifest-path",
      "local-manifest-path",
      "folder",
    ]);
  });
  it("Add", async () => {
    const cmd = new Add();
    const res = await cmd.runCommand({});
    expect(res.isOk()).to.be.true;
  });
  it("Running Check", async () => {
    const addWebpartStub = sandbox.stub(FxCore.prototype, "addWebpart").resolves(ok(undefined));
    const cmd = new AddWebpart();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      ["spfx-folder"]: "/src",
      ["spfx-webpart-name"]: "hiworld",
      ["manifest-path"]: "/appPackage/manifest.json",
      ["local-manifest-path"]: "/appPackage/manifest.local.json",
      ["spfx-install-latest-package"]: "true",
    };
    const result = await cmd.runCommand(args);
    expect(result.isOk()).to.be.true;
    expect(addWebpartStub.calledOnce).to.be.true;
    expect(events).to.include.members([TelemetryEvent.AddWebpartStart, TelemetryEvent.AddWebpart]);
  });

  it("Running Check with Error", async () => {
    const addWebpartStub = sandbox
      .stub(FxCore.prototype, "addWebpart")
      .resolves(err(new NotAllowedMigrationError()));
    const cmd = new AddWebpart();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
      ["spfx-folder"]: "/src",
      ["spfx-webpart-name"]: "hiworld",
      ["manifest-path"]: "/appPackage/manifest.json",
      ["local-manifest-path"]: "/appPackage/manifest.local.json",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr()).to.be.true;
    expect(addWebpartStub.calledOnce).to.be.true;
    expect(events).to.include.members([TelemetryEvent.AddWebpartStart, TelemetryEvent.AddWebpart]);
    if (result.isErr()) {
      expect(result.error).instanceOf(NotAllowedMigrationError);
    }
  });
});
