// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import { Argv } from "yargs";

import { err, FxError, ok, Result, Platform } from "@microsoft/teamsfx-api";
import { ProjectSettingsHelper } from "@microsoft/teamsfx-core";
import activate from "../activate";
import { getSystemInputs, setSubscriptionId } from "../utils";
import { YargsCommand } from "../yargsCommand";
import CliTelemetry from "../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../userInteraction";
import HelpParamGenerator from "../helpParamGenerator";
import { automaticNpmInstallHandler } from "./preview/npmInstallHandler";

export class ResourceAddSql extends YargsCommand {
  public readonly commandHead = `azure-sql`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add a new SQL database.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("addResource-sql");
    return yargs.options(this.params);
  }

  public override modifyArguments(args: { [argName: string]: any }) {
    CLIUIInstance.updatePresetAnswer("add-azure-resources", args["add-azure-resources"]);
    delete args["add-azure-resources"];
    return args;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpdateProjectStart, {
      [TelemetryProperty.Resources]: this.commandHead,
    });

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
        [TelemetryProperty.Resources]: this.commandHead,
      });
      return err(result.error);
    }

    const func = {
      namespace: "fx-solution-azure",
      method: "addResource",
    };

    const core = result.value;

    {
      const inputs = getSystemInputs(rootFolder);
      inputs.ignoreEnvInfo = true;
      const result = await core.executeUserTask(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
          [TelemetryProperty.Resources]: this.commandHead,
        });
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateProject, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.Resources]: this.commandHead,
    });
    return ok(null);
  }
}

export class ResourceAddApim extends YargsCommand {
  public readonly commandHead = `azure-apim`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add a new API Managment service instance.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("addResource-apim");
    return yargs.options(this.params);
  }

  public override modifyArguments(args: { [argName: string]: any }) {
    if (!("apim-resource-group" in args)) {
      args["apim-resource-group"] = undefined;
    }
    if (!("apim-service-name" in args)) {
      args["apim-service-name"] = undefined;
    }

    CLIUIInstance.updatePresetAnswer("add-azure-resources", args["add-azure-resources"]);
    delete args["add-azure-resources"];
    return args;
  }

  public async runCommand(args: {
    [argName: string]: string | undefined;
  }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpdateProjectStart, {
      [TelemetryProperty.Resources]: this.commandHead,
    });

    {
      const result = await setSubscriptionId(args.subscription, rootFolder);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
          [TelemetryProperty.Resources]: this.commandHead,
        });
        return result;
      }
    }

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
        [TelemetryProperty.Resources]: this.commandHead,
      });
      return err(result.error);
    }

    const func = {
      namespace: "fx-solution-azure",
      method: "addResource",
    };

    const core = result.value;
    {
      const inputs = getSystemInputs(rootFolder);
      inputs.ignoreEnvInfo = true;
      const result = await core.executeUserTask(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
          [TelemetryProperty.Resources]: this.commandHead,
        });
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateProject, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.Resources]: this.commandHead,
    });
    return ok(null);
  }
}

export class ResourceAddFunction extends YargsCommand {
  public readonly commandHead = `azure-function`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add a new function app.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("addResource-function");
    return yargs.options(this.params);
  }

  public override modifyArguments(args: { [argName: string]: any }) {
    CLIUIInstance.updatePresetAnswer("add-azure-resources", args["add-azure-resources"]);
    delete args["add-azure-resources"];
    return args;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpdateProjectStart, {
      [TelemetryProperty.Resources]: this.commandHead,
    });

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
        [TelemetryProperty.Resources]: this.commandHead,
      });
      return err(result.error);
    }

    const func = {
      namespace: "fx-solution-azure",
      method: "addResource",
    };

    const core = result.value;
    const configResult = await core.getProjectConfig({
      projectPath: rootFolder,
      platform: Platform.CLI,
      ignoreEnvInfo: true,
    });
    if (configResult.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, configResult.error, {
        [TelemetryProperty.Resources]: this.commandHead,
      });
      return err(configResult.error);
    }
    const includeBackend = ProjectSettingsHelper.includeBackend(configResult.value?.settings);
    {
      const inputs = getSystemInputs(rootFolder);
      inputs.ignoreEnvInfo = true;
      const result = await core.executeUserTask(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
          [TelemetryProperty.Resources]: this.commandHead,
        });
        return err(result.error);
      }
    }

    await automaticNpmInstallHandler(rootFolder, true, includeBackend, true);

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateProject, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.Resources]: this.commandHead,
    });
    return ok(null);
  }
}

export class ResourceAddKeyVault extends YargsCommand {
  public readonly commandHead = `azure-keyvault`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Add a new Azure Key Vault service.";

  public builder(yargs: Argv): Argv<any> {
    this.params = HelpParamGenerator.getYargsParamForHelp("addResource-keyvault");
    return yargs.options(this.params);
  }

  public override modifyArguments(args: { [argName: string]: any }) {
    CLIUIInstance.updatePresetAnswer("add-azure-resources", args["add-azure-resources"]);
    delete args["add-azure-resources"];
    return args;
  }

  public async runCommand(args: { [argName: string]: string }): Promise<Result<null, FxError>> {
    const rootFolder = path.resolve(args.folder || "./");
    CliTelemetry.withRootFolder(rootFolder).sendTelemetryEvent(TelemetryEvent.UpdateProjectStart, {
      [TelemetryProperty.Resources]: this.commandHead,
    });

    const result = await activate(rootFolder);
    if (result.isErr()) {
      CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
        [TelemetryProperty.Resources]: this.commandHead,
      });
      return err(result.error);
    }

    const func = {
      namespace: "fx-solution-azure",
      method: "addResource",
    };

    const core = result.value;
    {
      const inputs = getSystemInputs(rootFolder);
      inputs.ignoreEnvInfo = true;
      const result = await core.executeUserTask(func, inputs);
      if (result.isErr()) {
        CliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdateProject, result.error, {
          [TelemetryProperty.Resources]: this.commandHead,
        });
        return err(result.error);
      }
    }

    CliTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateProject, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.Resources]: this.commandHead,
    });
    return ok(null);
  }
}
