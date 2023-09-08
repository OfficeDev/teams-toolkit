// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Ajv, { ValidateFunction } from "ajv";
import fs from "fs-extra";
import path from "path";
import { getResourceFolder } from "../../folder";
import { isTestToolEnabled } from "../../common/featureFlags";

type Version = string;
const supportedVersions = ["1.0.0", "1.1.0", "v1.2", ...(isTestToolEnabled() ? ["v1.3"] : [])];

export class Validator {
  impl: Map<Version, { validator: ValidateFunction }>;

  constructor() {
    this.impl = new Map();
    for (const version of supportedVersions) {
      this.initVersion(version);
    }
  }

  private initVersion(version: string) {
    const ajv = new Ajv({ allowUnionTypes: true });
    ajv.addKeyword("deprecationMessage");
    const schemaPath = path.join(getResourceFolder(), "yaml-schema", version, "yaml.schema.json");
    const schema = fs.readJSONSync(schemaPath);

    this.impl.set(version, {
      validator: ajv.compile(schema),
    });
  }

  isVersionSupported(version: string): boolean {
    return this.supportedVersions().includes(version);
  }

  supportedVersions(): string[] {
    return supportedVersions;
  }

  private latestSupportedVersion(): string {
    return supportedVersions[supportedVersions.length - 1];
  }

  validate(obj: Record<string, unknown>, version?: string): boolean {
    const impl = this.impl.get(version ?? this.latestSupportedVersion());
    if (!impl) {
      return false;
    }
    return !!impl.validator(obj);
  }
}
