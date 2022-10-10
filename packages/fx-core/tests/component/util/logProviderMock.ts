// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, LogProvider } from "@microsoft/teamsfx-api";

export class TestLogProvider implements LogProvider {
  async trace({}: string): Promise<boolean> {
    return true;
  }
  async debug({}: string): Promise<boolean> {
    return true;
  }
  async info({}: string | Array<any>): Promise<boolean> {
    return true;
  }
  async warning({}: string): Promise<boolean> {
    return true;
  }
  async error({}: string): Promise<boolean> {
    return true;
  }
  async fatal({}: string): Promise<boolean> {
    return true;
  }
  async log({}: LogLevel, {}: string): Promise<boolean> {
    return true;
  }
}
