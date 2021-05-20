// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as chai from "chai";
import * as path from "path";
import * as fs from "fs-extra";
import * as vscode from "vscode";

import { Result, FxError } from "@microsoft/teamsfx-api";

import { ext } from "../../../src/extensionVariables";
import { testFolder } from "../../globalVaribles";
import { LogLevel } from "@microsoft/teamsfx-api";
import { AzureAccountManager } from "../../../src/commonlib/azureLogin";
import VsCodeLogInstance from "../../../src/commonlib/log";
import { EInputType, TestUserInput } from "../../testUserInput";

suite("Extension Integration Tests (No Folder)", async () => {
  let workspace: string;

  suiteSetup(async function (this: Mocha.Context) {
    this.timeout(0);
    workspace = path.resolve(testFolder);
    if (fs.existsSync(workspace)) {
      fs.removeSync(workspace);
    }
    fs.ensureDir(workspace);
    ext.ui = new TestUserInput();
    (ext.ui as TestUserInput).setWorkspace(workspace);
  });

  // test("Login test", async function (this: Mocha.Context) {
  //   var accountCrendential = AzureAccountManager.getInstance().getAccountCredential();
  //   var identityCredential = AzureAccountManager.getInstance().getIdentityCredential();
  //   chai.assert.equal(true, typeof(accountCrendential)!==null);
  //   chai.assert.equal(true, typeof(identityCredential)!==null);
  // });

  test("Log test", async function (this: Mocha.Context) {
    const re1 = await VsCodeLogInstance.info("123");
    chai.assert.equal(true, re1);
    const re2 = await VsCodeLogInstance.log(LogLevel.Fatal, "123");
    chai.assert.equal(true, re2);
  });

  // test("Create a New Project", async function(this: Mocha.Context) {
  //   this.timeout(5 * 60 * 1000);
  //   (ext.ui as TestUserInput).addInputItems([
  //     { type: EInputType.defaultValue },
  //     { type: EInputType.defaultValue },
  //     { type: EInputType.specifiedValue, value: "default" }
  //   ]);
  //   // use default values of every user input.
  //   ext.ui.showInformationMessage(`[TEST]: execute 'fx-extension.create' command.`);
  //   const result: Result<null, FxError> | undefined = await vscode.commands.executeCommand(
  //     "fx-extension.create"
  //   );
  //   chai.assert.ok(result && result.isOk());
  // });
});
