// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import dotenv from "dotenv";

dotenv.config();

export const client_id = "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0";

export const user = process.env.TEST_USER_NAME || "";
export const password = process.env.TEST_USER_PASSWORD || "";

export const tenant = {
  id: process.env.TEST_TENANT_ID ? process.env.TEST_TENANT_ID : "72f988bf-86f1-41af-91ab-2d7cd011db47"
};

export const subscription = {
  id: process.env.TEST_SUBSCRIPTION_ID ? process.env.TEST_SUBSCRIPTION_ID : "1756abc0-3554-4341-8d6a-46674962ea19"
};
