import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '../../../lib/db';

export async function POST(request) {

  const { bldDefaultInfo, rentList } = await request.json();
  console.log(bldDefaultInfo, rentList)
  let bldDefaultInfoResult = null;
  try {
    // SQL 쿼리 실행 - 데이터 저장
    if (bldDefaultInfo) {
      try {
        [bldDefaultInfoResult] = await pool.query(
          `INSERT INTO Buildings
           (id, address, bldName, mainPurps, floor, platArea, totArea, useAprDay)
           VALUES (null, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bldDefaultInfo.address,
            bldDefaultInfo.bldName,
            bldDefaultInfo.mainPurps,
            bldDefaultInfo.floor,
            bldDefaultInfo.platArea,
            bldDefaultInfo.totArea,
            bldDefaultInfo.useAprDay,
          ]
        );
        console.log('Building inserted successfully:', bldDefaultInfoResult);
      } catch (error) {
        console.error('Error inserting building:', error);
      }
    }


    if (rentList) {
      console.log(bldDefaultInfoResult.insertId)
      for (let i = 0; i < rentList.length; i++) {
        const [result] = await pool.query(
          'INSERT INTO Contracts (id, contractDate, contractPeriod, roomNumber, name, phone, deposit, rent, vat, managementFee, bldId) VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            rentList[i].contractDate,
            rentList[i].contractPeriod,
            rentList[i].roomNumber,
            rentList[i].name,
            rentList[i].phone,
            rentList[i].deposit,
            rentList[i].rent,
            rentList[i].vat,
            rentList[i].managementFee,
            bldDefaultInfoResult.insertId
          ]
        );
      }
    }

    // 성공 메시지 응답
    return new NextResponse(JSON.stringify({message: '등록이 정상적으로 되었습니다.'}), {
      status: 200,
    });
  } catch (error) {
    console.error('Error saving user:', error);
    return new NextResponse(JSON.stringify({message: '등록이 실패했습니다.'}), {
      status: 500,
    });
  }
}
