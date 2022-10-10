// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { validate as uuidValidate } from "uuid";
import { UserError } from "@microsoft/teamsfx-api";
import { Plugins } from "../constants";
import { ConfigErrorMessages } from "../errors";

export enum Formats {
  Endpoint = " endpoint",
  Domain = "domain",
  UUID = "uuid",
}

export function format(value: string | undefined, type: Formats): string | undefined {
  if (!value) {
    return undefined;
  }

  if (type == Formats.Endpoint) {
    return formatEndpoint(value as string);
  } else if (type == Formats.Domain) {
    return formatDomain(value as string);
  } else if (type == Formats.UUID) {
    return formatUUID(value as string);
  }

  return undefined;
}

function formatEndpoint(endpoint: string): string {
  endpoint = endpoint.replace(/\s/g, "");

  try {
    const url = new URL(endpoint);
    endpoint = url.href;
    if (endpoint.endsWith("/")) {
      endpoint = endpoint.slice(0, -1);
    }
    return endpoint;
  } catch {
    const msg = ConfigErrorMessages.FormatError(Formats.Endpoint, endpoint);
    throw new UserError(Plugins.pluginNameShort, "FormatError", msg[0], msg[1]);
  }
}

function formatDomain(domain: string): string {
  domain = domain.replace(/\s/g, "");

  try {
    const url = new URL("https://" + domain);
    domain = url.host;
    return domain;
  } catch {
    const msg = ConfigErrorMessages.FormatError(Formats.Domain, domain);
    throw new UserError(Plugins.pluginNameShort, "FormatError", msg[0], msg[1]);
  }
}

function formatUUID(uuid: string): string {
  if (uuidValidate(uuid)) {
    return uuid;
  } else {
    const msg = ConfigErrorMessages.FormatError(Formats.UUID, uuid);
    throw new UserError(Plugins.pluginNameShort, "FormatError", msg[0], msg[1]);
  }
}
