import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(request) {

  const { bldDefaultInfo, rentList } = await request.json();

  let bldDefaultInfoResult = null;
  try {
    // SQL 쿼리 실행 - 데이터 저장
    if (bldDefaultInfo) {
      try {
        [bldDefaultInfoResult] = await pool.query(
          `INSERT INTO Buildings
          (id, address, bldName, mainPurps, floor, platArea, totArea, useAprDay)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          address = VALUES(address),
          bldName = VALUES(bldName),
          mainPurps = VALUES(mainPurps),
          floor = VALUES(floor),
          platArea = VALUES(platArea),
          totArea = VALUES(totArea),
          useAprDay = VALUES(useAprDay)`,
         [
           bldDefaultInfo.id || null,  // id가 없으면 null 삽입
           bldDefaultInfo.address,
           bldDefaultInfo.bldName,
           bldDefaultInfo.mainPurps,
           bldDefaultInfo.floor,
           bldDefaultInfo.platArea,
           bldDefaultInfo.totArea,
           bldDefaultInfo.useAprDay,
         ]
        );
      } catch (error) {
        console.error('Error inserting building:', error);
      }
    }

    if (rentList) {

      for (let i = 0; i < rentList.length; i++) {
        const [result] = await pool.query(
          `INSERT INTO Contracts
          (id, contractDate, contractPeriod, roomNumber, name, phone, deposit, rent, vat, managementFee, bldId) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          contractDate = VALUES(contractDate),
          contractPeriod = VALUES(contractPeriod),
          roomNumber = VALUES(roomNumber),
          name = VALUES(name),
          phone = VALUES(phone),
          deposit = VALUES(deposit),
          rent = VALUES(rent),
          vat = VALUES(vat),
          managementFee = VALUES(managementFee),
          bldId = VALUES(bldId)`,
         [
          rentList[i].id || null,  // id가 없으면 null 삽입
           rentList[i].contractDate,
           rentList[i].contractPeriod,
           rentList[i].roomNumber,
           rentList[i].name,
           rentList[i].phone,
           rentList[i].deposit,
           rentList[i].rent,
           rentList[i].vat,
           rentList[i].managementFee,
           bldDefaultInfo.id || bldDefaultInfoResult.insertId,
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
