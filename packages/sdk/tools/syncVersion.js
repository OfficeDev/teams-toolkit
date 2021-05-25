// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
"use strict";

const fs = require("fs");
const pkg = require("../package.json");
fs.writeFileSync("src/packageMetadata.ts",
`// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const name = "${pkg.name}";
export const version = "${pkg.version}";
`);
