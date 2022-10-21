import { Inputs, DevPreviewManifest } from "@microsoft/teamsfx-api";
import { QuestionName } from "../officeaddin/questions";
import { OFFICE_ADDIN_EXTENSIONS_LOCAL_DEBUG } from "./constants";

export function createDevPreviewManifest(inputs?: Inputs): DevPreviewManifest | undefined {
  if (!inputs) {
    return undefined;
  }
  const host = inputs[QuestionName.OfficeHostQuestion];
  // const lang = inputs[QuestionName.AddinLanguageQuestion];
  // const template = inputs[QuestionName.AddinTemplateSelectQuestion];
  // const addinName = inputs[QuestionName.AddinNameQuestion];
  // change the office add-in fields in manifest accordingly
  const manifest = new DevPreviewManifest();
  Object.assign(manifest.extensions as [], OFFICE_ADDIN_EXTENSIONS_LOCAL_DEBUG);
  manifest.extensions?.[0].requirements?.scopes?.push(getScope(host));
  manifest.extensions?.[0].ribbons?.[0].contexts?.push(getContext());

  return manifest;
}

// TODO: update to get different contexts when support for them is implemented
function getContext(): "mailRead" {
  return "mailRead";
}

// TODO: update to handle different hosts when support for them is implemented
type Scopes = "mail"; // | "document" | "notebook" | "presentation" | "project" | "workbook"
function getScope(host: string): Scopes {
  let scope: Scopes = "mail";
  switch (host.toLowerCase()) {
    // case "word":
    //   scope = "document";
    case "outlook":
      scope = "mail";
    // case "onenote":
    //   scope = "notebook";
    // case "powerpoint":
    //   scope = "presentation";
    // case "project":
    //   scope = "project";
    // case "excel":
    //   scope = "workbook";
  }
  return scope;
}
