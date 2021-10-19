// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import * as path from "path";
import * as vscode from "vscode";

import * as commonUtils from "../../../src/debug/commonUtils";
import { TeamsfxTaskProvider } from "../../../src/debug/teamsfxTaskProvider";

suite("[debug > teamsfxTaskProvider]", () => {
  const taskProvider = new TeamsfxTaskProvider();
  const testWorkspaceFolder = {} as vscode.WorkspaceFolder;
  suite("resolveTask", () => {
    test("frontend dev", async () => {
      sinon.stub(vscode.workspace, "workspaceFolders").value([
        {
          uri: vscode.Uri.file("test"),
          name: "test",
          index: 0,
        } as vscode.WorkspaceFolder,
      ]);
      sinon.stub(commonUtils, "isFxProject").callsFake(async (folderPath: string) => {
        return true;
      });
      sinon
        .stub(commonUtils, "getProjectRoot")
        .callsFake(async (folderPath: string, folderName: string) => {
          return path.join(folderPath, folderName);
        });

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
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("frontend dev");
      chai.expect(resolvedTask!.problemMatchers).eql(["$teamsfx-frontend-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });

    test("backend dev", async () => {
      sinon.stub(vscode.workspace, "workspaceFolders").value([
        {
          uri: vscode.Uri.file("test"),
          name: "test",
          index: 0,
        } as vscode.WorkspaceFolder,
      ]);
      sinon.stub(commonUtils, "isFxProject").callsFake(async (folderPath: string) => {
        return true;
      });
      sinon
        .stub(commonUtils, "getProjectRoot")
        .callsFake(async (folderPath: string, folderName: string) => {
          return path.join(folderPath, folderName);
        });

      const inputTask = new vscode.Task(
        {
          type: "teamsfx",
          command: "dev",
          component: "backend",
        },
        testWorkspaceFolder,
        "backend dev",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("backend dev");
      chai.expect(resolvedTask!.problemMatchers).eql(["$teamsfx-backend-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });

    test("bot dev", async () => {
      sinon.stub(vscode.workspace, "workspaceFolders").value([
        {
          uri: vscode.Uri.file("test"),
          name: "test",
          index: 0,
        } as vscode.WorkspaceFolder,
      ]);
      sinon.stub(commonUtils, "isFxProject").callsFake(async (folderPath: string) => {
        return true;
      });
      sinon
        .stub(commonUtils, "getProjectRoot")
        .callsFake(async (folderPath: string, folderName: string) => {
          return path.join(folderPath, folderName);
        });

      const inputTask = new vscode.Task(
        {
          type: "teamsfx",
          command: "dev",
          component: "bot",
        },
        testWorkspaceFolder,
        "bot dev",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("bot dev");
      chai.expect(resolvedTask!.problemMatchers).eql(["$teamsfx-bot-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });

    test("bot watch", async () => {
      sinon.stub(vscode.workspace, "workspaceFolders").value([
        {
          uri: vscode.Uri.file("test"),
          name: "test",
          index: 0,
        } as vscode.WorkspaceFolder,
      ]);
      sinon.stub(commonUtils, "isFxProject").callsFake(async (folderPath: string) => {
        return true;
      });
      sinon
        .stub(commonUtils, "getProjectRoot")
        .callsFake(async (folderPath: string, folderName: string) => {
          return path.join(folderPath, folderName);
        });

      const inputTask = new vscode.Task(
        {
          type: "teamsfx",
          command: "watch",
          component: "bot",
        },
        testWorkspaceFolder,
        "bot watch",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("bot watch");
      chai.expect(resolvedTask!.problemMatchers).eql(["$tsc-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });

    test("invalid command", async () => {
      sinon.stub(vscode.workspace, "workspaceFolders").value([
        {
          uri: vscode.Uri.file("test"),
          name: "test",
          index: 0,
        } as vscode.WorkspaceFolder,
      ]);
      sinon.stub(commonUtils, "isFxProject").callsFake(async (folderPath: string) => {
        return true;
      });
      sinon
        .stub(commonUtils, "getProjectRoot")
        .callsFake(async (folderPath: string, folderName: string) => {
          return path.join(folderPath, folderName);
        });

      const inputTask = new vscode.Task(
        {
          type: "teamsfx",
          command: "try", // invalid
          component: "frontend",
        },
        testWorkspaceFolder,
        "frontend try",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).to.be.undefined;

      sinon.restore();
    });

    test("invalid component", async () => {
      sinon.stub(vscode.workspace, "workspaceFolders").value([
        {
          uri: vscode.Uri.file("test"),
          name: "test",
          index: 0,
        } as vscode.WorkspaceFolder,
      ]);
      sinon.stub(commonUtils, "isFxProject").callsFake(async (folderPath: string) => {
        return true;
      });
      sinon
        .stub(commonUtils, "getProjectRoot")
        .callsFake(async (folderPath: string, folderName: string) => {
          return path.join(folderPath, folderName);
        });

      const inputTask = new vscode.Task(
        {
          type: "teamsfx",
          command: "dev",
          component: "try", // invalid
        },
        testWorkspaceFolder,
        "try dev",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).to.be.undefined;

      sinon.restore();
    });
  });
});
