// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { AadManager, ResourceGroupManager } from "../commonlib";
import { getAppNamePrefix } from "./commonUtils";

export async function cleanUpAad(
  contains: string,
  hours?: number,
  retryTimes = 2
): Promise<void> {
  const aadManager = await AadManager.init();
  await aadManager.deleteAadApps(contains, hours, retryTimes);
}

export async function cleanUpResourceGroup(
  contains: string,
  hours?: number,
  retryTimes = 2
): Promise<void> {
  const groups = await ResourceGroupManager.searchResourceGroups(contains);
  const filteredGroups =
    hours && hours > 0
      ? groups.filter((group: { name?: string }) => {
          const name = group.name!;
          const startPos = name.indexOf(contains) + contains.length;
          const createdTime = Number(name.slice(startPos, startPos + 13));
          return Date.now() - createdTime > hours * 3600 * 1000;
        })
      : groups;

  const promises = filteredGroups.map((rg: { name?: string }) =>
    ResourceGroupManager.deleteResourceGroup(rg.name!, retryTimes)
  );
  await Promise.all(promises);
  console.log(
    `[Successfully] clean up ${promises.length} Azure resource groups.`
  );
}

(async () => {
  const promise1 = cleanUpAad(getAppNamePrefix());
  const promise2 = cleanUpResourceGroup(getAppNamePrefix());
  const promise3 = cleanUpResourceGroup("fx_e_2_e_");
  const promise4 = cleanUpResourceGroup("teamsfxt_");
  const promise5 = cleanUpResourceGroup("fx_");
  const promise6 = cleanUpResourceGroup("fxui");
  await Promise.all([
    promise1,
    promise2,
    promise3,
    promise4,
    promise5,
    promise6,
  ]);
})();
