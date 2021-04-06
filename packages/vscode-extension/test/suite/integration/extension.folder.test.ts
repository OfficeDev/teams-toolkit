// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as chai from "chai";
import * as fs from "fs-extra";
import * as vscode from "vscode";

import { Result, FxError } from "teamsfx-api";

import { ext } from "../../../src/extensionVariables";
import { testWorkspace } from "../../globalVaribles";
import { TestUserInput } from "../../testUserInput";
import { execSync } from "child_process";

suite("Extension Integration Tests (Specified Folder)", async () => {
  suiteSetup(async function(this: Mocha.Context) {
    this.timeout(0);
    chai.assert.ok(fs.existsSync(testWorkspace));
    ext.ui = new TestUserInput();
    console.debug("[TEST] do `npm install` in the scaffold folder.");
    execSync("npm install", { cwd: testWorkspace });
  });

  // test("Provision", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.provision' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.provision"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  // test("Deploy", async function (this: Mocha.Context) {
  //     // use default values of every user input.
  //     ext.ui.showInformationMessage(
  //         `[TEST]: execute 'teamsfx-extension.deploy' command.`,
  //     );
  //     const result:
  //         | Result<null, FxError>
  //         | undefined = await vscode.commands.executeCommand(
  //         "teamsfx-extension.deploy",
  //     );
  //     chai.assert.ok(result && result.isOk());
  // });

  // test("Debug", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.debug' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.debug"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  // test("Build", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.build' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.build"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  // test("Publish", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.publish' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.publish"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  // test("Scaffold One", async function (this: Mocha.Context) {
  //     this.timeout(0);
  //     // use default values of every user input.
  //     ext.ui.showInformationMessage(
  //         `[TEST]: execute 'teamsfx-extension.scaffoldOne' command.`,
  //     );
  //     try {
  //         await vscode.commands.executeCommand(
  //             "teamsfx-extension.scaffoldOne",
  //         );
  //         chai.assert.ok(false, "[Test] it should be an error");
  //     } catch (error) {
  //         console.debug("OK");
  //     }
  // });

  // test("Provision One", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.provisionOne' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.provisionOne"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  // test("Debug One", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.debugOne' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.debugOne"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  // test("Build One", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.buildOne' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.buildOne"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  // test("Deploy One", async function (this: Mocha.Context) {
  //     // use default values of every user input.
  //     ext.ui.showInformationMessage(
  //         `[TEST]: execute 'teamsfx-extension.deployOne' command.`,
  //     );
  //     const result:
  //         | Result<null, FxError>
  //         | undefined = await vscode.commands.executeCommand(
  //         "teamsfx-extension.deployOne",
  //     );
  //     chai.assert.ok(result && result.isOk());
  // });

  // test("Publish One", async function(this: Mocha.Context) {
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'teamsfx-extension.publishOne' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "teamsfx-extension.publishOne"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });

  suiteTeardown(() => {
    // TODO: meet Error: EBUSY: resource busy or locked, rmdir.
    // fs.removeSync(testWorkspace);
  });
});
