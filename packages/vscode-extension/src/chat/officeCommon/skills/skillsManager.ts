// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OfficeAddinChatCommand } from "../../consts";
import { Explainer } from "./codeExplainer";
import { CodeGenerator } from "./codeGenerator";
import { ISkill } from "./iSkill"; // Replace this import statement
import { Printer } from "./printer";

export class SkillsManager {
  private static instance: SkillsManager;
  private codeGenerator: ISkill;
  private codeExplainer: ISkill;
  private printer: ISkill;

  private constructor() {
    // Private constructor to prevent direct instantiation
    this.codeGenerator = new CodeGenerator();
    this.printer = new Printer();
    this.codeExplainer = new Explainer();
  }

  public static getInstance(): SkillsManager {
    if (!SkillsManager.instance) {
      SkillsManager.instance = new SkillsManager();
    }
    return SkillsManager.instance;
  }

  public getCapableSkills(capability: OfficeAddinChatCommand): ISkill[] {
    const capableSkills: ISkill[] = [];
    switch (capability) {
      case OfficeAddinChatCommand.GenerateCode:
        capableSkills.push(this.codeGenerator);
        capableSkills.push(this.codeExplainer);
        capableSkills.push(this.printer);
        break;
      default:
        break;
    }

    return capableSkills;
  }
}
