import * as exec from '@actions/exec'

export async function Execute(cmd: string, workdir: string): Promise<number> {
  return await exec.exec(cmd, undefined, {
    cwd: workdir,
    env: {
      "CI_ENABLED": "true"
    }
  })
}
