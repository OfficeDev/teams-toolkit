// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { listAllTenants } from "@microsoft/teamsfx-core/build/common/tools";
import { ExtTelemetry } from "../../telemetry/extTelemetry";
import { AccountType, TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { getTriggerFromProperty } from "../../utils/telemetryUtils";
import M365TokenInstance from "../../commonlib/m365Login";
import azureAccountManager from "../../commonlib/azureLogin";
import { AzureScopes, isUserCancelError } from "@microsoft/teamsfx-core";
import { FxError, SingleSelectConfig, SystemError } from "@microsoft/teamsfx-api";
import { localize } from "../../utils/localizeUtils";
import { VS_CODE_UI } from "../../qm/vsc_ui";
import { ExtensionSource } from "../../error/error";
import { showError } from "../../error/common";

export async function onSwitchM365Tenant(...args: unknown[]): Promise<void> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SwitchTenantStart, {
    [TelemetryProperty.AccountType]: AccountType.M365,
    ...getTriggerFromProperty(args),
  });

  let error: FxError | undefined = undefined;
  const tokenRes = await M365TokenInstance.getAccessToken({
    scopes: AzureScopes,
  });
  if (tokenRes.isOk() && tokenRes.value) {
    const tenants = await listAllTenants(tokenRes.value);
    if (tenants.length > 0) {
      const config: SingleSelectConfig = {
        name: "SwitchTenant",
        title: localize("teamstoolkit.handlers.switchtenant.quickpick.title"),
        options: tenants.map((tenant: any) => {
          return {
            id: tenant.tenantId,
            label: tenant.displayName,
            description: tenant.defaultDomain,
          };
        }),
      };
      const result = await VS_CODE_UI.selectOption(config);
      if (result.isOk()) {
        // TODO: set tenant
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SwitchTenant, {
          [TelemetryProperty.AccountType]: AccountType.M365,
          ...getTriggerFromProperty(args),
        });
        return;
      } else {
        error = result.error;
      }
    }
  }
  if (error == undefined) {
    error = new SystemError(
      ExtensionSource,
      "SwitchTenantFailed",
      localize("teamstoolkit.handlers.switchtenant.error")
    );
  }

  if (!isUserCancelError(error)) {
    void showError(error);
  }
  ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.SwitchTenant, error, {
    [TelemetryProperty.AccountType]: AccountType.M365,
    ...getTriggerFromProperty(args),
  });
}

export async function onSwitchAzureTenant(...args: unknown[]): Promise<void> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SwitchTenantStart, {
    [TelemetryProperty.AccountType]: AccountType.Azure,
    ...getTriggerFromProperty(args),
  });

  let tokenCredential = undefined;
  try {
    tokenCredential = await azureAccountManager.getIdentityCredentialAsync(false);
  } catch (error) {
    if (!isUserCancelError(error)) {
      void showError(error);
    }

    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.SwitchTenant, error, {
      [TelemetryProperty.AccountType]: AccountType.Azure,
      ...getTriggerFromProperty(args),
    });
    return;
  }

  let error: FxError | undefined = undefined;
  const token = tokenCredential ? await tokenCredential.getToken(AzureScopes) : undefined;
  if (token && token.token) {
    const tenants = await listAllTenants(token.token);
    if (tenants.length > 0) {
      const config: SingleSelectConfig = {
        name: "SwitchTenant",
        title: localize("teamstoolkit.handlers.switchtenant.quickpick.title"),
        options: tenants.map((tenant: any) => {
          return {
            id: tenant.tenantId,
            label: tenant.displayName,
            description: tenant.defaultDomain,
          };
        }),
      };
      const result = await VS_CODE_UI.selectOption(config);
      if (result.isOk()) {
        // TODO: set tenant
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SwitchTenant, {
          [TelemetryProperty.AccountType]: AccountType.Azure,
          ...getTriggerFromProperty(args),
        });
        return;
      } else {
        error = result.error;
      }
    }
  }

  if (error == undefined) {
    error = new SystemError(
      ExtensionSource,
      "SwitchTenantFailed",
      localize("teamstoolkit.handlers.switchtenant.error")
    );
  }

  if (!isUserCancelError(error)) {
    void showError(error);
  }
  ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.SwitchTenant, error, {
    [TelemetryProperty.AccountType]: AccountType.Azure,
    ...getTriggerFromProperty(args),
  });
}
