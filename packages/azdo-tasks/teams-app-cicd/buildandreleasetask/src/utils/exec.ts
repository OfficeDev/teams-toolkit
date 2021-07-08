import * as tl from 'azure-pipelines-task-lib/task'

export async function Execute(cmd: string, workdir: string): Promise<number> {
  return await tl.exec(cmd, undefined, {
    cwd: workdir
  })
}
