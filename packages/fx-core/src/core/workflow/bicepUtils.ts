// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import os from "os";
import * as path from "path";
import { NotImplementedError } from "../error";
import { Bicep, ConfigurationBicep, ProvisionBicep } from "./interface";

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

export async function persistProvisionBicepPlans(
  projectPath: string,
  provisionBicep: ProvisionBicep
): Promise<string[]> {
  const plans: string[] = [];
  const templateFolder = path.join(projectPath, "templates", "azure");
  if (provisionBicep.Modules) {
    for (const module of Object.keys(provisionBicep.Modules)) {
      const value = provisionBicep.Modules[module];
      if (value) {
        const filePath = path.join(templateFolder, "provision", `${module}.bicep`);
        if (await fs.pathExists(filePath)) {
          plans.push(`append '${module}' provision module bicep to file: ${filePath}`);
        } else {
          plans.push(`create '${module}' provision module bicep file: ${filePath}`);
        }
      }
    }
  }
  if (provisionBicep.Orchestration) {
    const filePath = path.join(templateFolder, "provision.bicep");
    plans.push(`append provision orchestration bicep to file: ${filePath}`);
  }
  return plans;
}

export async function persistConfigBicep(
  projectPath: string,
  configBicep: ConfigurationBicep
): Promise<Result<any, FxError>> {
  const templateFolder = path.join(projectPath, "templates", "azure");
  if (configBicep.Modules) {
    for (const module of Object.keys(configBicep.Modules)) {
      const value = configBicep.Modules[module];
      if (value) {
        const filePath = path.join(templateFolder, "teamsFx", `${module}.bicep`);
        await fs.writeFile(filePath, value.replace(/\r?\n/g, os.EOL).trim(), { encoding: "utf-8" });
      }
    }
  }
  if (configBicep.Orchestration) {
    const filePath = path.join(templateFolder, "config.bicep");
    await fs.appendFile(
      filePath,
      os.EOL + os.EOL + configBicep.Orchestration.trim().replace(/\r?\n/g, os.EOL)
    );
  }
  return ok(undefined);
}

export async function persistConfigBicepPlans(
  projectPath: string,
  provisionBicep: ProvisionBicep
): Promise<string[]> {
  const plans: string[] = [];
  const templateFolder = path.join(projectPath, "templates", "azure");
  if (provisionBicep.Modules) {
    for (const module of Object.keys(provisionBicep.Modules)) {
      const value = provisionBicep.Modules[module];
      if (value) {
        const filePath = path.join(templateFolder, "teamsFx", `${module}.bicep`);
        if (await fs.pathExists(filePath)) {
          plans.push(`rewrite '${module}' configuration module bicep to file: ${filePath}`);
        } else {
          plans.push(`create '${module}' configuration module bicep file: ${filePath}`);
        }
      }
    }
  }
  if (provisionBicep.Orchestration) {
    const filePath = path.join(templateFolder, "provision.bicep");
    plans.push(`append configuration orchestration bicep to file: ${filePath}`);
  }
  return plans;
}

export async function persistParams(
  projectPath: string,
  params: Record<string, string>
): Promise<Result<any, FxError>> {
  return err(new NotImplementedError("persistParams"));
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
  }
  return ok(undefined);
}

export async function persistBicepPlans(projectPath: string, bicep: Bicep): Promise<string[]> {
  let plans: string[] = [];
  if (bicep.Provision) {
    const res = await persistProvisionBicepPlans(projectPath, bicep.Provision);
    plans = plans.concat(res);
  }
  if (bicep.Configuration) {
    const res = await persistConfigBicepPlans(projectPath, bicep.Configuration);
    plans = plans.concat(res);
  }
  if (bicep.Parameters) {
  }
  return plans;
}
