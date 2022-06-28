// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as Mocha from "mocha";
import * as glob from "glob";
import * as baseConfig from "@istanbuljs/nyc-config-typescript";
import "ts-node/register";
import "source-map-support/register";
const NYC = require("nyc");

export async function run(): Promise<void> {
  const nyc = new NYC({
    ...baseConfig,
    cwd: path.join(__dirname, "..", "..", ".."),
    reporter: ["text-summary", "html"],
    all: true,
    silent: false,
    instrument: true,
    hookRequire: true,
    hookRunInContext: true,
    hookRunInThisContext: true,
    include: ["out/src/**/*.js"],
    exclude: ["out/test/**"],
    checkCoverage: true,
    lines: 95,
  });
  await nyc.wrap();

  const myFilesRegex = /vscode-extension\/out/;
  const filterFn = myFilesRegex.test.bind(myFilesRegex);
  if (Object.keys(require.cache).filter(filterFn).length > 1) {
    console.warn(
      "NYC initialized after modules were loaded",
      Object.keys(require.cache).filter(filterFn)
    );
  }
  await nyc.createTempDirectory();

  const options: Mocha.MochaOptions = {
    ui: "tdd",
    color: true,
    reporter: "mocha-multi-reporters",
    reporterOptions: {
      reporterEnabled: "spec, mocha-junit-reporter",
      mochaJunitReporterReporterOptions: {
        mochaFile: path.resolve(__dirname, "..", "..", "test-results.unit.xml"),
      },
    },
  };

  addEnvVarsToMochaOptions(options);
  console.log(`Mocha options: ${JSON.stringify(options, undefined, 2)}`);

  const mocha = new Mocha(options);

  const testsRoot = path.resolve(__dirname);

  const files: string[] = await new Promise((resolve, reject) => {
    glob(
      "**/**.test.js",
      { cwd: testsRoot, ignore: "migration/migrate.test.js" },
      (err, result) => {
        err ? reject(err) : resolve(result);
      }
    );
  });

  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  try {
    const failures = await new Promise<number>((resolve) => mocha.run(resolve));

    await nyc.writeCoverageFile();
    // Capture text-summary reporter's output and log it in console
    await captureStdout(nyc.report.bind(nyc));
    await nyc.checkCoverage({ lines: 37.67 });

    if (failures > 0) {
      throw new Error(`${failures} tests failed.`);
    }
  } catch (err) {
    console.log(err);
  }
}

function addEnvVarsToMochaOptions(options: Mocha.MochaOptions): void {
  for (const envVar of Object.keys(process.env)) {
    const match: RegExpMatchArray | null = envVar.match(/^mocha_(.+)/i);
    if (match) {
      const [, option] = match;
      // tslint:disable-next-line:strict-boolean-expressions
      let value: string | number = process.env[envVar] || "";
      if (typeof value === "string" && !isNaN(parseInt(value))) {
        value = parseInt(value);
      }
      // tslint:disable-next-line: no-any
      (<any>options)[option] = value;
    }
  }
}

async function captureStdout(fn: any) {
  const w = process.stdout.write;
  let buffer = "";
  process.stdout.write = (s) => {
    buffer = buffer + s;
    return true;
  };
  await fn();
  process.stdout.write = w;
  return buffer;
}
