// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as fs from "fs-extra";

export const testFolder: string = path.resolve(__dirname, "..", "..", "test-folder");
fs.ensureDir(testFolder);

export const testWorkspace: string = path.resolve(testFolder, "myapp");
