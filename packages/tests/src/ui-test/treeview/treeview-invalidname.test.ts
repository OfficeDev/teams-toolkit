// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import { InputBox, VSBrowser } from "vscode-extension-tester";
import { expect } from "chai";
import {
  CommandPaletteCommands,
  Timeout,
  CreateProjectQuestion,
} from "../../utils/constants";
import { TreeViewTestContext } from "./treeviewContext";
import { execCommandIfExist } from "../../utils/vscodeOperation";
import { it } from "../../utils/it";
import { getNodeVersion } from "../../utils/getNodeVersion";

describe("New project Tests", function () {
  this.timeout(Timeout.testCase);
  let treeViewTestContext: TreeViewTestContext;
  let testRootFolder: string;
  let nodeVersion: string | null;
  const warnMsg =
    "Application name must start with letters and contain at least two letters or digits. It can not contain some special characters.";

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    treeViewTestContext = new TreeViewTestContext("treeview");
    testRootFolder = treeViewTestContext.testRootFolder;
    nodeVersion = await getNodeVersion();
    await treeViewTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await treeViewTestContext.after();
  });

  it(
    "[auto] invalid app name check when create a tab project",
    {
      testPlanCaseId: 12615302,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      const driver = VSBrowser.instance.driver;
      await execCommandIfExist(
        CommandPaletteCommands.CreateProjectCommand,
        Timeout.webView
      );
      const input = await InputBox.create();
      // if exist click it
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await input.selectQuickPick("Basic Tab");
      await driver.sleep(Timeout.input);
      // Choose programming language
      await input.selectQuickPick("JavaScript");

      // Input folder path
      await input.selectQuickPick("Browse...");
      do {
        // input may be auto-corrected to other value, so set until it's fixed
        await input.setText(testRootFolder);
        await driver.sleep(Timeout.input);
      } while ((await input.getText()) !== testRootFolder);
      await input.confirm();

      // Input App Name
      await input.setText(".invalidname");
      await driver.sleep(Timeout.input);
      const inputMessage = await input.getMessage();
      expect(inputMessage).to.be.contains(warnMsg);
      // Input App Name
      await input.setText("2invalidname");
      await driver.sleep(Timeout.input);
      const inputMessage2 = await input.getMessage();
      expect(inputMessage2).to.be.contains(warnMsg);
    }
  );

  it(
    "[auto] invalid app name check when create a SPFx project",
    {
      testPlanCaseId: 12615304,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      const driver = VSBrowser.instance.driver;
      const appName = treeViewTestContext.appName;
      await execCommandIfExist(
        CommandPaletteCommands.CreateProjectCommand,
        Timeout.webView
      );
      const input = await InputBox.create();
      // if exist click it
      await input.selectQuickPick(CreateProjectQuestion.Tab);
      await driver.sleep(Timeout.input);
      // Choose Tab(SPFx)
      await input.selectQuickPick("SPFx");
      await driver.sleep(Timeout.input);
      await input.selectQuickPick(CreateProjectQuestion.CreateNewSpfxSolution);
      // Wait for Node version check
      await driver.sleep(Timeout.longTimeWait);
      await input.selectQuickPick(
        CreateProjectQuestion.SpfxSharepointFrameworkInTtk
      );
      await driver.sleep(Timeout.input);
      // Choose React or None
      await input.selectQuickPick("React");
      // Input Web Part Name
      await input.setText("2invalidname");
      await driver.sleep(Timeout.input);
      const inputMessage = await input.getMessage();
      expect(inputMessage).to.be.contains(
        `2invalidname doesn't match pattern: ^[a-zA-Z_][a-zA-Z0-9_]*$`
      );
      await input.setText(appName);
      await driver.sleep(Timeout.input);
      await input.confirm();
      // Input folder path
      await input.selectQuickPick("Browse...");
      do {
        // input may be auto-corrected to other value, so set until it's fixed
        await input.setText(testRootFolder);
        await driver.sleep(Timeout.input);
      } while ((await input.getText()) !== testRootFolder);
      await input.confirm();
      // Input App Name
      await input.setText("2invalidname");
      await driver.sleep(Timeout.input);
      const inputMessage3 = await input.getMessage();
      expect(inputMessage3).to.be.contains(warnMsg);
    }
  );
});
