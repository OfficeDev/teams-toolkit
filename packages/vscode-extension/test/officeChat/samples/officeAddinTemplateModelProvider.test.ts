import { expect } from "chai";
import {
  OfficeTemplateModelPorvider,
  WXPAppName,
} from "../../../src/officeChat/common/samples/officeTemplateModelPorvider";

describe("OfficeTemplateModelPorvider", () => {
  let provider: OfficeTemplateModelPorvider;

  beforeEach(() => {
    provider = OfficeTemplateModelPorvider.getInstance();
  });

  it("should return BM25Model", async () => {
    const bm25ModelWord = await provider.getBM25Model("Word");
    expect(bm25ModelWord).to.exist;

    const bm25ModelExcel = await provider.getBM25Model("Excel");
    expect(bm25ModelExcel).to.exist;

    const bm25ModelPowerPoint = await provider.getBM25Model("PowerPoint");
    expect(bm25ModelPowerPoint).to.exist;

    const bm25ModelFake = await provider.getBM25Model("Fake" as WXPAppName);
    expect(bm25ModelFake).to.not.exist;

    const bm25ModelWordCached = await provider.getBM25Model("Word");
    expect(bm25ModelWordCached).to.equal(bm25ModelWord);
  });
});
