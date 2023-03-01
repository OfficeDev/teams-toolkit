// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan He <ruhe@microsoft.com>
 */
import { BotRegistration } from "./botRegistration";
import { LocalBotRegistration } from "./localBotRegistration";
import { RemoteBotRegistration } from "./remoteBotRegistration";

export enum BotRegistrationKind {
  Local = "Local",
  Remote = "Remote",
}

export class BotRegistrationFactory {
  static create(regKind: BotRegistrationKind): BotRegistration {
    switch (regKind) {
      case BotRegistrationKind.Local: {
        return new LocalBotRegistration();
      }
      case BotRegistrationKind.Remote: {
        return new RemoteBotRegistration();
      }
    }
  }
}
