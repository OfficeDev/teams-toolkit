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
    test("frontend npm run dev", async () => {
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
          command: "npm run dev",
          component: "frontend",
        },
        testWorkspaceFolder,
        "frontend npm run dev",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("npm run dev");
      chai.expect(resolvedTask!.problemMatchers).eql(["$teamsfx-frontend-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });

    test("backend npm run dev", async () => {
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
          command: "npm run dev",
          component: "backend",
        },
        testWorkspaceFolder,
        "backend npm run dev",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("npm run dev");
      chai.expect(resolvedTask!.problemMatchers).eql(["$teamsfx-backend-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });

    test("bot npm run dev", async () => {
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
          command: "npm run dev",
          component: "bot",
        },
        testWorkspaceFolder,
        "bot npm run dev",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("npm run dev");
      chai.expect(resolvedTask!.problemMatchers).eql(["$teamsfx-bot-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });

    test("bot npm run watch", async () => {
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
          command: "npm run watch",
          component: "bot",
        },
        testWorkspaceFolder,
        "bot npm run watch",
        "teamsfx"
      );
      const resolvedTask = await taskProvider.resolveTask(inputTask);
      chai.expect(resolvedTask).not.to.be.undefined;
      chai.expect(resolvedTask!.name).equals("npm run watch");
      chai.expect(resolvedTask!.problemMatchers).eql(["$tsc-watch"]);
      chai.expect(resolvedTask!.isBackground).true;

      sinon.restore();
    });
  });
});
