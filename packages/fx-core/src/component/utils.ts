// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Bicep,
  CallServiceEffect,
  ConfigurationBicep,
  err,
  FileEffect,
  FileOperation,
  FxError,
  ok,
  ProvisionBicep,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import os from "os";
import * as path from "path";
import { HelpLinks } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { environmentManager } from "../core/environment";
import { SolutionError } from "../plugins/solution/fx-solution/constants";

export async function persistProvisionBicep(
  projectPath: string,
  provisionBicep: ProvisionBicep
): Promise<Result<any, FxError>> {
  const templateFolder = path.join(projectPath, "templates", "azure");
  if (provisionBicep.Modules) {
    for (const module of Object.keys(provisionBicep.Modules)) {
      const value = provisionBicep.Modules[module];
      if (value) {
        const filePath = path.join(templateFolder, "provision", `${module}.bicep`);
        await fs.appendFile(filePath, value.replace(/\r?\n/g, os.EOL).trim());
      }
    }
  }
  if (provisionBicep.Orchestration) {
    const filePath = path.join(templateFolder, "provision.bicep");
    await fs.appendFile(
      filePath,
      os.EOL + os.EOL + provisionBicep.Orchestration.trim().replace(/\r?\n/g, os.EOL)
    );
  }
  return ok(undefined);
}

export function persistProvisionBicepPlans(
  projectPath: string,
  provisionBicep: ProvisionBicep
): string[] {
  const plans: string[] = [];
  const templateFolder = path.join(projectPath, "templates", "azure");
  if (provisionBicep.Modules) {
    for (const module of Object.keys(provisionBicep.Modules)) {
      const value = provisionBicep.Modules[module];
      if (value) {
        const filePath = path.join(templateFolder, "provision", `${module}.bicep`);
        const plan = fileEffectPlanString(
          filePath,
          "replace",
          `provision module bicep for ${module}`
        );
        if (plan) {
          plans.push(plan);
        }
      }
    }
  }
  if (provisionBicep.Orchestration) {
    const filePath = path.join(templateFolder, "provision.bicep");
    const plan = fileEffectPlanString(filePath, "append", "provision orchestration bicep");
    if (plan) {
      plans.push(plan);
    }
  }
  return plans;
}

export function persistConfigBicep(
  projectPath: string,
  configBicep: ConfigurationBicep
): Result<any, FxError> {
  const templateFolder = path.join(projectPath, "templates", "azure");
  if (configBicep.Modules) {
    for (const module of Object.keys(configBicep.Modules)) {
      const value = configBicep.Modules[module];
      if (value) {
        const filePath = path.join(templateFolder, "teamsFx", `${module}.bicep`);
        fs.writeFileSync(filePath, value.replace(/\r?\n/g, os.EOL).trim(), { encoding: "utf-8" });
      }
    }
  }
  if (configBicep.Orchestration) {
    const filePath = path.join(templateFolder, "config.bicep");
    fs.appendFileSync(
      filePath,
      os.EOL + os.EOL + configBicep.Orchestration.trim().replace(/\r?\n/g, os.EOL)
    );
  }
  return ok(undefined);
}

export function persistConfigBicepPlans(
  projectPath: string,
  provisionBicep: ProvisionBicep
): string[] {
  const plans: string[] = [];
  const templateFolder = path.join(projectPath, "templates", "azure");
  if (provisionBicep.Modules) {
    for (const module of Object.keys(provisionBicep.Modules)) {
      const value = provisionBicep.Modules[module];
      if (value) {
        const filePath = path.join(templateFolder, "teamsFx", `${module}.bicep`);
        const plan = fileEffectPlanString(
          filePath,
          "replace",
          `configuration module bicep for ${module}`
        );
        if (plan) {
          plans.push(plan);
        }
      }
    }
  }
  if (provisionBicep.Orchestration) {
    const filePath = path.join(templateFolder, "provision.bicep");
    const plan = fileEffectPlanString(filePath, "append", "configuration orchestration bicep");
    if (plan) {
      plans.push(plan);
    }
  }
  return plans;
}

export function persistParamsBicepPlans(
  projectPath: string,
  params: Record<string, string>
): string[] {
  const plans: string[] = [];
  if (Object.keys(params).length === 0) return [];
  const parameterEnvFolderPath = path.join(projectPath, ".fx", "configs");
  fs.ensureDirSync(parameterEnvFolderPath);
  const configFiles = fs.readdirSync(parameterEnvFolderPath);
  const remoteEnvNames = configFiles
    .map((file) => {
      const match = /^config\.(?<envName>[\w\d-_]+)\.json$/i.exec(file);
      if (match != null && match.groups != null) {
        const envName = match.groups.envName;
        if (envName !== "local") return envName;
      }
      return null;
    })
    .filter((env) => env !== null);
  for (const env of remoteEnvNames) {
    const parameterFileName = `azure.parameters.${env}.json`;
    const parameterEnvFilePath = path.join(parameterEnvFolderPath, parameterFileName);
    const plan = fileEffectPlanString(parameterEnvFilePath, "append");
    if (plan) plans.push(plan);
  }
  return plans;
}

