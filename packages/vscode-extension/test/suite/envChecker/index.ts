// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as Mocha from "mocha";
import * as glob from "glob";
import * as util from "util";

// This file is mostly copied from this tutorial
// https://code.visualstudio.com/api/working-with-extensions/testing-extension
export function run(): Promise<void> {
  // Create the mocha test
  const options: Mocha.MochaOptions = {
    ui: "tdd",
    timeout: 5 * 60 * 1000, // 5 minute timeout
    color: true,
  };

  // NOTE: this equals to running "mocha --require source-map-support/register" to make the error stack trace more readable.
  //  the latest @types/mocha does not have this options because @types/mocha is not up-to-date.
  // However, mocha js package has this options: https://mochajs.org/api/mocha#Mocha
  (options as any).require = ["source-map-support/register"];

  console.log(`Mocha options: ${JSON.stringify(options, undefined, 2)}`);
  const mocha = new Mocha(options);

  const testsRoot = path.resolve(__dirname, ".");
  return new Promise((resolve, reject) => {
    glob("./cases/**.js", { cwd: testsRoot }, (err, files) => {
      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}
