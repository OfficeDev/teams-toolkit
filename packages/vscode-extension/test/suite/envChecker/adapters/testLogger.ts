import * as path from "path";

import { IDepsLogger } from "../../../../src/debug/depsChecker/checker";
import { LogLevel } from "fx-api";

export class TestLogger implements IDepsLogger {
    public async trace(message: string): Promise<boolean> {
        await this.writeLog(LogLevel.Trace, message);
        return true;
    }

    public async debug(message: string): Promise<boolean> {
        await this.writeLog(LogLevel.Debug, message);
        return true;
    }

    public async info(message: string): Promise<boolean> {
        await this.writeLog(LogLevel.Info, message);
        return true;
    }

    public async warning(message: string): Promise<boolean> {
        await this.writeLog(LogLevel.Warning, message);
        return true;
    }

    public async error(message: string): Promise<boolean> {
        await this.writeLog(LogLevel.Error, message);
        return true;
    }

    public async fatal(message: string): Promise<boolean> {
        await this.writeLog(LogLevel.Fatal, message);
        return true;
    }

    private async writeLog(level: LogLevel, message: string): Promise<void> {
        const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
        if (level >= LogLevel.Error) {
            console.error(line);
        } else {
            console.log(line);
        }
    }
}