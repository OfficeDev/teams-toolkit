import { IDepsLogger } from "../../../../src/debug/depsChecker/checker";

export class TestLogger implements IDepsLogger {
    trace(message: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    debug(message: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    info(message: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    warning(message: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    error(message: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    fatal(message: string): Promise<boolean> {
        return Promise.resolve(true);
    }
}