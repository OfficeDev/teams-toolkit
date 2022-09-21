import { useState } from 'react';
import { Link } from 'aleph/react';
import { VersionSchema } from '~/utils/schema.ts';
import { formatVersionList } from '~/utils/tools.ts';
export default function Sprint(
  opts: { versionList: VersionSchema[] },
): JSX.Element {
  const sprintList = formatVersionList(opts.versionList);
  const [toggle, changeToggle] = useState(false);
  const [currentIndex, changeIndex] = useState(sprintList.length - 1);
  return (
    <div className='w-1/2 mx-3'>
      <div>
        <h1 className='text-3xl my-8 hover:cursor-default'>Sprintly Release</h1>
      </div>
      <div className='w-full bg-white shadow-md rounded my-5 pa-4'>
        <div
          className='w-35 h-8 border-gray border-0.5 shadow rounded flex  justify-center items-center cursor-pointer'
          onClick={() => {
            changeToggle(!toggle);
          }}
        >
          <span className='material-icons '>timeline</span>
          <span className='px-1'>
            {sprintList[currentIndex].title}
          </span>
          <span
            className={`${
              toggle ? 'rotate-180' : ''
            } material-icons transition-all`}
          >
            keyboard_arrow_down
          </span>
        </div>
        <ul
          className={`w-50 bg-white shadow rounded absolute top-154.7 left-3.5 flex-col justify-between items-center duration-300 flex transition-all ${
            toggle ? 'opacity-100	' : 'opacity-0'
          }`}
        >
          {toggle && (
            sprintList.map((item, index) => {
              return (
                <li
                  onClick={() => {
                    changeIndex(index);
                    changeToggle(false);
                  }}
                  key={item.title}
                  className='border-b-0.5 border-gray-200 w-full flex justify-between items-center hover:bg-gray-100 hover:cursor-pointer py-2'
                >
                  <span className='material-icons ml-3'>
                    timeline
                  </span>
                  <span className='ml-3'>
                    {item.title}
                  </span>
                  <div
                    className={`mr-3 shadow-lg text-white ${
                      currentIndex === index ? 'bg-blue' : 'bg-gray'
                    } w-13 h-6 rounded flex justify-center items-center text-3`}
                  >
                    {currentIndex === index ? 'Current' : 'Passed'}
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <div className='ma-3 text-5'>
          Release detail:
        </div>
        <ul className='ma-3 text-4'>
          {sprintList[currentIndex].versionList.map((item) => {
            return (
              <li className='py-3 w-full underline text-blue-700' key={item.id}>
                <Link target='_blank' to={item.url}>
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
