// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import { Argv } from "yargs";

import { FxError, err, ok, Result, Stage, Void, LogLevel } from "@microsoft/teamsfx-api";

import M365TokenProvider from "../commonlib/m365Login";
import { YargsCommand } from "../yargsCommand";
import CLILogProvider from "../commonlib/log";
import { signedIn } from "../commonlib/common/constant";

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sideLoading(baseUrl: string, token: string, manifestPath: string): Promise<void> {
  const data = await fs.readFile(manifestPath);

  const instance = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
  });
  instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  try {
    const content = new FormData();
    content.append("package", data);
    CLILogProvider.necessaryLog(LogLevel.Info, "Uploading package ...");
    const uploadResponse = await instance.post(
      "/dev/v1/users/packages",
      content.getBuffer(),
      content.getHeaders()
    );

    const operationId = uploadResponse.data.operationId;
    const titleId = uploadResponse.data.titlePreview.titleId;
    CLILogProvider.necessaryLog(
      LogLevel.Info,
      `Package uploaded. OperationId: ${operationId}, TitleId: ${titleId}`
    );

    CLILogProvider.necessaryLog(LogLevel.Info, "Acquiring package ...");
    const acquireResponse = await instance.post("/dev/v1/users/packages/acquisitions", {
      operationId: operationId,
    });

    const statusId = acquireResponse.data.statusId;
    CLILogProvider.necessaryLog(LogLevel.Info, `Acquiring package with statusId: ${statusId} ...`);

    let complete = false;
    do {
      const statusResponse = await instance.get(`/dev/v1/users/packages/status/${statusId}`);
      const resCode = statusResponse.status;
      if (resCode === 200) {
        complete = true;
      } else {
        await delay(2000);
      }
    } while (complete === false);

    CLILogProvider.necessaryLog(LogLevel.Info, `Acquire done. App TitleId: ${titleId}`);

    CLILogProvider.necessaryLog(LogLevel.Info, "Getting LaunchInfo ...");
    const launchInfo = await instance.get(`/catalog/v1/users/titles/${titleId}/launchInfo`, {
      params: {
        SupportedElementTypes:
          // eslint-disable-next-line no-secrets/no-secrets
          "Extension,OfficeAddIn,ExchangeAddIn,FirstPartyPages,Dynamics,AAD,LineOfBusiness,LaunchPage,MessageExtension,Bot",
      },
    });
    CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(launchInfo.data), true);
    CLILogProvider.necessaryLog(LogLevel.Info, "Sideloading done.");
  } catch (error: any) {
    CLILogProvider.necessaryLog(LogLevel.Error, "Sideloading failed.");
    if (error.response) {
      CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(error.response.data));
    } else {
      CLILogProvider.necessaryLog(LogLevel.Error, error.message);
    }

    CLILogProvider.debug(JSON.stringify(error));
  }
}

export class M365Sideloading extends YargsCommand {
  public readonly commandHead = "sideloading";
  public readonly command = this.commandHead;
  public readonly description =
    "Sideloading an M365 App with corresponding information specified in the given manifest package";

  builder(yargs: Argv): Argv<any> {
    yargs
      .option("file-path", {
        require: true,
        description: "Path to the App manifest zip package",
        type: "string",
      })
      .option("service-config", {
        require: true,
        description: "Path to the sideloading service config",
        type: "string",
      })
      .example(
        "teamsfx m365 sideloading --file-path appPackage.zip --service-config test.json",
        "Sideloading the app package to test environment/service"
      );
    return yargs.version(false);
  }

  async runCommand(args: { [argName: string]: string }): Promise<Result<any, FxError>> {
    const manifestPath = args["file-path"];
    const configPath = args["service-config"];
    let config: any;

    try {
      config = await fs.readJSON(configPath);
      if (config.scope === undefined || config.baseUrl === undefined) {
        config = undefined;
        CLILogProvider.necessaryLog(
          LogLevel.Error,
          "Failed to load service config. Correct the config format to include 'scope' and 'baseUrl'"
        );
      }
    } catch (error) {
      CLILogProvider.necessaryLog(
        LogLevel.Error,
        "Failed to load service config. Correct the config format to include 'scope' and 'baseUrl'"
      );
      CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(error));
    }

    if (config) {
      const accountRes = await M365TokenProvider.getStatus({ scopes: [config.scope] });
      if (accountRes.isErr()) {
        CLILogProvider.necessaryLog(
          LogLevel.Error,
          `Cannot get token of scope ${config.scope}. Use 'teamsfx account login m365' to log in the correct account.`
        );
        throw accountRes.error;
      } else {
        const account = accountRes.value;
        if (account.status !== signedIn || account.token === undefined) {
          CLILogProvider.necessaryLog(
            LogLevel.Error,
            "No M365 account. Use `teamsfx account login m365` to log in."
          );
        } else {
          await sideLoading(config.baseUrl, account.token, manifestPath);
        }
      }
    }

    return ok(Void);
  }
}

export default class M365 extends YargsCommand {
  public readonly commandHead = `m365`;
  public readonly command = `${this.commandHead} <action>`;
  public readonly description = "The M365 App Management.";

  public readonly subCommands: YargsCommand[] = [new M365Sideloading()];

  public builder(yargs: Argv): Argv<any> {
    yargs.options("action", {
      description: `${this.subCommands.map((cmd) => cmd.commandHead).join("|")}`,
      type: "string",
      choices: this.subCommands.map((cmd) => cmd.commandHead),
      global: false,
    });
    this.subCommands.forEach((cmd) => {
      yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    });
    return yargs.version(false);
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    return ok(null);
  }
}
