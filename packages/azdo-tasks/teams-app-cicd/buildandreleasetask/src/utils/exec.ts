import * as tl from 'azure-pipelines-task-lib/task'

export async function Execute(cmd: string, args: any, workdir: string): Promise<number> {
  return await tl.exec(cmd, args, {
    cwd: workdir
  })
}