export async function persistParams(
  projectPath: string,
  params: Record<string, string>
): Promise<Result<any, FxError>> {
  const envListResult = await environmentManager.listRemoteEnvConfigs(projectPath);
  if (envListResult.isErr()) {
    return err(envListResult.error);
  }
  const parameterEnvFolderPath = path.join(projectPath, ".fx", "configs");
  await fs.ensureDir(parameterEnvFolderPath);
  for (const env of envListResult.value) {
    const parameterFileName = `azure.parameters.${env}.json`;
    const parameterEnvFilePath = path.join(parameterEnvFolderPath, parameterFileName);
    let parameterFileContent = "";
    if (await fs.pathExists(parameterEnvFilePath)) {
      const json = await fs.readJson(parameterEnvFilePath);
      const parameterObj = json.parameters.provisionParameters.value;
      const duplicateParam = Object.keys(parameterObj).filter((val) =>
        Object.keys(params).includes(val)
      );
      if (duplicateParam && duplicateParam.length != 0) {
        return err(
          new UserError({
            name: SolutionError.FailedToUpdateArmParameters,
            source: "bicep",
            helpLink: HelpLinks.ArmHelpLink,
            message: getDefaultString(
              "core.generateArmTemplates.DuplicateParameter",
              parameterEnvFilePath,
              duplicateParam
            ),
            displayMessage: getLocalizedString(
              "core.generateArmTemplates.DuplicateParameter",
              parameterEnvFilePath,
              duplicateParam
            ),
          })
        );
      }
      json.parameters.provisionParameters.value = Object.assign(parameterObj, params);
      parameterFileContent = JSON.stringify(json, undefined, 2);
    } else {
      const parameterObject = {
        $schema:
          "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
        contentVersion: "1.0.0.0",
        parameters: { provisionParameters: { value: params } },
      };
      parameterFileContent = JSON.stringify(parameterObject, undefined, 2);
    }
    await fs.writeFile(parameterEnvFilePath, parameterFileContent.replace(/\r?\n/g, os.EOL));
  }
  return ok(undefined);
}

export async function persistBicep(
  projectPath: string,
  bicep: Bicep
): Promise<Result<any, FxError>> {
  if (bicep.Provision) {
    const res = await persistProvisionBicep(projectPath, bicep.Provision);
    if (res.isErr()) return err(res.error);
  }
  if (bicep.Configuration) {
    const res = await persistConfigBicep(projectPath, bicep.Configuration);
    if (res.isErr()) return err(res.error);
  }
  if (bicep.Parameters) {
    const res = await persistParams(projectPath, bicep.Parameters);
    if (res.isErr()) return err(res.error);
  }
  return ok(undefined);
}

export function persistBicepPlans(projectPath: string, bicep: Bicep): string[] {
  let plans: string[] = [];
  if (bicep.Provision) {
    const res = persistProvisionBicepPlans(projectPath, bicep.Provision);
    plans = plans.concat(res);
  }
  if (bicep.Configuration) {
    const res = persistConfigBicepPlans(projectPath, bicep.Configuration);
    plans = plans.concat(res);
  }
  if (bicep.Parameters) {
    const res = persistProvisionBicepPlans(projectPath, bicep.Parameters);
    plans = plans.concat(res);
  }
  return plans;
}

export function fileEffectPlanStrings(fileEffect: FileEffect): string[] {
  const operation = fileEffect.operate || "create";
  const plans = [];
  if (typeof fileEffect.filePath === "string") {
    plans.push(fileEffectPlanString(fileEffect.filePath, operation, fileEffect.remarks));
  } else {
    for (const file of fileEffect.filePath) {
      plans.push(fileEffectPlanString(file, operation, undefined));
    }
  }
  return plans.filter((p) => p !== undefined) as string[];
}

export function serviceEffectPlanString(serviceEffect: CallServiceEffect): string {
  return `call cloud service: ${serviceEffect.name} (${serviceEffect.remarks})`;
}

export function fileEffectPlanString(
  file: string,
  operation: FileOperation,
  remarks?: string
): string | undefined {
  if (fs.pathExistsSync(file)) {
    if (operation === "create") return undefined;
    if (operation === "append") {
      return remarks
        ? `append ${remarks} content to the end of file: '${file}'`
        : `append to the end of file: '${file}'`;
    }
    if (operation === "replace") {
      return remarks ? `replace file: '${file}' (${remarks})` : `replace file: '${file}'`;
    }
    if (operation === "delete") {
      return `delete file: '${file}'`;
    }
  } else {
    if (operation === "create" || operation === "append" || operation === "replace")
      return remarks ? `create file: ${file} (${remarks})` : `create file: ${file}`;
    else return undefined;
  }
}
