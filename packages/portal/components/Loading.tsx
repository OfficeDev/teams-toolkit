export default function Loading(opts: { isLoading: boolean }) {
  return (
    <div
      className={`${
        opts.isLoading ? 'flex ' : 'hidden '
      } w-full bg-gray  h-full fixed z-10 justify-center items-center text-8 bg-opacity-80 text-blue-500`}
    >
      <div className=' w-100 h-30 rounded-md shadow-xl bg-white flex justify-center items-center'>
        <span className='material-icons  animate-spin'>sync</span>
        <div className='mx-3'>
          <span className=' animate-pulse'>
            Loading
          </span>

          <span className='bg-white  animate-pulse '>. . .</span>
        </div>
      </div>
    </div>
  );
}
