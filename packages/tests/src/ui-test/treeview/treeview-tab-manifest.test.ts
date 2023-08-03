// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import {
  clearNotifications,
  createNewProject,
  getNotification,
} from "../../utils/vscodeOperation";
import { TreeViewTestContext, zipAppPackage } from "./treeviewContext";
import { createEnv } from "../remotedebug/remotedebugContext";
import { Timeout, Notification } from "../../utils/constants";
import { it } from "../../utils/it";
import { getNodeVersion } from "../../utils/getNodeVersion";

describe("Execute Build Teams Package", function () {
  this.timeout(Timeout.testCase);
  let treeViewTestContext: TreeViewTestContext;
  let nodeVersion: string | null;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    treeViewTestContext = new TreeViewTestContext("treeview");
    nodeVersion = await getNodeVersion();
    console.log(`Node version is ${nodeVersion}`);
    await treeViewTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await treeViewTestContext.after();
  });

  it(
    "[auto] Execute Build Teams Package from Command Palette after Creating Tab Project",
    {
      testPlanCaseId: 14377966,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      await createNewProject("tab", treeViewTestContext.appName);
      await zipAppPackage("dev");
      await getNotification(
        Notification.UnresolvedPlaceholderError,
        Timeout.shortTimeWait
      );

      await clearNotifications();
      await zipAppPackage("local");
      await getNotification(
        Notification.UnresolvedPlaceholderError,
        Timeout.shortTimeWait
      );

      await clearNotifications();
      await createEnv("staging");
      await zipAppPackage("staging");
      await getNotification(
        Notification.UnresolvedPlaceholderError,
        Timeout.shortTimeWait
      );
    }
  );
});
