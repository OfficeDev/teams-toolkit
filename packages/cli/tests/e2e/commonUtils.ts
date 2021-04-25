// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

import { AzureConfig } from "fx-api";

export const execAsync = promisify(exec);

const testFolder = path.resolve(os.homedir(), "test-folder");

export function getTestFolder() {
    if (!fs.pathExistsSync(testFolder)) {
        fs.mkdirSync(testFolder);
    }
    return testFolder;
}

export function getUniqueAppName() {
    return "teamsfxE2E" + uuidv4().slice(0, 8);
}

export function getSubscriptionId() {
    return AzureConfig.subscription.id;
}
