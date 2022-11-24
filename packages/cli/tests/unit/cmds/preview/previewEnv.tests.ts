// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs, { Options } from "yargs";
import { expect } from "../../utils";
import PreviewEnv from "../../../../src/cmds/preview/previewEnv";

describe("Preview --env", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn = () => {};
  let options: string[] = [];
  let defaultOptions: { [k: string]: any } = {};

  beforeEach(() => {
    mockedEnvRestore = () => {};
    options = [];
    defaultOptions = {};
    sandbox.stub(yargs, "option").callsFake((ops: { [key: string]: Options }, more?: any) => {
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
    const cmd = new PreviewEnv();
    cmd.builder(yargs);

    await cmd.handler(defaultOptions);
  });
});
