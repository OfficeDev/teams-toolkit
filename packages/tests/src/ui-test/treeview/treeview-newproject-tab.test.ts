/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import * as path from "path";
import * as fs from "fs-extra";
import { expect } from "chai";
import { Timeout } from "../../utils/constants";
import { TreeViewTestContext } from "./treeviewContext";
import { createNewProject } from "../../utils/vscodeOperation";
import { it } from "../../utils/it";
import { getNodeVersion } from "../../utils/getNodeVersion";

describe("New project Tests", function () {
  this.timeout(Timeout.testCase);
  let treeViewTestContext: TreeViewTestContext;
  let testRootFolder: string;
  let nodeVersion: string | null;
  const appNameCopySuffix = "copy";
  let newAppFolderName: string;
  let projectPath: string;

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
    "[auto] Create Tab typescript project and validation",
    {
      testPlanCaseId: 10791728,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      const appName = treeViewTestContext.appName;
      await createNewProject("tab", appName, "TypeScript");
      newAppFolderName = appName + appNameCopySuffix;
      projectPath = path.resolve(testRootFolder, newAppFolderName);
      const filePath1 = path.join(projectPath, "src", "index.tsx");
      expect(fs.existsSync(filePath1), `${filePath1} must exist.`).to.eq(true);
    }
  );
});
