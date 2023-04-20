/**
 * @author yefuwang@microsoft.com
 */
import { YAMLValidation } from "yaml-language-server/lib/umd/languageservice/services/yamlValidation";
import { YAMLSchemaService } from "yaml-language-server/lib/umd/languageservice/services/yamlSchemaService";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Telemetry } from "yaml-language-server/lib/umd/languageserver/telemetry";
import fse from "fs-extra";
import os from "os";

// A telemetry class that does nothing, used to initialize YAMLValidation below.
class DummyTelemetry {
  send(): void {
    return;
  }
  sendError(): void {
    return;
  }
  sendTrack(): void {
    return;
  }
}

export class YAMLDiagnostics {
  private validator: YAMLValidation;

  constructor(private readonly schema: string) {
    const schemaService = new YAMLSchemaService(async () => {
      return this.schema;
    });
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
  }

  public async doValidation(yamlPath: string): Promise<string> {
    const yamlString = await fse.readFile(yamlPath, "utf8");
    const textDocument = TextDocument.create(`file://${yamlPath}`, "yaml", 1, yamlString);

    const diagnostics = await this.validator.doValidation(textDocument, false);
    return diagnostics
      .map((diag) => `[line ${diag.range.start.line + 1}] ${diag.message}`)
      .join("");
  }
}
