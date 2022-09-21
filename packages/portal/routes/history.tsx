import DatePicker from '../components/DatePicker.tsx';
import IncidentEvent from '../components/IncidentEvent.tsx';
import { Link, useData } from 'aleph/react';

export const data = {
  async get(_: Request, _ctx: Context) {
    const data = await fetch('http://localhost/api/historydata');
    return data;
  },
};

export default function Mypage() {
  const historyPageTitle = 'Incident History';
  const { data } = useData<{ fakeList: { eventList; month: string }[] }>();
  const fakeList = data.fakeList;

  return (
    <div className='w-9/10 max-w-350 mx-auto  '>
      <h1 className='text-3xl md-pb-8 pb-4 hover:cursor-default'>
        {historyPageTitle}
      </h1>
      <div className='border-gray-200 border-1.5  bg-white shadow-md shadow-gray-200 '>
        <DatePicker
          timeList={[
            { month: 'Aug', year: 2022 },
            { month: 'Jul', year: 2022 },
            { month: 'Jun', year: 2022 },
            { month: 'May', year: 2022 },
          ]}
        />
        <div>
          {/* 3 months data list */}
          {fakeList.map((item, index) => (
            <IncidentEvent
              key={index}
              eventList={item.eventList}
              month={item.month}
            />
          ))}
        </div>
      </div>
      <div className='flex justify-end mb-20 pr-3'>
        <Link className='flex no-wrap ' to='/'>
          <span className='text-blue-600 mt-7'>Current Status</span>
          <span className='border-r-2 text-transparent border-b-2 w-2 h-2 border-blue-600 rotate--45 relative top-9.5 left-2 '>
          </span>
        </Link>
      </div>
    </div>
  );
}
