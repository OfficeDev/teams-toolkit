import * as exec from '@actions/exec'
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommandUtil {
  static async Execute(cmd: string, workdir: string): Promise<number> {
    return await exec.exec(cmd, undefined, {
      cwd: workdir
    })
  }
}

export default CommandUtil
