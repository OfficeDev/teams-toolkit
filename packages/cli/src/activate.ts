// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Core } from "fx-api";

export default async function activate(): Promise<Core> {
    const corePkg = await import("fx-core");
    return corePkg.TeamsCore.getInstance();
}
