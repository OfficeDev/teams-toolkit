// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { WholeStatus } from "../../../chat/commands/nextstep/types";

/**
 * if the Office Add-in can be previewed in the local environment
 * @param status
 * @returns
 */
export function canOfficeAddInPreviewInLocalEnv(status: WholeStatus): boolean {
  return (
    !!status.projectOpened &&
    !!status.projectOpened.launchJSONContent &&
    (status.projectOpened.launchJSONContent.toLocaleLowerCase().includes("desktop (edge legacy)") ||
      status.projectOpened.launchJSONContent
        .toLocaleLowerCase()
        .includes("desktop (edge chromium)"))
  );
}

/**
 * if node_modules exists to check whether dependencies are installed
 * @param status
 * @returns
 */
export function isDependenciesInstalled(status: WholeStatus): boolean {
  return !!status.projectOpened && !!status.projectOpened.nodeModulesExist;
}
