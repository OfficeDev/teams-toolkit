// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { validate as uuidValidate } from "uuid";
import { TemplateType } from "./constant";
import { deployArgs, templateArgs } from "./interface";
import { hasBicepTemplate } from "./util/util";

export async function validateArgs(args: deployArgs): Promise<string[]> {
  const invalidParameters: string[] = [];
  if (!args.subscriptionId || !uuidValidate(args.subscriptionId)) {
    invalidParameters.push("subscriptionId is invalid");
  }

  if (!args.resourceGroupName) {
    invalidParameters.push("resourceGroupName is invalid");
  }

  const res = await validateTemplates(args.templates);
  invalidParameters.push(...res);

  const needBicepCli = hasBicepTemplate(args.templates);
  if (await validateBicep(args.bicepCliVersion, needBicepCli)) {
    invalidParameters.push("bicepCliVersion  is invalid");
  }

  return invalidParameters;
}

// TODO
async function validateBicep(
  bicepCliVersion: string | undefined,
  needBicepCli: boolean
): Promise<boolean> {
  if (!needBicepCli) {
    return true;
  }

  // if there is no bicep cli version, we will check bicep in PATH
  if (!bicepCliVersion) {
  } else {
    // check the bicep cli version
  }
  return true;
}

function validateTemplates(templates: templateArgs[]): string[] {
  const res: string[] = [];
  if (templates.length === 0) {
    res.push(`templates is invalid for it is empty`);
  }

  for (let i = 0; i < templates.length; i++) {
    const iRes = validateTemplate(templates[i]);
    for (const value of iRes) {
      res.push(`templates.${i}.${value}`);
    }
  }
  return res;
}

function validateTemplate(template: templateArgs): string[] {
  const res: string[] = [];
  if (!template.deploymentName) {
    res.push("deploymentName is invalid");
  }

  if (path.extname(template.parameters).toLowerCase() !== "json") {
    res.push("parameters is invalid");
  }

  const templateType = path.extname(template.path).toLowerCase();
  if (templateType !== TemplateType.Json && templateType !== TemplateType.Bicep) {
    res.push("path is invalid");
  }
  return res;
}
