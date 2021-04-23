import { IDepsLogger } from "./checker";
import { Logger } from "../logger";

class FuncPluginLogger implements IDepsLogger {
  public debug(message: string): Promise<boolean> {
    Logger.debug(message);
    return Promise.resolve(true);
  }
  public info(message: string): Promise<boolean> {
    Logger.info(message);
    return Promise.resolve(true);
  }
  public warning(message: string): Promise<boolean> {
    Logger.warning(message);
    return Promise.resolve(true);
  }
  public error(message: string): Promise<boolean> {
    Logger.error(message);
    return Promise.resolve(true);
  }
}

export const funcPluginLogger = new FuncPluginLogger();
