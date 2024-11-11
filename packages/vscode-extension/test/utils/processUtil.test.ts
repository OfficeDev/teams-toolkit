import { expect } from "chai";
import sinon from "sinon";
import child_process from "child_process";
import { processUtil } from "../../src/utils/processUtil"; // Adjust the import path as necessary

describe("ProcessUtil", () => {
  let execStub: any;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    execStub = sandbox.stub(child_process, "exec");
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getProcessId", () => {
    it("should return the process ID on Windows", async () => {
      const port = 8080;
      const stdout = `TCP    0.0.0.0:${port}           0.0.0.0:0              LISTENING       1234`;
      execStub.yields(null, stdout);
      sandbox.stub(process, "platform").value("win32");
      const pid = await processUtil.getProcessId(port);
      expect(pid).to.equal("1234");
    });

    it("should return the process ID on Unix-based systems", async () => {
      const port = 8080;
      const stdout = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode      5678 user   22u  IPv4  0t0    TCP *:${port} (LISTEN)`;
      sandbox.stub(process, "platform").value("linux");
      execStub.yields(null, stdout);
      const pid = await processUtil.getProcessId(port);
      expect(pid).to.equal("5678");
    });

    it("should return an empty string if no process is found on Windows", async () => {
      const port = 8080;
      execStub.yields(null, "");
      sandbox.stub(process, "platform").value("win32");
      const pid = await processUtil.getProcessId(port);
      expect(pid).to.equal("");
    });
    it("should return an empty string if no process is found on Windows", async () => {
      const port = 8080;
      execStub.yields(null, "abc");
      sandbox.stub(process, "platform").value("win32");
      const pid = await processUtil.getProcessId(port);
      expect(pid).to.equal("");
    });
    it("should return an empty string if no process is found on Unix-based systems", async () => {
      const port = 8080;
      execStub.yields(null, "COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\n");
      sandbox.stub(process, "platform").value("linux");
      const pid = await processUtil.getProcessId(port);
      expect(pid).to.equal("");
    });

    it("should reject with an error if exec fails", async () => {
      const port = 8080;
      const error = new Error("exec error");
      execStub.yields(error, "");
      try {
        await processUtil.getProcessId(port);
        throw new Error("Expected method to reject.");
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe("killProcess", () => {
    it("should kill the process on Windows", async () => {
      sandbox.stub(process, "platform").value("win32");
      const pid = "1234";
      execStub.yields(null);

      await processUtil.killProcess(pid);
      expect(execStub.calledWith(`taskkill /PID ${pid} /F`)).to.be.true;
    });

    it("should kill the process on Unix-based systems", async () => {
      sandbox.stub(process, "platform").value("linux");
      const pid = "5678";
      execStub.yields(null);

      await processUtil.killProcess(pid);
      expect(execStub.calledWith(`kill -9 ${pid}`)).to.be.true;
    });

    it("should reject with an error if exec fails on Windows", async () => {
      sandbox.stub(process, "platform").value("win32");
      const pid = "1234";
      const error = new Error("exec error");
      execStub.yields(error);

      try {
        await processUtil.killProcess(pid);
        throw new Error("Expected method to reject.");
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it("should reject with an error if exec fails on Unix-based systems", async () => {
      sandbox.stub(process, "platform").value("linux");
      const pid = "5678";
      const error = new Error("exec error");
      execStub.yields(error);

      try {
        await processUtil.killProcess(pid);
        throw new Error("Expected method to reject.");
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe("getProcessInfo", () => {
    it("should return process info on Unix-based systems", async () => {
      sandbox.stub(process, "platform").value("linux");
      const pid = 5678;
      const stdout = `5678 /usr/bin/node`;
      execStub.yields(null, stdout);

      const processInfo = await processUtil.getProcessInfo(pid);
      expect(processInfo).to.equal(stdout);
      expect(execStub.calledWith(`ps -p ${pid} -o command=`)).to.be.true;
    });

    it("should return process info on Windows", async () => {
      sandbox.stub(process, "platform").value("win32");
      const pid = 1234;
      const stdout = `CommandLine="node.exe"`;
      execStub.yields(null, stdout);

      const processInfo = await processUtil.getProcessInfo(pid);
      expect(processInfo).to.equal('"node.exe"');
      expect(execStub.calledWith(`wmic process where ProcessId=${pid} get CommandLine /value`)).to
        .be.true;
    });

    it("should reject with an error if exec fails linux", async () => {
      sandbox.stub(process, "platform").value("linux");
      const pid = 5678;
      const error = new Error("exec error");
      execStub.yields(error);

      try {
        await processUtil.getProcessInfo(pid);
        throw new Error("Expected method to reject.");
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
    it("should reject with an error if exec fails win32", async () => {
      sandbox.stub(process, "platform").value("win32");
      const pid = 5678;
      const error = new Error("exec error");
      execStub.yields(error);

      try {
        await processUtil.getProcessInfo(pid);
        throw new Error("Expected method to reject.");
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
});
