import { expect } from "chai";
import { formatEndpoint } from "../../../../../src/component/resource/azureSql/utils/common";

describe("util for azure sql", () => {
  describe("formatEndpoint", () => {
    it("succeed", () => {
      const endPoint = "mockEndPoin-t@@1";

      const res = formatEndpoint(endPoint);
      expect(res).equal("mockendpoin-t1");
    });

    it("start with dash and succeed", () => {
      const endPoint = "-mockEndPoin-t@@1";

      const res = formatEndpoint(endPoint);
      expect(res).equal("mockendpoin-t1");
    });
  });
});
