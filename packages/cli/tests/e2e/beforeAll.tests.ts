// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { cleanUpResourcesCreatedHoursAgo, getAppNamePrefix } from "./commonUtils";

const hours = 2;
const retryTimes = 2;

before(async () => {
    const promise1 = cleanUpResourcesCreatedHoursAgo("aad", getAppNamePrefix(), hours, retryTimes);
    const promise2 = cleanUpResourcesCreatedHoursAgo("rg", getAppNamePrefix(), hours, retryTimes);
    await Promise.all([promise1, promise2]);
});
