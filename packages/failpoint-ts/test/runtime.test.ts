import "mocha";
import { expect } from "chai";
import { evaluate, ENV_VAR_NAME, clearFailpointCache } from "../src/runtime";

describe("failpoint evaluation", () => {
  const someFailpoint = "someFailpoint"

  afterEach(() => {
    process.env[ENV_VAR_NAME] = undefined;
  });

  it("should work for non-negative number", () => {
    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint=0";
    let result = evaluate(someFailpoint);
    expect(result?.kind).equals("number");
    expect(result?.value).equals(0);

    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint=1";
    result = evaluate(someFailpoint);
    expect(result?.kind).equals("number");
    expect(result?.value).equals(1);


    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint=111111";
    result = evaluate(someFailpoint);
    expect(result?.kind).equals("number");
    expect(result?.value).equals(111111);
  });

  it("should work for negative number", () => {
    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint=-1";
    let result = evaluate(someFailpoint);
    expect(result?.kind).equals("number");
    expect(result?.value).equals(-1);

    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint=-0";
    result = evaluate(someFailpoint);
    expect(result?.kind).equals("number");
    expect(result?.value).equals(0);
  });

  it("should work for boolean", () => {
    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint=true";
    let result = evaluate(someFailpoint);
    expect(result?.kind).equals("boolean");
    expect(result?.value).equals(true);

    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint=false";
    result = evaluate(someFailpoint);
    expect(result?.kind).equals("boolean");
    expect(result?.value).equals(false);

    clearFailpointCache();
    process.env[ENV_VAR_NAME] = "someFailpoint";
    result = evaluate(someFailpoint);
    expect(result?.kind).equals("boolean");
    expect(result?.value).equals(true);
  });

  it("should work for string", () => {
    clearFailpointCache();
    process.env[ENV_VAR_NAME] = `someFailpoint="-1"`;
    let result = evaluate(someFailpoint);
    expect(result?.kind).equals("string");
    expect(result?.value).equals("-1");

    clearFailpointCache();
    process.env[ENV_VAR_NAME] = `someFailpoint="true"`;
    result = evaluate(someFailpoint);
    expect(result?.kind).equals("string");
    expect(result?.value).equals("true");
  })

  it("should return undefined if failpoint is not defined", () => {
    clearFailpointCache();
    process.env[ENV_VAR_NAME] = undefined;
    const result = evaluate(someFailpoint);
    expect(result).to.be.undefined;
  });

  it("should throw on syntax error", () => {
    clearFailpointCache();
    process.env[ENV_VAR_NAME] = `someFailpoint=aabdc`;
    expect(() => evaluate(someFailpoint)).to.throw();

    clearFailpointCache();
    process.env[ENV_VAR_NAME] = `someFailpoint=`;
    expect(() => evaluate(someFailpoint)).to.throw();


    clearFailpointCache();
    process.env[ENV_VAR_NAME] = `someFailpoint=0aa`;
    expect(() => evaluate(someFailpoint)).to.throw();
  });

  it("should work for mulitple failpoints", () => {
    clearFailpointCache();
    process.env[ENV_VAR_NAME] = `a="aabdc";b=-1111;c=true;d=-aaa`;

    let result = evaluate("a");
    expect(result?.kind).equals("string");
    expect(result?.value).equals("aabdc");

    result = evaluate("b");
    expect(result?.kind).equals("number");
    expect(result?.value).equals(-1111);
    
    expect(() => evaluate("d")).to.throw();
  });
});