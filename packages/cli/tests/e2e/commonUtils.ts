// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

import { AzureConfig, AadManager, ResourceGroupManager } from "fx-api";

import GraphTokenProvider from "../../src/commonlib/graphLogin";

export const execAsync = promisify(exec);

const testFolder = path.resolve(os.homedir(), "test-folder");

export function getTestFolder() {
    if (!fs.pathExistsSync(testFolder)) {
        fs.mkdirSync(testFolder);
    }
    return testFolder;
}

export function getUniqueAppName() {
    return "teamsfxE2E" + Date.now().toString() + uuidv4().slice(0, 2);
}

export function getSubscriptionId() {
    return AzureConfig.subscription.id;
}

const envFilePathSuffix = path.join(".fx", "env.default.json");

export async function setSimpleAuthSkuNameToB1(projectPath: string) {
    const envFilePath = path.resolve(projectPath, envFilePathSuffix);
    const context = await fs.readJSON(envFilePath);
    context["fx-resource-simple-auth"]["skuName"] = "B1";
    await fs.writeJSON(envFilePath, context, { spaces: 4 });
}

export async function cleanUpAadApp(
    projectPath: string,
    hasAadPlugin?: boolean,
    hasBotPlugin?: boolean,
    hasApimPlugin?: boolean
) {
    const envFilePath = path.resolve(projectPath, envFilePathSuffix);
    const context = await fs.readJSON(envFilePath);
    const manager = await AadManager.init(GraphTokenProvider);

    const cleanUp = async (objectId?: string) => {
        if (objectId) {
            const result = await manager.deleteAadAppById(objectId);
            if (result) {
                console.log(`[Successfully] clean up the Aad app with id: ${objectId}.`);
            } else {
                console.error(`[Failed] clean up the Aad app with id: ${objectId}.`);
            }
        }
    }

    if (hasAadPlugin) {
        const objectId = context["fx-resource-aad-app-for-teams"].objectId;
        await cleanUp(objectId);
    }
    
    if (hasBotPlugin) {
        const objectId = context["fx-resource-bot"].objectId;
        await cleanUp(objectId);
    }
    
    if (hasApimPlugin) {
        const objectId = context["fx-resource-apim"].apimClientAADObjectId;
        await cleanUp(objectId);
    }
}

export async function cleanUpResourceGroup(appName: string) {
    const manager = await ResourceGroupManager.init();
    if (appName) {
        try {
            await manager.deleteResourceGroup(`${appName}-rg`);
            console.log(`[Successfully] clean up the Azure resource group with name: ${appName}-rg.`);
        } catch (e) {
            console.error(`[Faild] clean up the Azure resource group with name: ${appName}-rg.`);
            console.error(e);
        }
    }
}

export async function cleanUpLocalProject(projectPath: string) {
    await fs.remove(projectPath);
    console.log(`[Successfully] clean up the local folder: ${projectPath}.`);
}

export async function cleanUp(
    appName: string,
    projectPath: string,
    hasAadPlugin: boolean = true,
    hasBotPlugin: boolean = false,
    hasApimPlugin: boolean = false
) {
    // delete aad app
    await cleanUpAadApp(projectPath, hasAadPlugin, hasBotPlugin, hasApimPlugin);

    // remove resouce group
    await cleanUpResourceGroup(appName);

    // remove project
    await cleanUpLocalProject(projectPath);
}
