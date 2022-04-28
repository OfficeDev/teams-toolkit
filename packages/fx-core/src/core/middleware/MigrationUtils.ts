// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";
import path from "path";
import { isAadManifestEnabled, isConfigUnifyEnabled } from "../../common/tools";
import { CoreHookContext } from "../types";
import fs from "fs-extra";
import { PluginNames } from "../../plugins";
import { RequiredResourceAccess } from "../../plugins/resource/aad/interfaces/AADManifest";

export interface Permission {
  resource: string;
  delegated: string[];
  application: string[];
}

export function permissionsToRequiredResourceAccess(
  permissions: Permission[]
): RequiredResourceAccess[] {
  const result: RequiredResourceAccess[] = [];
  permissions.forEach((permission) => {
    const res: RequiredResourceAccess = {
      resourceAppId: permission.resource,
      resourceAccess: permission.application
        .map((item) => {
          return { id: item, type: "Role" };
        })
        .concat(
          permission.delegated.map((item) => {
            return { id: item, type: "Scope" };
          })
        ),
    };

    result.push(res);
  });
  return result;
}

export async function needMigrateToAadManifest(ctx: CoreHookContext): Promise<boolean> {
  try {
    if (!isConfigUnifyEnabled() || !isAadManifestEnabled()) {
      return false;
    }

    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (!inputs.projectPath) {
      return false;
    }
    const fxExist = await fs.pathExists(path.join(inputs.projectPath as string, ".fx"));
    if (!fxExist) {
      return false;
    }

    const aadManifestTemplateExist = await fs.pathExists(
      path.join(inputs.projectPath as string, "templates", "appPackage", "aad.template.json")
    );

    if (aadManifestTemplateExist) {
      return false;
    }

    const permissionFileExist = await fs.pathExists(
      path.join(inputs.projectPath as string, "permissions.json")
    );
    const projectSettingsJson = await fs.readJson(
      path.join(inputs.projectPath as string, ".fx", "configs", "projectSettings.json")
    );
    const aadPluginIsActive = projectSettingsJson.solutionSettings.activeResourcePlugins.includes(
      PluginNames.AAD
    );

    if (!aadPluginIsActive || !permissionFileExist) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}
