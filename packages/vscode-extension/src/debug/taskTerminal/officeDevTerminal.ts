// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as cp from "child_process";
import * as vscode from "vscode";
import * as globalVariables from "../../globalVariables";
import { FxError, Result, Void, ok } from "@microsoft/teamsfx-api";
// eslint-disable-next-line import/no-cycle
import { BaseTaskTerminal, ControlCodes } from "./baseTaskTerminal";
import { fetchManifestList } from "@microsoft/teamsfx-core";
import { localize } from "../../utils/localizeUtils";

export const triggerInstall = "trigger install dependencies";
export const triggerValidate = "trigger validate";
export const triggerStopDebug = "trigger stop debug";
export const triggerGenerateGUID = "generate manifest GUID";

export class OfficeDevTerminal extends BaseTaskTerminal {
  private static instance: vscode.Terminal | undefined;

  constructor() {
    super();
  }

  do(): Promise<Result<Void, FxError>> {
    return Promise.resolve(ok(Void));
  }

  async open() {
    this.writeEmitter.fire(
      `${this.color(localize("teamstoolkit.officeAddIn.terminal.open"), "green")}\r\n`
    );
    await this.do();
  }

  close(): void {
    this.stop()
      .catch((error) => {
        this.writeEmitter.fire(`${error?.message as string}\r\n`);
      })
      .finally(() => {
        OfficeDevTerminal.instance?.dispose();
        OfficeDevTerminal.instance = undefined;
      });
  }

  handleInput(data: string): void {
    if (data.includes(ControlCodes.CtrlC)) {
      this.stop()
        .catch((error) => {
          this.writeEmitter.fire(`${error?.message as string}\r\n`);
        })
        .finally(() => {
          OfficeDevTerminal.instance?.dispose();
          OfficeDevTerminal.instance = undefined;
        });
    } else if (data.startsWith(triggerInstall)) {
      this.writeEmitter.fire(
        `\r\n${this.color(
          localize("teamstoolkit.officeAddIn.terminal.installDependency"),
          "yellow"
        )}\r\n`
      );
      this.installDependencies();
    } else if (data.startsWith(triggerValidate)) {
      this.writeEmitter.fire(
        `\r\n${this.color(
          localize("teamstoolkit.officeAddIn.terminal.validateManifest"),
          "yellow"
        )}\r\n`
      );
      this.runValidate();
    } else if (data.startsWith(triggerStopDebug)) {
      this.writeEmitter.fire(
        `\r\n${this.color(
          localize("teamstoolkit.officeAddIn.terminal.stopDebugging"),
          "yellow"
        )}\r\n`
      );
      this.stopDebug();
    } else if (data.startsWith(triggerGenerateGUID)) {
      this.writeEmitter.fire(
        `\r\n${this.color(
          localize("teamstoolkit.officeAddIn.terminal.generateManifestGUID"),
          "yellow"
        )}\r\n`
      );
      this.generateManifestGUID();
    }
  }

  public startChildProcess(cmd: string, args: readonly string[]) {
    const cmdStr = cmd + " " + args.join(" ");
    this.writeEmitter.fire(`${cmdStr}\r\n`);
    const options: cp.SpawnOptions = {
      cwd: globalVariables.workspaceUri?.fsPath ?? "" + "/src",
      shell: true,
      detached: false,
    };

    const childProc = cp.spawn(cmd, args, options);
    childProc.stdout?.setEncoding("utf-8");
    childProc.stdout?.on("data", (data: string | Buffer) => {
      const line = data.toString().replace(/\n/g, "\r\n");
      this.writeEmitter.fire(line);
    });

    childProc.stderr?.setEncoding("utf-8");
    childProc.stderr?.on("data", (data: string | Buffer) => {
      const line = data.toString().replace(/\n/g, "\r\n");
      this.writeEmitter.fire(line);
    });

    childProc.on("exit", (code: number) => {
      if (code == 0) {
        this.writeEmitter.fire(
          this.color(
            `${cmdStr} ${localize("teamstoolkit.officeAddIn.terminal.success.tips")}`,
            "green"
          ) + "\r\n"
        );
      } else {
        this.writeEmitter.fire(
          this.color(
            `${cmdStr} ${localize("teamstoolkit.officeAddIn.terminal.fail.tips")}`,
            "red"
          ) + "\r\n"
        );
      }
      this.writeEmitter.fire(
        this.color(localize("teamstoolkit.officeAddIn.terminal.terminate"), "green") + "\r\n"
      );
    });
  }

  public stopDebug() {
    const manifestFileName = this.getManifest();
    if (manifestFileName) {
      const cmd = "npx";
      const args = ["office-addin-debugging", "stop", manifestFileName];
      this.startChildProcess(cmd, args);
    }
  }

  public generateManifestGUID() {
    const manifestFileName = this.getManifest();
    if (manifestFileName) {
      const cmd = "npx";
      const args = ["--yes", "office-addin-manifest", "modify", manifestFileName, "--guid"];
      this.startChildProcess(cmd, args);
    }
  }

  public runValidate() {
    const manifestFileName = this.getManifest();
    if (manifestFileName) {
      const cmd = "npx";
      const args = ["--yes", "office-addin-manifest", "validate", manifestFileName];
      this.startChildProcess(cmd, args);
    }
  }

  public installDependencies() {
    const cmd = "npm";
    const args = ["install"];
    this.startChildProcess(cmd, args);
  }

  private getManifest(): string | undefined {
    const workspacePath = globalVariables.workspaceUri?.fsPath;
    const manifestList = fetchManifestList(workspacePath);
    if (!manifestList || manifestList.length == 0) {
      this.writeEmitter.fire(
        this.color(`${localize("teamstoolkit.officeAddIn.terminal.manifest.notfound")}\r\n`, "red")
      );
      return undefined;
    }

    return manifestList[0];
  }

  private color(msg: string, color: string) {
    switch (color) {
      case "red":
        return "\x1b[31m" + msg + "\x1b[0m";
      case "green":
        return "\x1b[32m" + msg + "\x1b[0m";
      case "yellow":
        return "\x1b[33m" + msg + "\x1b[0m";
      default:
        return msg;
    }
  }

  public static getInstance() {
    if (!OfficeDevTerminal.instance) {
      OfficeDevTerminal.instance = vscode.window.createTerminal({
        name: "OfficeAddInDev task",
        pty: new OfficeDevTerminal(),
      });
    }
    return OfficeDevTerminal.instance;
  }
}
