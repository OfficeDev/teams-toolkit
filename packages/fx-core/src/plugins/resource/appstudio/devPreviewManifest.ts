import { Inputs, DevPreviewManifest } from "@microsoft/teamsfx-api";
import { QuestionName } from "../officeaddin/questions";

export function createDevPreviewManifest(inputs?: Inputs): DevPreviewManifest | undefined {
  if (!inputs) {
    return undefined;
  }
  const host = inputs[QuestionName.OfficeHostQuestion];
  const lang = inputs[QuestionName.AddinLanguageQuestion];
  const template = inputs[QuestionName.AddinTemplateSelectQuestion];
  const addinName = inputs[QuestionName.AddinNameQuestion];
  // change the office add-in fields in manifest accordingly
  const manifest = new DevPreviewManifest();
  return manifest;
}
