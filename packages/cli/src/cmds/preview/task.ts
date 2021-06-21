import { ChildProcess, spawn, SpawnOptions } from "child_process";

interface TaskOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv,
}

export interface TaskResult {
    success: boolean;
    stdout: string;
    stderr: string;
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
    public async wait(): Promise<TaskResult> {
        const spawnOptions: SpawnOptions = {
            shell: true,
            cwd: this.options.cwd,
            env: this.options.env,
        };
        const task = spawn(this.command, spawnOptions);
        let stdout = "", stderr = "";
        return new Promise((resolve, reject) => {
            task.stdout?.on("data", (data) => {
                // TODO: log
                stdout += data;
            });
            task.stderr?.on("data", (data) => {
                // TODO: log
                stderr += data;
            });
            task.on("exit", () => {
                const result: TaskResult = {
                    success: task.exitCode === 0,
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: task.exitCode,
                };
                resolve(result);
            });
        });
    }

    /**
     * wait until stdout of the task matches the pattern or the task ends
     */
    public async waitFor(pattern: RegExp): Promise<TaskResult> {
        const spawnOptions: SpawnOptions = {
            shell: true,
            cwd: this.options.cwd,
            env: this.options.env,
        };
        const task = spawn(this.command, spawnOptions);
        let stdout = "", stderr = "";
        return new Promise((resolve, reject) => {
            task.stdout?.on("data", (data) => {
                // TODO: log
                stdout += data;
                const match = pattern.test(stdout);
                if (match) {
                    const result: TaskResult = {
                        success: true,
                        stdout: stdout,
                        stderr: stderr,
                        exitCode: null,
                    };
                    resolve(result);
                }
            });
            task.stderr?.on("data", (data) => {
                // TODO: log
                stderr += data;
            });

            task.on("exit", () => {
                const result: TaskResult = {
                    success: false,
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: task.exitCode,
                };
                resolve(result);
            });
        });
    }
}
