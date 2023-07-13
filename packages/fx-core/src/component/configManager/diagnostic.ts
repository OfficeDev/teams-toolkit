// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */
import { YAMLValidation } from "yaml-language-server/lib/umd/languageservice/services/yamlValidation";
import { YAMLSchemaService } from "yaml-language-server/lib/umd/languageservice/services/yamlSchemaService";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Telemetry } from "yaml-language-server/lib/umd/languageserver/telemetry";

// A telemetry class that does nothing, used to initialize YAMLValidation below.
class DummyTelemetry {
  send(): void {}
  sendError(): void {}
  sendTrack(): void {}
}

type Path = string;
type Content = string;
type Version = number;
export class YAMLDiagnostics {
  private validator: YAMLValidation;
  private cache: Map<Path, [Content, Version]>;

  constructor(private readonly schemaPath: string, private readonly schemaString: string) {
    const schemaService = new YAMLSchemaService(async () => {
      return this.schemaString;
    });
    schemaService.registerExternalSchema(schemaPath, ["*teamsapp.*yml"]);
    this.validator = new YAMLValidation(
      schemaService,
      new DummyTelemetry() as unknown as Telemetry
    );
    this.validator.configure({
      validate: true,
      yamlVersion: "1.2",
      disableAdditionalProperties: true,
      customTags: [],
    });
    this.cache = new Map();
  }

  public async doValidation(yamlPath: string, yamlString: string): Promise<string> {
    const [cachedYamlString, cachedVersion] = this.cache.get(yamlPath) ?? [yamlString, 0];
    const version = yamlString === cachedYamlString ? cachedVersion : cachedVersion + 1;
    // Need to bump version to work around the internal cache of yaml language server
    const textDocument = TextDocument.create(`file://${yamlPath}`, "yaml", version, yamlString);
    this.cache.set(yamlPath, [yamlString, version]);

    const diagnostics = await this.validator.doValidation(textDocument, false);
    return diagnostics
      .map((diag) => `[line ${diag.range.start.line + 1}] ${diag.message}`)
      .join(" ");
  }
}
