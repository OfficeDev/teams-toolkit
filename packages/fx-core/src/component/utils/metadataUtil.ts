import { FxError, Result } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { MetadataV3 } from "../../common/versionMetadata";
import { TOOLS } from "../../core/globalVars";
import { LifecycleNames, ProjectModel } from "../configManager/interface";
import { yamlParser } from "../configManager/parser";

export class MetadataUtil {
  async parse(path: string, env: string | undefined): Promise<Result<ProjectModel, FxError>> {
    const res = await yamlParser.parse(path);
    const props: { [key: string]: string } = {};
    props[TelemetryProperty.YmlName] = (
      env === "local" ? MetadataV3.localConfigFile : MetadataV3.configFile
    )
      .split(".")
      .join("");
    if (res.isOk()) {
      for (const name of LifecycleNames) {
        const str = res.value[name]?.driverDefs
          .map((def) => def.uses)
          .toString()
          .split("/")
          .join("");
        props[name + ".actions"] = str ?? "";
      }

      TOOLS.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.MetaData, props);
    }

    return res;
  }
}

export const metadataUtil = new MetadataUtil();
