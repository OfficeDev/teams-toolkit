// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import path from "path";
import fs from "fs-extra";

const testFolder: string = path.resolve(__dirname, "..", "..", "test-folder");
fs.ensureDir(testFolder);
