// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator, FrontendValidator, SimpleAuthValidator } from "fx-api";

import {
    execAsync,
    getSubscriptionId,
    getTestFolder,
    getUniqueAppName,
    setSimpleAuthSkuNameToB1,
    cleanUp,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Create single tab", function () {
    const testFolder = getTestFolder();
    const appName = getUniqueAppName();
    const subscription = getSubscriptionId();
    const projectPath = path.resolve(testFolder, appName);

    it(`Tab`, async function () {
        // new a project ( tab + function + sql )
        await execAsync(
            `teamsfx new --interactive false --app-name ${appName} --capabilities tab `,
            {
                cwd: testFolder,
                env: process.env,
                timeout: 0
            }
        );
        console.log(`[Successfully] scaffold to ${projectPath}`);

        await setSimpleAuthSkuNameToB1(projectPath);

        // set subscription
        await execAsync(
            `teamsfx account set --subscription ${subscription}`,
            {
                cwd: projectPath,
                env: process.env,
                timeout: 0
            }
        );

        // provision
        await execAsync(
            `teamsfx provision`,
            {
                cwd: projectPath,
                env: process.env,
                timeout: 0
            }
        );

        {
            // Validate provision
            // Get context
            const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

            // Validate Aad App
            const aad = AadValidator.init(context, false, AppStudioLogin);
            await AadValidator.validate(aad);

            // Validate Simple Auth
            const simpleAuth = SimpleAuthValidator.init(context);
            await SimpleAuthValidator.validate(simpleAuth, aad);

            // Validate Frontend
            const frontend = FrontendValidator.init(context);
            await FrontendValidator.validateProvision(frontend);

        }

        // deploy
        await execAsync(
            `teamsfx deploy`,
            {
                cwd: projectPath,
                env: process.env,
                timeout: 0
            }
        );

        {
            // Validate provision
            // Get context
            const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

            // Validate Frontend
            const frontend = FrontendValidator.init(context);
            await FrontendValidator.validateDeploy(frontend);
        }

    });

    after(async () => {
        // clean up
        await cleanUp(appName, projectPath);
    });
});
