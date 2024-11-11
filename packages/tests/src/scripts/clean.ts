// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Project } from "../utils/constants";
import { Env } from "../utils/env";
import {
  AppStudioCleanHelper,
  filterResourceGroupByName,
  deleteResourceGroupByName,
  GraphApiCleanHelper,
  SharePointApiCleanHelper,
  DevTunnelCleanHelper,
  M365TitleCleanHelper,
} from "../utils/cleanHelper";
import { getAppNamePrefix } from "../utils/nameUtil";
import { delay } from "../utils/retryHandler";

const appStudioAppNamePrefixList: string[] = [Project.namePrefix, "vs"];
const appNamePrefixList: string[] = [Project.namePrefix, "vs"];
const aadNamePrefixList: string[] = [Project.namePrefix, "vs"];
const rgNamePrefixList: string[] = [Project.namePrefix, "vs"];
const excludePrefix: string = getAppNamePrefix();

async function main() {
  const cleanService = await GraphApiCleanHelper.create(
    Env.cleanTenantId,
    Env.cleanClientId,
    Env.username,
    Env.password
  );

  console.log(`clean AAD (exclude ${excludePrefix})`);
  const aadList = await cleanService.listAad();
  if (aadList) {
    for (const aad of aadList) {
        if (
          !aad.displayName?.startsWith("delete")
        ) {
          console.log(aad.displayName);
          await cleanService.deleteAad(aad.id!);
        }
    }
  }
}

main()
  .then((_) => {
    console.log("Clean Job Done.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(-1);
  });
