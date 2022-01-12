import "mocha";
import chai from "chai";
import { ProgrammingLanguageQuestion } from "../../src/core/question";
import { Inputs, Platform } from "@microsoft/teamsfx-api";

describe("Programming Language Questions", async () => {
  it("should return csharp on VS platform", async () => {
    chai.assert.isTrue(ProgrammingLanguageQuestion.dynamicOptions !== undefined);
    if (ProgrammingLanguageQuestion.dynamicOptions === undefined) {
      throw "unreachable";
    }
    const inputs: Inputs = { platform: Platform.VS };
    const questions = await ProgrammingLanguageQuestion.dynamicOptions(inputs);
    chai.assert.isTrue(questions !== undefined);
    chai.assert.isArray(questions);
    chai.assert.lengthOf(questions, 1);
    chai.assert.property(questions[0], "id");
    chai.assert.equal((questions[0] as any).id, "csharp");
  });
});
