// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, err, FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";
import axios, { AxiosError } from "axios";
import { CoreSource } from "../../core/error";

type TunnelingServiceError = AxiosError;

const MicrosoftTunnelingOnboardingURL = "https://aka.ms/tunnels-signup";

export function isTunnelingServiceError(error: unknown): error is TunnelingServiceError {
  return axios.isAxiosError(error);
}

export function isTunnelingServiceForbidden(error: TunnelingServiceError): boolean {
  return error.response?.status === 403;
}

export function isTunnelingServiceNeedOnboarding(error: TunnelingServiceError): boolean {
  return isTunnelingServiceForbidden(error);
}

export class MicrosoftTunnelingTimeoutError extends UserError {
  constructor() {
    super({
      source: CoreSource,
      name: MicrosoftTunnelingTimeoutError.name,
      message: "Time out to wait for tunnel up, please retry.",
      helpLink: MicrosoftTunnelingOnboardingURL,
    });
  }
}

export class MicrosoftTunnelingNeedOnboardingError extends UserError {
  constructor(innerError: Error) {
    super({
      source: CoreSource,
      name: MicrosoftTunnelingNeedOnboardingError.name,
      error: innerError,
      message:
        "Microsoft tunneling service is in private preview. You need to on-board before you can use it.",
      helpLink: MicrosoftTunnelingOnboardingURL,
    });
  }
}

export class MicrosoftTunnelingServiceError extends SystemError {
  constructor(innerError: Error) {
    super({
      source: CoreSource,
      name: MicrosoftTunnelingServiceError.name,
      error: innerError,
      message: "Failed to call Microsoft tunneling service API",
    });
  }
}

export class MicrosoftTunnelingError extends SystemError {
  constructor(innerError: Error) {
    super({
      source: CoreSource,
      name: MicrosoftTunnelingError.name,
      error: innerError,
      message: "Failed to call Microsoft tunneling service API",
    });
  }
}

/**
 * Since the tunneling SDK throws any error it encounter when doing an action (e.g. createTunnel()),
 * it is hard to distinguish login error from other FxError or Error only by checking error class type.
 * (it is possible but requires checking many types: LoginCodeFlowError, CheckIsOnlineError, etc.)
 * So this class is a wrapper for errors returned from M365 login (e.g. M365Login.getAccessToken()).
 */
export class MicrosoftTunnelingLoginError extends UserError {
  constructor(innerFxError: FxError) {
    super(innerFxError.source, MicrosoftTunnelingLoginError.name, innerFxError.message);
    this.innerError = innerFxError;
    this.helpLink = innerFxError instanceof UserError ? innerFxError.helpLink : undefined;
    this.stack = innerFxError.stack;
  }
}

export async function runWithMicrosoftTunnelingServiceErrorHandling<T>(
  action: () => Promise<T>
): Promise<Result<T, FxError>> {
  try {
    return ok(await action());
  } catch (error) {
    if (isTunnelingServiceError(error)) {
      if (isTunnelingServiceNeedOnboarding(error)) {
        return err(new MicrosoftTunnelingNeedOnboardingError(error));
      } else {
        return err(new MicrosoftTunnelingServiceError(error));
      }
    } else if (error instanceof UserError || error instanceof SystemError) {
      return err(error);
    } else {
      return err(
        new MicrosoftTunnelingError(
          error instanceof Error ? error : new Error(JSON.stringify(error))
        )
      );
    }
  }
}
