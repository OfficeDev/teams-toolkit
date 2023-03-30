import { FxError, Result, TeamsAppManifest } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { MetadataV3 } from "../../common/versionMetadata";
import { TOOLS } from "../../core/globalVars";
import { LifecycleNames, ProjectModel } from "../configManager/interface";
import { yamlParser } from "../configManager/parser";
import { createHash } from "crypto";

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

  parseManifest(manifest: TeamsAppManifest): void {
    const props: { [key: string]: string } = {};
    const prefix = "manifest.";
    props[prefix + "id"] = manifest.id ?? "";
    props[prefix + "version"] = manifest.version ?? "";
    props[prefix + "manifestVersion"] = manifest.manifestVersion ?? "";
    props[prefix + "bots"] = manifest.bots?.map((bot) => bot.botId).toString() ?? "";
    props[prefix + "staticTabs.contentUrl"] =
      manifest.staticTabs
        ?.map((tab) =>
          tab.contentUrl
            ? createHash("sha256").update(tab.contentUrl).digest("base64")
            : "undefined"
        )
        .toString() ?? "";
    props[prefix + "configurableTabs.configurationUrl"] =
      manifest.configurableTabs
        ?.map((tab) =>
          tab.configurationUrl
            ? createHash("sha256").update(tab.configurationUrl).digest("base64")
            : "undefined"
        )
        .toString() ?? "";
    props[prefix + "webApplicationInfo.id"] = manifest.webApplicationInfo?.id ?? "";

    TOOLS.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.MetaData, props);
  }
}

export const metadataUtil = new MetadataUtil();
