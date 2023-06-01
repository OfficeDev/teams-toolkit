import { expect } from "chai";
import { getVersion, isFolderEmpty, getSafeCardName, 
  wrapperCard, getCardTitle, getResponseJsonResult, 
  capitalizeFirstLetter, getSchemaRef, 
  componentRefToCardName, truncateString 
} from "../../src/utils";
import path from "path";
import sinon from 'sinon';
import fs from 'fs-extra';

describe('utils tests', () => {
  describe('getVersion', () => {
    it('should return the version number', () => {
      const currentVersion = fs.readJsonSync(__dirname + "/../../package.json").version;
      expect(getVersion()).to.equal(currentVersion);
    });
  });

  describe('isFolderEmpty', () => {
    it('should return true for an empty folder', async () => {
      const folderPath = path.resolve(__dirname, 'empty-folder');
      const readdirStub = sinon.stub(fs, 'readdir').resolves([]);
      expect(await isFolderEmpty(folderPath)).to.be.true;
      readdirStub.restore();
    });

    it('should return false for a non-empty folder', async () => {
      const folderPath = path.resolve(__dirname, 'non-empty-folder');
      const file = new fs.Dirent();
      file.name = "file1";
      const readdirStub = sinon.stub(fs, 'readdir').resolves([file]);
      expect(await isFolderEmpty(folderPath)).to.be.false;
      readdirStub.restore();
    });
  });

  describe('getSafeCardName', () => {
    it('should generate a safe adaptive card name from operationId', () => {
      const api = { operationId: 'getUsers' };
      const url = '/users';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('getUsers');
    });

    it('should generate a safe adaptive card name from operation and url if operationId and summary are not present', () => {
      const api = {};
      const url = '/users';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('getUsers');
    });

    it('should remove special characters from the name', () => {
      const api = { operationId: 'get{User}Details' };
      const url = '/users/{userId}';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('getUserDetails');
    });

    it('should add an underscore to the beginning of the name if it starts with a number', () => {
      const api = { operationId: '123getUserDetails' };
      const url = '/users/{userId}';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('_123getUserDetails');
    });
  });

  describe('wrapperCard', () => {
    it('should return an AdaptiveCard object with the given body and version 1.5', () => {
      const body = [{ type: 'TextBlock', text: 'Hello World' }];
      const result = wrapperCard(body, 'test', '');
      expect(result.type).to.equal('AdaptiveCard');
      expect(result.body).to.deep.equal(body);
      expect(result.version).to.equal('1.5');
    });

    it('should include an Action.Execute action if an operation is provided', () => {
      const body = [{ type: 'TextBlock', text: 'Hello World' }];
      const result = wrapperCard(body, 'test', 'get');
      expect(result.actions).to.deep.equal([
        { type: 'Action.Execute', verb: 'test', title: 'GET' }
      ]);
    });

    it('should not include an actions property if no operation is provided', () => {
      const body = [{ type: 'TextBlock', text: 'Hello World' }];
      const result = wrapperCard(body, 'test');
      expect(result.actions).to.be.undefined;
    });
  });
  
  describe('getCardTitle', () => {
    it('should return a TextBlock object with the given operation, url, and summary', () => {
      const result = getCardTitle('get', '/users', 'Get user list');
      expect(result.type).to.equal('TextBlock');
      expect(result.text).to.equal('GET /users: Get user list');
      expect(result.wrap).to.be.true;
    });
  
    it('should include an empty summary if none is provided', () => {
      const result = getCardTitle('get', '/users');
      expect(result.text).to.equal('GET /users');
    });
  });

  describe('getResponseJsonResult', () => {
    it('should return the JSON result for a 200 response', () => {
      const operationObject = {
        responses: {
          '200': {
            content: {
              'application/json': { schema: { type: 'string' } },
            },
          },
        },
      };
      const result = getResponseJsonResult(operationObject as any);
      expect(result).to.deep.equal({ schema: { type: 'string' } });
    });
  
    it('should return the JSON result for a 201 response', () => {
      const operationObject = {
        responses: {
          '201': {
            content: {
              'application/json': { schema: { type: 'number' } },
            },
          },
        },
      };
      const result = getResponseJsonResult(operationObject as any);
      expect(result).to.deep.equal({ schema: { type: 'number' } });
    });
  
    it('should return the JSON result for a default response', () => {
      const operationObject = {
        responses: {
          default: {
            content: {
              'application/json': { schema: { type: 'boolean' } },
            },
          },
        },
      };
      const result = getResponseJsonResult(operationObject as any);
      expect(result).to.deep.equal({ schema: { type: 'boolean' } });
    });
  
    it('should return an empty object if no JSON result is found', () => {
      const operationObject = {};
      const result = getResponseJsonResult(operationObject);
      expect(result).to.deep.equal({});
    });
  });
  
  describe("componentRefToCardName", () => {
    it("should return the correct card name for a non-array component ref", () => {
      const ref = "components/MyComponent";
      const isArray = false;
      const expectedName = "MyComponentCard";
  
      const result = componentRefToCardName(ref, isArray);
  
      expect(result).to.equal(expectedName);
    });
  
    it("should return the correct card name for an array component ref", () => {
      const ref = "components/MyComponent";
      const isArray = true;
      const expectedName = "MyComponentListCard";
  
      const result = componentRefToCardName(ref, isArray);
  
      expect(result).to.equal(expectedName);
    });
  
    it("should split the component ref correctly", () => {
      const ref = "components/MyComponent";
      const isArray = false;
    
      const splitStub = sinon.stub(String.prototype, "split").returns(["components", "MyComponent"]);
    
      componentRefToCardName(ref, isArray);
    
      expect(splitStub.calledWithExactly(sinon.match("/"))).to.be.true;
    
      splitStub.restore();
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter of a string', () => {
      // Call the capitalizeFirstLetter function with a mock string
      const result = capitalizeFirstLetter('hello world');
  
      // Assert that the result is equal to the expected value
      expect(result).to.equal('Hello world');
    });
  
    it('should return an empty string if the input is empty', () => {
      // Call the capitalizeFirstLetter function with an empty string
      const result = capitalizeFirstLetter('');
  
      // Assert that the result is an empty string
      expect(result).to.equal('');
    });
  });

  describe("getSchemaRef", () => {
    it("should return a map of schema references", () => {
      const unResolvedApi:any = {
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/User",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "/pet": {
            get: {
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/Pet",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
  
      const expectedMap = new Map([
        ["/users", "#/components/schemas/User"],
        ["/pet", "#/components/schemas/Pet"],
      ]);
  
      const result = getSchemaRef(unResolvedApi);
      expect(result).to.deep.equal(expectedMap);
    });
  });

  describe('truncateString', () => {
    it('should truncate a string and end with a complete word', () => {
      const str = 'Lists the currently available (non-finetuned) models, and provides basic information about each one such as the owner and availability.';
      const maxLength = 50;
      const expected = 'Lists the currently available (non-finetuned)...';
  
      const result = truncateString(str, maxLength);
  
      expect(result).to.equal(expected);
    });
  
    it('should not truncate a string shorter than the maximum length', () => {
      const str = 'Hello, world!';
      const maxLength = 20;
  
      const result = truncateString(str, maxLength);
  
      expect(result).to.equal(str);
    });
  });
})
