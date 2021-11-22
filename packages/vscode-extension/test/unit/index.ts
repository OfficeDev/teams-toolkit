/* tslint:disable no-require-imports */
/* eslint-disable @typescript-eslint/no-this-alias */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

declare let global: any;

import * as fs from "fs";
import * as glob from "glob";
import * as paths from "path";

const istanbul = require("istanbul");
const Mocha = require("mocha");
const remapIstanbul = require("remap-istanbul");
const tty = require("tty");
if (!tty.getWindowSize) {
  tty.getWindowSize = (): number[] => {
    return [80, 75];
  };
}

let mocha = new Mocha({
  ui: "tdd",
  useColors: true,
});

function configure(mochaOpts: any): void {
  mocha = new Mocha(mochaOpts);
}
exports.configure = configure;

function _mkDirIfExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function _readCoverOptions(testsRoot: string): ITestRunnerOptions | undefined {
  const coverConfigPath = paths.join(testsRoot, "..", "..", "..", "coverconfig.json");
  if (fs.existsSync(coverConfigPath)) {
    const configContent = fs.readFileSync(coverConfigPath, "utf-8");
    return JSON.parse(configContent);
  }
  return undefined;
}

function run(testsRoot: string, clb: any): any {
  testsRoot = paths.resolve(__dirname);
  const coverOptions = _readCoverOptions(testsRoot);
  if (coverOptions && coverOptions.enabled) {
    const coverageRunner = new CoverageRunner(coverOptions, testsRoot);
    coverageRunner.setupCoverage();
  }

  // Glob test files
  glob(
    "**/**.test.js",
    { cwd: testsRoot, ignore: "migration/migrate.test.js" },
    (error, files): any => {
      if (error) {
        return clb(error);
      }
      try {
        files.forEach((f): Mocha => mocha.addFile(paths.join(testsRoot, f)));

        let failureCount = 0;
        mocha
          .run()
          .on("fail", () => failureCount++)
          .on("end", () => clb(undefined, failureCount));
      } catch (error) {
        return clb(error);
      }
    }
  );
}
exports.run = run;

interface ITestRunnerOptions {
  enabled?: boolean;
  relativeCoverageDir: string;
  relativeSourcePath: string;
  ignorePatterns: string[];
  includePid?: boolean;
  reports?: string[];
  verbose?: boolean;
}

class CoverageRunner {
  private coverageVar: string = "$$cov_" + new Date().getTime() + "$$";
  private transformer: any = undefined;
  private matchFn: any = undefined;
  private instrumenter: any = undefined;

  constructor(private options: ITestRunnerOptions, private testsRoot: string) {
    if (!options.relativeSourcePath) {
      return;
    }
  }

  public setupCoverage(): void {
    const self = this;
    self.instrumenter = new istanbul.Instrumenter({ coverageVariable: self.coverageVar });
    const sourceRoot = paths.join(self.testsRoot, self.options.relativeSourcePath);

    // Glob source files
    const srcFiles = glob.sync("**/**.js", {
      cwd: sourceRoot,
      ignore: self.options.ignorePatterns,
    });

    const decache = require("decache");
    const fileMap: any = {};
    srcFiles.forEach((file) => {
      const fullPath = paths.join(sourceRoot, file);
      fileMap[fullPath] = true;

      decache(fullPath);
    });

    self.matchFn = (file: string): boolean => fileMap[file];
    self.matchFn.files = Object.keys(fileMap);

    self.transformer = self.instrumenter.instrumentSync.bind(self.instrumenter);
    const hookOpts = { verbose: false, extensions: [".js"] };
    istanbul.hook.hookRequire(self.matchFn, self.transformer, hookOpts);

    global[self.coverageVar] = {};

    process.on("exit", (code: number) => {
      self.reportCoverage();
      process.exitCode = code;
    });
  }

  public reportCoverage(): void {
    const self = this;
    istanbul.hook.unhookRequire();
    let cov: any;
    if (
      typeof global[self.coverageVar] === "undefined" ||
      Object.keys(global[self.coverageVar]).length === 0
    ) {
      console.error(
        "No coverage information was collected, exit without writing coverage information"
      );
      return;
    } else {
      cov = global[self.coverageVar];
    }

    self.matchFn.files.forEach((file: any) => {
      if (cov[file]) {
        return;
      }
      self.transformer(fs.readFileSync(file, "utf-8"), file);

      Object.keys(self.instrumenter.coverState.s).forEach((key) => {
        self.instrumenter.coverState.s[key] = 0;
      });

      cov[file] = self.instrumenter.coverState;
    });

    const reportingDir = paths.join(self.testsRoot, self.options.relativeCoverageDir);
    const includePid = self.options.includePid;
    const pidExt = includePid ? "-" + process.pid : "";
    const coverageFile = paths.resolve(reportingDir, "coverage" + pidExt + ".json");

    _mkDirIfExists(reportingDir);

    fs.writeFileSync(coverageFile, JSON.stringify(cov), "utf8");

    const remappedCollector = remapIstanbul.remap(cov, {
      warn: (warning: any) => {
        if (self.options.verbose) {
          console.warn(warning);
        }
      },
    });

    const reporter = new istanbul.Reporter(undefined, reportingDir);
    const reportTypes = self.options.reports instanceof Array ? self.options.reports : ["lcov"];
    reporter.addAll(reportTypes);
    reporter.write(remappedCollector, true, () => {
      console.log(`Coverage reports written to ${reportingDir}`);
    });
  }
}
