// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
chaiUse(chaiPromises);
let restore:()=>void;
const env = (window as any).__env__;
// just a sample.
describe("Create instance", () => {
    console.log("=========== hello", env.SDK_INTEGRATION_SQL_ENDPOINT);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("Get graphClient", async function() {});
});
