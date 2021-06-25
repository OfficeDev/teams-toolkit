// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { spawn, SpawnOptions } from "child_process";
import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";

interface TaskOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv,
}

export interface TaskResult {
    success: boolean;
    stdout: string[];
    stderr: string[];
    exitCode : number | null;
}

export class Task {
    private command: string;
    private options: TaskOptions;

    constructor(command: string, options: TaskOptions) {
        this.command = command;
        this.options = options;
    }

    /**
     * wait for the task to end
     */
    public async wait(startCallback: () => void, stopCallback: (result: TaskResult) => FxError | null): Promise<Result<TaskResult, FxError>> {
        startCallback();
        const spawnOptions: SpawnOptions = {
            shell: true,
            cwd: this.options.cwd,
            env: this.options.env,
        };
        const task = spawn(this.command, spawnOptions);
        const stdout: string[] = [];
        const stderr: string[] = [];
        return new Promise((resolve, reject) => {
            task.stdout?.on("data", (data) => {
                // TODO: log
                stdout.push(data.toString());
            });
            task.stderr?.on("data", (data) => {
                // TODO: log
                stderr.push(data.toString());
            });
            task.on("exit", () => {
                const result: TaskResult = {
                    success: task.exitCode === 0,
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: task.exitCode,
                };
                const error = stopCallback(result);
                if (error) {
                    resolve(err(error));
                } else {
                    resolve(ok(result));
                }
            });
        });
    }

    /**
     * wait until stdout of the task matches the pattern or the task ends
     */
    public async waitFor(pattern: RegExp, startCallback: () => void, stopCallback: (result: TaskResult) => FxError | null): Promise<Result<TaskResult, FxError>> {
        startCallback();
        const spawnOptions: SpawnOptions = {
            shell: true,
            cwd: this.options.cwd,
            env: this.options.env,
        };
        const task = spawn(this.command, spawnOptions);
        const stdout: string[] = [];
        const stderr: string[] = [];
        return new Promise((resolve, reject) => {
            task.stdout?.on("data", (data) => {
                // TODO: log
                stdout.push(data.toString());
                const match = pattern.test(data.toString());
                if (match) {
                    const result: TaskResult = {
                        success: true,
                        stdout: stdout,
                        stderr: stderr,
                        exitCode: null,
                    };
                    const error = stopCallback(result);
                    if (error){
                        resolve(err(error));
                    } else {
                        resolve(ok(result));
                    }
                }
            });
            task.stderr?.on("data", (data) => {
                // TODO: log
                stderr.push(data.toString());
            });

            task.on("exit", () => {
                const result: TaskResult = {
                    success: false,
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: task.exitCode,
                };
                const error = stopCallback(result);
                if (error){
                    resolve(err(error));
                } else {
                    resolve(ok(result));
                }
            });
        });
    }
}
