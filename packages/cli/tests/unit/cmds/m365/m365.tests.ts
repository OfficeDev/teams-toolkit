// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, ok } from "@microsoft/teamsfx-api";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import fs from "fs-extra";
import sinon from "sinon";
import yargs, { Options } from "yargs";

import { expect } from "../../utils";
import M365 from "../../../../src/cmds/m365/m365";
import M365TokenProvider from "../../../../src/commonlib/m365Login";
import CLILogProvider from "../../../../src/commonlib/log";
import { signedIn } from "../../../../src/commonlib/common/constant";

describe("M365", () => {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let logs: string[] = [];
  const testAxiosInstance = {
    defaults: {
      headers: {
        common: {},
      },
    },
    get: function <T = any, R = AxiosResponse<T>>(url: string): Promise<R> {
      return Promise.resolve({} as R);
    },
  } as AxiosInstance;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    logs = [];
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
    sandbox.stub(M365TokenProvider, "getAccessToken").returns(Promise.resolve(ok("test-token")));
    sandbox
      .stub(M365TokenProvider, "getStatus")
      .returns(Promise.resolve(ok({ status: signedIn, accountInfo: { upn: "test" } })));
    sandbox.stub(fs, "readFile").callsFake((file) => {
      return Promise.resolve(Buffer.from("test"));
    });
    sandbox.stub(axios, "create").returns(testAxiosInstance);
  });

  it("M365 is empty command", async () => {
    const m365 = new M365();
    m365.builder(yargs);
    expect(registeredCommands).deep.equals(["sideloading"]);

    const res = await m365.runCommand({});
    expect(res.isOk()).to.be.true;
    expect((res as any).value).equals(null);
  });

  it("M365 Sideloading command", async () => {
    const m365 = new M365();
    const sideloading = m365.subCommands.find((cmd) => cmd.commandHead === "sideloading");
    expect(sideloading).not.undefined;

    await sideloading!.handler({ "file-path": "test" });
    expect(logs.length).greaterThan(0);
    const finalLog = logs[logs.length - 1];
    expect(finalLog).equals("Sideloading done.");
  });
});
