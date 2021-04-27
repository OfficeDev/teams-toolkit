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

export function getAppNamePrefix() {
    return "fxE2E";
}

export function getUniqueAppName() {
    return getAppNamePrefix() + Date.now().toString() + uuidv4().slice(0, 2);
}

export function getSubscriptionId() {
    return AzureConfig.subscription.id;
}

const envFilePathSuffix = path.join(".fx", "env.default.json");

export function getConfigFileName(appName: string): string {
    return path.resolve(testFolder, appName, envFilePathSuffix);
}

const aadPluginName = "fx-resource-aad-app-for-teams";
const simpleAuthPluginName = "fx-resource-simple-auth";
const botPluginName = "fx-resource-bot";
const apimPluginName = "fx-resource-apim";

export async function setSimpleAuthSkuNameToB1(projectPath: string) {
    const envFilePath = path.resolve(projectPath, envFilePathSuffix);
    const context = await fs.readJSON(envFilePath);
    context[simpleAuthPluginName]["skuName"] = "B1";
    return fs.writeJSON(envFilePath, context, { spaces: 4 });
}

export async function setBotSkuNameToB1(projectPath: string) {
    const envFilePath = path.resolve(projectPath, envFilePathSuffix);
    const context = await fs.readJSON(envFilePath);
    context[botPluginName]["skuName"] = "B1";
    return fs.writeJSON(envFilePath, context, { spaces: 4 });
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
    const promises: Promise<boolean>[] = [];

    const clean = async (objectId?: string) => {
        return new Promise<boolean>(async resolve => {
            if (objectId) {
                const result = await manager.deleteAadAppById(objectId);
                if (result) {
                    console.log(`[Successfully] clean up the Aad app with id: ${objectId}.`);
                } else {
                    console.error(`[Failed] clean up the Aad app with id: ${objectId}.`);
                }
                return resolve(result);
            }
            return resolve(false);
        });
    };

    if (hasAadPlugin) {
        const objectId = context[aadPluginName].objectId;
        promises.push(clean(objectId));
    }
    
    if (hasBotPlugin) {
        const objectId = context[botPluginName].objectId;
        promises.push(clean(objectId));
    }
    
    if (hasApimPlugin) {
        const objectId = context[apimPluginName].apimClientAADObjectId;
        promises.push(clean(objectId));
    }

    return Promise.all(promises);
}

export async function cleanUpResourceGroup(appName: string) {
    return new Promise<boolean>(async resolve => {
        const manager = await ResourceGroupManager.init();
        if (appName) {
            const name = `${appName}-rg`;
            if (await manager.hasResourceGroup(name)) {
                const result = await manager.deleteResourceGroup(name);
                if (result) {
                    console.log(`[Successfully] clean up the Azure resource group with name: ${name}.`);
                } else {
                    console.error(`[Faild] clean up the Azure resource group with name: ${name}.`);
                }
                return resolve(result);
            }
        }
        return resolve(false);
    });
}

export async function cleanUpLocalProject(projectPath: string) {
    return new Promise<boolean>(async resolve => {
        try {
            await fs.remove(projectPath);
            console.log(`[Successfully] clean up the local folder: ${projectPath}.`);
            return resolve(true);
        } catch {
            console.log(`[Failed] clean up the local folder: ${projectPath}.`);
            return resolve(false);
        }
    });
}

export async function cleanUp(
    appName: string,
    projectPath: string,
    hasAadPlugin = true,
    hasBotPlugin = false,
    hasApimPlugin = false
) {
    return Promise.all(
        [
            // delete aad app
            cleanUpAadApp(projectPath, hasAadPlugin, hasBotPlugin, hasApimPlugin),
            // remove resouce group
            cleanUpResourceGroup(appName),
            // remove project
            cleanUpLocalProject(projectPath)
        ]
    );
}

export async function cleanUpResourcesCreatedHoursAgo(type: "aad" | "rg", contains: string, hours?: number, retryTimes = 5) {
    if (type === "aad") {
        const aadManager = await AadManager.init(GraphTokenProvider);
        await aadManager.deleteAadApps(contains, hours, retryTimes);
    } else {
        const rgManager = await ResourceGroupManager.init();
        const groups = await rgManager.searchResourceGroups(contains);
        const filteredGroups = hours && hours > 0
            ? groups.filter(group => {
                const name = group.name!;
                const startPos = name.indexOf(contains) + contains.length;
                const createdTime = Number(name.slice(startPos, startPos + 13));
                return Date.now() - createdTime > hours * 3600 * 1000;
            })
            : groups;
        
        const promises = filteredGroups.map(rg => rgManager.deleteResourceGroup(rg.name!, retryTimes));
        const results = await Promise.all(promises);
        results.forEach((result, index) => {
            if (result) {
                console.log(`[Successfully] clean up the Azure resource group with name: ${filteredGroups[index].name}.`);
            } else {
                console.error(`[Faild] clean up the Azure resource group with name: ${filteredGroups[index].name}.`);
            }
        });
        return results;
    }
}
