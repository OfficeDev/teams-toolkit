// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author wenyt <75360946+wenytang-ms@users.noreply.github.com>
 */
import { expect } from "chai";
import { TreeViewTestContext, checkSectionContent } from "./treeviewContext";
import { Timeout, TreeViewCommands } from "../../utils/constants";
import { createNewProject } from "../../utils/vscodeOperation";
import { it } from "../../utils/it";

describe("Check command name in command palette and tree view content Tests", function () {
  this.timeout(Timeout.testCase);
  let treeViewTestContext: TreeViewTestContext;
  let testRootFolder: string;
  let appName: string;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    treeViewTestContext = new TreeViewTestContext("treeview");
    testRootFolder = treeViewTestContext.testRootFolder;
    appName = treeViewTestContext.appName;
    await treeViewTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await treeViewTestContext.after();
  });

  it(
    "[auto] All treeview items display correctly",
    {
      testPlanCaseId: 16788842,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      await createNewProject("tab", appName);
      const includeDevelopmentSection = await checkSectionContent(
        TreeViewCommands.DevelopmentSectionName,
        TreeViewCommands.DevelopmentSectionItems
      );
      expect(
        includeDevelopmentSection,
        `${TreeViewCommands.DevelopmentSectionName} does not show all elements.`
      ).equal(true);
    }
  );
});
