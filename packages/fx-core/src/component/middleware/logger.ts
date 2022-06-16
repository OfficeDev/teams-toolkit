// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { Colors, LogLevel, LogProvider } from "@microsoft/teamsfx-api";
import { ActionContext } from "./types";

export function LoggerMW(loggerCreater: new (logger: LogProvider) => LogProvider): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const actionContext = ctx.arguments[0] as ActionContext;
    actionContext.logger = new loggerCreater(actionContext.logProvider);
    await next();
  };
}

export class ActionLogger implements LogProvider {
  logger: LogProvider;
  formatter: (message: string) => string;
  constructor(formatter: (message: string) => string, logger: LogProvider) {
    this.logger = logger;
    this.formatter = formatter;
  }

  log(logLevel: LogLevel, message: string): Promise<boolean> {
    return this.logger.log(logLevel, this.formatter(message));
  }
  trace(message: string): Promise<boolean> {
    return this.logger.trace(this.formatter(message));
  }
  debug(message: string): Promise<boolean> {
    return this.logger.debug(this.formatter(message));
  }
  info(message: Array<{ content: string; color: Colors }>): Promise<boolean>;
  info(message: string): Promise<boolean>;
  info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    if (message instanceof Array) {
      if (message.length > 0) {
        message[0].content = this.formatter(message[0].content);
      }
      return this.logger.info(message);
    } else {
      return this.logger.info(this.formatter(message));
    }
  }
  warning(message: string): Promise<boolean> {
    return this.logger.warning(this.formatter(message));
  }
  error(message: string): Promise<boolean> {
    return this.logger.error(this.formatter(message));
  }
  fatal(message: string): Promise<boolean> {
    return this.logger.fatal(this.formatter(message));
  }
}
