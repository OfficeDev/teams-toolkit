import { FxError, returnSystemError, returnUserError, SystemError, UserError } from "../src/error";
import * as chai from "chai";

const myName = "name1";
const myMessage = "message1";
const mySource = "source1";
const myHelpLink = "helplink1";
const myInnerError = "innerError1";
const myIssueLink = "issuelink";
const myStack = "stack1";

describe("error", function () {
    describe("userError", function () {
        it("happy path", () => {
            const temp = new UserError(myName, myMessage, mySource);
            chai.assert.equal(temp.name, myName);
            chai.assert.equal(temp.message, myMessage);
            chai.assert.equal(temp.source, mySource);
        }),
            it("happy path with more info", () => {
                const temp = new UserError(myName, myMessage, mySource, myStack, myHelpLink, myInnerError);
                chai.assert.equal(temp.name, myName);
                chai.assert.equal(temp.message, myMessage);
                chai.assert.equal(temp.source, mySource);
                chai.assert.equal(temp.stack, myStack);
                chai.assert.equal(temp.helpLink, myHelpLink);
                chai.assert.equal(temp.innerError, myInnerError);
            });
    });

    describe("returnUserError", function () {
        it("happy path", () => {
            const temp = returnUserError(new Error(myMessage), mySource, myName);
            chai.assert.equal(temp.name, myName);
            chai.assert.equal(temp.message, myMessage);
            chai.assert.equal(temp.source, mySource);
        }),
            it("happy path with more info", () => {
                const temp = returnUserError(new Error(myMessage), mySource, myName, myHelpLink, myInnerError);
                chai.assert.equal(temp.name, myName);
                chai.assert.equal(temp.message, myMessage);
                chai.assert.equal(temp.source, mySource);
                chai.assert.equal(temp.helpLink, myHelpLink);
                chai.assert.equal(temp.innerError, myInnerError);
            });
    });

    describe("systemError", function () {
        it("happy path", () => {
            const temp = new SystemError(myName, myMessage, mySource);
            chai.assert.equal(temp.name, myName);
            chai.assert.equal(temp.message, myMessage);
            chai.assert.equal(temp.source, mySource);
        }),
            it("happy path with more info", () => {
                const temp = new SystemError(myName, myMessage, mySource, myStack, myIssueLink, myInnerError);
                chai.assert.equal(temp.name, myName);
                chai.assert.equal(temp.message, myMessage);
                chai.assert.equal(temp.source, mySource);
                chai.assert.equal(temp.stack, myStack);
                chai.assert.equal(temp.issueLink, myIssueLink);
                chai.assert.equal(temp.innerError, myInnerError);
            });
    });

    describe("returnSystemError", function () {
        it("happy path", () => {
            const temp = returnSystemError(new Error(myMessage), mySource, myName);
            chai.assert.equal(temp.name, myName);
            chai.assert.equal(temp.message, myMessage);
            chai.assert.equal(temp.source, mySource);
        }),
            it("happy path with more info", () => {
                const temp = returnSystemError(new Error(myMessage), mySource, myName, myIssueLink, myInnerError);
                chai.assert.equal(temp.name, myName);
                chai.assert.equal(temp.message, myMessage);
                chai.assert.equal(temp.source, mySource);
                chai.assert.equal(temp.issueLink, myIssueLink);
                chai.assert.equal(temp.innerError, myInnerError);
            });
    });

    describe("error type", function () {
        it("happy path", () => {
            const userFxError: FxError = new UserError(myName, myMessage, mySource) as FxError;
            const userError: UserError = new UserError(myName, myMessage, mySource);
            const systemFxError: FxError = new SystemError(myName, myMessage, mySource) as FxError;
            const systemError: SystemError = new SystemError(myName, myMessage, mySource);

            chai.assert.isTrue(userFxError instanceof UserError);
            chai.assert.isFalse(userFxError instanceof SystemError);
            chai.assert.isTrue(userError instanceof UserError);
            chai.assert.isFalse(userError instanceof SystemError);
            chai.assert.isTrue(systemFxError instanceof SystemError);
            chai.assert.isFalse(systemFxError instanceof UserError);
            chai.assert.isTrue(systemError instanceof SystemError);
            chai.assert.isFalse(systemError instanceof UserError);
        });
    });
});
