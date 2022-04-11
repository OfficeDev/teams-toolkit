// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { cleanUpResourcesCreatedHoursAgo, getAppNamePrefix } from "./commonUtils";

(async () => {
  const promise1 = cleanUpResourcesCreatedHoursAgo("aad", getAppNamePrefix(), 2);
  const promise2 = cleanUpResourcesCreatedHoursAgo("rg", getAppNamePrefix(), 2);
  const promise3 = cleanUpResourcesCreatedHoursAgo("rg", "fx_e_2_e_", 2);
  await Promise.all([promise1, promise2, promise3]);
})();
