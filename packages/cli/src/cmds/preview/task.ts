import { ChildProcess, spawn, SpawnOptions } from "child_process";

function delay(ms: number) {
    // tslint:disable-next-line no-string-based-set-timeout
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    private task: ChildProcess;
    private stdout: string = "";
    private stderr: string = "";

    constructor(command: string, options: TaskOptions) {
        const spawnOptions: SpawnOptions = {
            shell: true,
            cwd: options.cwd,
            env: options.env,
        };
        this.task = spawn(command, spawnOptions);
        this.task.stdout?.on("data", (data) => {
            // TODO: log
            this.stdout += data;
        });
        this.task.stderr?.on("data", (data) => {
            // TODO: log
            this.stderr += data;
        });
    }

    /**
     * wait for the task to end
     */
    public async wait(): Promise<TaskResult> {
        while (true) {
            if (this.task.exitCode !== null) {
                const result: TaskResult = {
                    success: this.task.exitCode === 0,
                    stdout: this.stdout,
                    stderr: this.stderr,
                    exitCode: this.task.exitCode,
                };
                return result;
            }
            await delay(1000);
        }
    }

    /**
     * wait until stdout of the task matches the pattern or the task ends
     */
    public async waitFor(pattern: RegExp): Promise<TaskResult> {
        while (true) {
            if (this.task.exitCode != null) {
                const result: TaskResult = {
                    success: false,
                    stdout: this.stdout,
                    stderr: this.stderr,
                    exitCode: this.task.exitCode,
                };
                return result;
            }
            const match = pattern.test(this.stdout);
            if (match) {
                const result: TaskResult = {
                    success: true,
                    stdout: this.stdout,
                    stderr: this.stderr,
                    exitCode: null,
                }
                return result;
            }
            await delay(1000);
        }
    }
}
