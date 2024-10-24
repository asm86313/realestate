import { getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import css from './tanstackTable.module.css';

export const Table = ({bldList, onClickList}) => {

  const [data, setData] = useState(bldList);
    const columns = [
        {
          accessorKey: 'bldName',
          header: '빌딩명',
          cell: (props) => <p>{props.getValue()}</p>,
        //   size: 250,
        },
        {
          accessorKey: 'address',
          header: '주소',
          cell: (props) => <p>{props.getValue()}</p>,
        //   size: 250,
        },
      ];
      useEffect(()=> {

        setData(bldList)
      },[bldList])


    //  useReactTable
    const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });
    return (
      <table style={{ width: `${table.getTotalSize()}px` }}>
        <thead>
          {/* Table 헤더 */}
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                // 여기는 변경해야함!
                <th key={header.id}                 style={{
                    // header의 column의 size를 가져와서 width를 조정해준다.
                    width: `${header.getSize()}px`,
                  }}>
                {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td
                className={css.list}
                key={cell.id}
                style={{
                    // cell의 column의 size를 가져와서 width를 조정해준다.
                    width: `${cell.column.getSize()}px`,
                    textAlign: 'center',
                }}
                onClick={() => onClickList(cell)}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      </table>
    );
  };

export default function tanstackTable({bldList, onClickList}) {



return (
    <div>
        {bldList && Table({bldList, onClickList})}
    </div>
)

}