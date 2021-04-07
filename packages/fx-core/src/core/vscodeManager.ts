// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import { err, FxError, ok, Result, returnSystemError, VsCode } from "fx-api";
import * as path from "path";

export class VscodeManager implements VsCode {
    public static getInstance(): VscodeManager {
        if (!VscodeManager.instance) {
            VscodeManager.instance = new VscodeManager();
        }
        return VscodeManager.instance;
    }
    private static instance: VscodeManager;
    private workspace: string;

    private constructor() {
        this.workspace = "";
    }

    public setWorkspace(workspace: string): Result<null, FxError> {
        this.workspace = workspace;
        return ok(null);
    }

    public async addConfigurations(configurations: any): Promise<Result<null, FxError>> {
        return await this.appendDevSettings("launch.json", "configurations", configurations);
    }

    public async addTasks(tasks: any): Promise<Result<null, FxError>> {
        return await this.appendDevSettings("tasks.json", "tasks", tasks);
    }

    public async addInputs(inputs: any): Promise<Result<null, FxError>> {
        return await this.appendDevSettings("tasks.json", "inputs", inputs);
    }

    public async addSettings(settings: any): Promise<Result<null, FxError>> {
        if (!this.workspace) {
            return err(
                returnSystemError(new Error(`Failed to add settings due to empty workspace directory`), "Core", "name"),
            );
        }
        const settingsPath = path.join(this.workspace, ".vscode/settings.json");
        const settingsJson = (await fs.pathExists(settingsPath)) ? await fs.readJSON(settingsPath) : {};
        await fs.ensureFile(settingsPath);

        for (const [setting, value] of settings) {
            settingsJson[setting] = value;
        }
        await fs.writeJson(settingsPath, settingsJson);

        return ok(null);
    }

    public async addRecommendations(task: any): Promise<Result<null, FxError>> {
        return ok(null);
    }

    private async appendDevSettings(devFile: string, field: string, settings: any): Promise<Result<null, FxError>> {
        if (!this.workspace) {
            return err(
                returnSystemError(
                    new Error(`failed to add ${field} to ${devFile} due to empty workspace directory`),
                    "Core",
                    "name",
                ),
            );
        }
        const filePath = path.join(this.workspace, ".vscode/", devFile);
        const devJson = (await fs.pathExists(filePath)) ? await fs.readJSON(filePath) : {};
        await fs.ensureFile(filePath);
        if (!devJson[field]) {
            devJson[field] = [];
        }

        for (const setting of settings) {
            devJson[field].push(setting);
        }
        await fs.writeJson(filePath, devJson);

        return ok(null);
    }
}
