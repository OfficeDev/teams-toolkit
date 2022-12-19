// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { validate as uuidValidate } from "uuid";
import { getAvailableBicepVersions } from "../../utils/depsChecker/bicepChecker";
import { TemplateType } from "./constant";
import { deployArgs, templateArgs } from "./interface";
import { getFileExtension, hasBicepTemplate } from "./util/util";

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
  if (!(await validateBicep(args.bicepCliVersion, needBicepCli))) {
    invalidParameters.push("bicepCliVersion is invalid");
  }

  return invalidParameters;
}

async function validateBicep(
  bicepCliVersion: string | undefined,
  needBicepCli: boolean
): Promise<boolean> {
  if (!needBicepCli) {
    return true;
  }

  if (bicepCliVersion) {
    const versions = await getAvailableBicepVersions();
    return versions.includes(bicepCliVersion);
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

  if (template.parameters && getFileExtension(template.parameters) !== "json") {
    res.push("parameters is invalid");
  }
  const templateType = getFileExtension(template.path);
  if (templateType !== TemplateType.Json && templateType !== TemplateType.Bicep) {
    res.push("path is invalid");
  }
  return res;
}
