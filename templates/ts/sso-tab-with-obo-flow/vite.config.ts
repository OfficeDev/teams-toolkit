import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

const cherryPickedKeys = [
  "REACT_APP_CLIENT_ID",
  "REACT_APP_START_LOGIN_PAGE_URL",
  "REACT_APP_FUNC_NAME",
  "REACT_APP_FUNC_ENDPOINT",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const processEnv = {};
  cherryPickedKeys.forEach((key) => (processEnv[key] = env[key]));

  return {
    define: {
      "process.env": processEnv,
    },
    plugins: [react()],
    server: {
      port: 53000,
      https: {
        cert: process.env.SSL_CRT_FILE ? fs.readFileSync(process.env.SSL_CRT_FILE) : undefined,
        key: process.env.SSL_KEY_FILE ? fs.readFileSync(process.env.SSL_KEY_FILE) : undefined,
      },
    },
  };
});
