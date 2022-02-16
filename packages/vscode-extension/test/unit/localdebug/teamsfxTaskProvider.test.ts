// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as vscode from "vscode";

import { TeamsfxTaskProvider } from "../../../src/debug/teamsfxTaskProvider";

suite("[debug > teamsfxTaskProvider]", () => {
  const taskProvider = new TeamsfxTaskProvider();
  const testWorkspaceFolder = {} as vscode.WorkspaceFolder;
  suite("resolveTask", () => {
    test("no task", async () => {
      const inputTask = new vscode.Task(
        {
          type: "teamsfx",
          command: "dev",
          component: "frontend",
        },
        testWorkspaceFolder,
        "frontend dev",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).to.be.undefined;
    });
  });
});
