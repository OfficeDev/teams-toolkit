// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OptionItem } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { Constants } from "./constants";
import { Utils } from "./utils";

export class PackageSelectOptionsHelper {
  private static options: OptionItem[] = [];

  public static async loadOptions(): Promise<void> {
    const versions = await Promise.all([
      Utils.findGloballyInstalledVersion(undefined, Constants.GeneratorPackageName, 5, false),
      Utils.findLatestVersion(undefined, Constants.GeneratorPackageName, 5),
    ]);

    PackageSelectOptionsHelper.options = [
      {
        id: "installLocally",
        label:
          versions[1] !== undefined
            ? getLocalizedString(
                "plugins.spfx.questions.packageSelect.installLocally.withVersion.label",
                "v" + versions[1]
              )
            : getLocalizedString(
                "plugins.spfx.questions.packageSelect.installLocally.noVersion.label"
              ),
      },
      {
        id: "globalPackage",
        label:
          versions[0] !== undefined
            ? getLocalizedString(
                "plugins.spfx.questions.packageSelect.useGlobalPackage.withVersion.label",
                "v" + versions[0]
              )
            : getLocalizedString(
                "plugins.spfx.questions.packageSelect.useGlobalPackage.noVersion.label"
              ),
        detail: getLocalizedString(
          "plugins.spfx.questions.packageSelect.useGlobalPackage.detail",
          Constants.RecommendedLowestSpfxVersion
        ),
      },
    ];
  }

  public static getOptions(): OptionItem[] {
    return PackageSelectOptionsHelper.options;
  }
}
