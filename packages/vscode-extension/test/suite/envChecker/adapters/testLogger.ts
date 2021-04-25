import { IDepsLogger } from "../../../../src/debug/depsChecker/checker";
import { LogLevel } from "fx-api";

export class TestLogger implements IDepsLogger {
    public debug(message: string): Promise<boolean> {
        this.writeLog(LogLevel.Debug, message);
        return Promise.resolve(true);
    }

    public info(message: string): Promise<boolean> {
        this.writeLog(LogLevel.Info, message);
        return Promise.resolve(true);
    }

    public warning(message: string): Promise<boolean> {
        this.writeLog(LogLevel.Warning, message);
        return Promise.resolve(true);
    }

    public error(message: string): Promise<boolean> {
        this.writeLog(LogLevel.Error, message);
        return Promise.resolve(true);
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