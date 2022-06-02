// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function getProjectTemplatesFolderName(isVs: boolean): string {
  return isVs ? "Templates" : "templates";
}
