// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, LogLevel } from "@microsoft/teamsfx-api";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { SinonSandbox } from "sinon";
import yargs, { Options } from "yargs";
import { replaceTemplateString } from "../../src/colorize";
import LogProvider from "../../src/commonlib/log";
import CLITelemetry from "../../src/telemetry/cliTelemetry";

chai.use(chaiAsPromised);
export const expect = chai.expect;

export const TestFolder = path.join(os.homedir(), "test-folder");
fs.ensureDirSync(TestFolder);

export function deleteFolderIfExists(p: string) {
  if (fs.pathExistsSync(p)) {
    fs.removeSync(p);
  }
}

export function createFolderIfNotExist(folder: string) {
  if (!fs.pathExistsSync(folder)) {
    fs.mkdirSync(folder);
  }
}

export function createFileIfNotExist(p: string) {
  if (!fs.pathExistsSync(p)) {
    fs.createFileSync(p);
  }
}

export function getDirFiles(folder: string): string[] {
  if (!fs.pathExistsSync(folder)) {
    return [];
  }
  return fs.readdirSync(folder);
}

export function mockYargs(
  sandbox: SinonSandbox,
  options: string[] = [],
  positionals: string[] = []
) {
  sandbox
    .stub<any, any>(yargs, "command")
    .callsFake((cmd: any, desc: any, builder: any, handler: any) => {
      return builder(yargs);
    });
  sandbox.stub(yargs, "options").callsFake((opts: { [key: string]: Options }) => {
    if (typeof opts === "string") {
      options.push(opts);
    } else {
      /// cannot use concat to do this.
      options.push(...Object.keys(opts));
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
}

export function mockTelemetry(
  sandbox: SinonSandbox,
  events: string[],
  options: { [_: string]: string } = {}
) {
  sandbox.stub(CLITelemetry, "withRootFolder").returns(CLITelemetry);
  sandbox
    .stub(CLITelemetry, "sendTelemetryEvent")
    .callsFake((eventName: string, opts?: { [_: string]: string }) => {
      events.push(eventName);
      Object.assign(options, opts || {});
    });
  sandbox
    .stub(CLITelemetry, "sendTelemetryErrorEvent")
    .callsFake((eventName: string, error: FxError) => {
      events.push(eventName);
    });
}

export function mockLogProvider(sandbox: SinonSandbox, messages: string[] = []) {
  sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
    messages.push(message);
  });
  sandbox.stub(LogProvider, "outputInfo").callsFake((message: string, ...args: string[]) => {
    messages.push(replaceTemplateString(message, ...args));
  });
  sandbox.stub(LogProvider, "outputWarning").callsFake((message: string, ...args: string[]) => {
    messages.push(replaceTemplateString(message, ...args));
  });
  sandbox.stub(LogProvider, "outputError").callsFake((message: string, ...args: string[]) => {
    messages.push(replaceTemplateString(message, ...args));
  });
  sandbox.stub(LogProvider, "outputSuccess").callsFake((message: string, ...args: string[]) => {
    messages.push(replaceTemplateString(message, ...args));
  });
  sandbox.stub(LogProvider, "outputDetails").callsFake((message: string, ...args: string[]) => {
    messages.push(replaceTemplateString(message, ...args));
  });
}
