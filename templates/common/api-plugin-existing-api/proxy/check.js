const { exit } = require("node:process");
const { exec } = require("child_process");
exec("devproxy --version", (err, stdout, stderr) => {
  if (err) {
    console.error(
      `The devproxy is required to debug in Teams with proxy.\nPlease refer to https://learn.microsoft.com/en-us/microsoft-cloud/dev/dev-proxy/get-started?tabs=powershell&pivots=client-operating-system-windows to install devproxy first.`
    );
    exit(1);
  }

  console.log(`stdout: ${stdout}`);
});
