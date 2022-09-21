export default function Coverage(opts: { coverage: string }) {
  return (
    <div className='w-1/2 mx-3 '>
      <div>
        <h1 className='text-3xl my-8 hover:cursor-default'>Code Coverage</h1>
      </div>
      <div className='w-full bg-white shadow-md rounded my-5 pa-4 flex flex-col justify-center items-center'>
        <div className='flex self-start items-center'>
          <span className='mx-5 text-5'>TeamsFx</span>
          <a href='https://codecov.io/gh/OfficeDev/TeamsFx'>
            <img src='https://codecov.io/gh/OfficeDev/TeamsFx/branch/dev/graph/badge.svg?token=QQX8WVOEC3' />
          </a>
        </div>

        <div className='mx-3 mt-5'>
          <div dangerouslySetInnerHTML={{ __html: opts.coverage }}></div>
        </div>
      </div>
    </div>
  );
}
