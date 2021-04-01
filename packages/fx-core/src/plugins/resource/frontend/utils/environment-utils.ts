// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as dotenv from 'dotenv';
import fs from 'fs-extra';

dotenv.config();

export class EnvironmentUtils {
    static async writeEnvironments(envFile: string, variables: { [key: string]: string }) {
        await fs.ensureFile(envFile);
        for (const key in variables) {
            if (variables[key] === process.env[key]) {
                continue;
            }
            await fs.appendFile(envFile, `${key}=${variables[key]}\r\n`);
        }
    }
}
