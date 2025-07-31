// import { NextResponse } from 'next/server';
// import pool from '../../../lib/db';

// export async function POST(request) {

//   const { bldDefaultInfo, rentList } = await request.json();

//   let bldDefaultInfoResult = null;
//   try {
//     // SQL 쿼리 실행 - 데이터 저장
//     if (bldDefaultInfo) {
//       try {
//         [bldDefaultInfoResult] = await pool.query(
//           `INSERT INTO Buildings
//           (id, address, bldName, mainPurps, floor, platArea, totArea, useAprDay)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//           ON DUPLICATE KEY UPDATE
//           address = VALUES(address),
//           bldName = VALUES(bldName),
//           mainPurps = VALUES(mainPurps),
//           floor = VALUES(floor),
//           platArea = VALUES(platArea),
//           totArea = VALUES(totArea),
//           useAprDay = VALUES(useAprDay)`,
//          [
//            bldDefaultInfo.id || null,  // id가 없으면 null 삽입
//            bldDefaultInfo.address,
//            bldDefaultInfo.bldName,
//            bldDefaultInfo.mainPurps,
//            bldDefaultInfo.floor,
//            bldDefaultInfo.platArea,
//            bldDefaultInfo.totArea,
//            bldDefaultInfo.useAprDay,
//          ]
//         );
//       } catch (error) {
//         console.error('Error inserting building:', error);
//       }
//     }

//     if (rentList) {

//       for (let i = 0; i < rentList.length; i++) {
//         const [result] = await pool.query(
//           `INSERT INTO Contracts
//           (id, contractDate, contractPeriod, roomNumber, name, phone, deposit, rent, vat, managementFee, bldId)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//           ON DUPLICATE KEY UPDATE
//           contractDate = VALUES(contractDate),
//           contractPeriod = VALUES(contractPeriod),
//           roomNumber = VALUES(roomNumber),
//           name = VALUES(name),
//           phone = VALUES(phone),
//           deposit = VALUES(deposit),
//           rent = VALUES(rent),
//           vat = VALUES(vat),
//           managementFee = VALUES(managementFee),
//           bldId = VALUES(bldId)`,
//          [
//           rentList[i].id || null,  // id가 없으면 null 삽입
//            rentList[i].contractDate,
//            rentList[i].contractPeriod,
//            rentList[i].roomNumber,
//            rentList[i].name,
//            rentList[i].phone,
//            rentList[i].deposit,
//            rentList[i].rent,
//            rentList[i].vat,
//            rentList[i].managementFee,
//            bldDefaultInfo.id || bldDefaultInfoResult.insertId,
//          ]
//         );
//       }
//     }

//     // 성공 메시지 응답
//     return new NextResponse(JSON.stringify({message: '등록이 정상적으로 되었습니다.'}), {
//       status: 200,
//     });
//   } catch (error) {
//     console.error('Error saving user:', error);
//     return new NextResponse(JSON.stringify({message: '등록이 실패했습니다.'}), {
//       status: 500,
//     });
//   }
// }


import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
    const { bldDefaultInfo, rentList } = await request.json();

    try {
        let bldId = bldDefaultInfo?.id;

        // 1. 건물정보 upsert
        if (bldDefaultInfo) {
            const { data: bldData, error: bldError } = await supabase.from('Buildings').upsert([bldDefaultInfo], {onConflict: ['id']}).select();

            if (bldError) throw bldError;

            bldId = bldData?.[0]?.id;
        }

        // 2. 계약정보 upsert
        if (rentList && rentList.length > 0) {
            const upsertPromises = rentList.map(async (rent) => {
                const contract = {
                    ...rent,
                    bldId: bldId,
                };

                const { error } = await supabase.from('Contracts').upsert(contract, {onConflict: ['id']});

                if (error) {
                    console.error(`Contract upsert 실패 (id: ${rent.id}):`, error);
                    throw error; // 개별 실패를 무시하고 싶다면 이 줄 제거
                }
            });

            try {
                await Promise.all(upsertPromises);
            } catch (err) {
                console.error('하나 이상의 contract 업서트 실패:', err);
                return new NextResponse(
                JSON.stringify({ message: '계약 등록 중 일부 실패했습니다.', error: err }), { status: 500 });
            }
        }

        return new NextResponse(JSON.stringify({ message: '등록이 정상적으로 되었습니다.' }), {
            status: 200,
        });
    } catch (error) {
        console.error('업서트 실패:', error);
        return new NextResponse(JSON.stringify({ message: '등록이 실패했습니다.', error }), {status: 500});
    }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return new NextResponse(JSON.stringify({ message: '삭제할 건물 ID가 없습니다.' }), { status: 400 });
    }

    // 건물 삭제 시 관련 계약도 자동 삭제됨 (CASCADE)
    const { error: buildingDeleteError } = await supabase
      .from('Buildings').delete().eq('id', id);

    if (buildingDeleteError) {
      throw buildingDeleteError;
    }

    return new NextResponse(JSON.stringify({ message: '건물 및 관련 계약이 삭제되었습니다.' }), {
      status: 200,
    });

  } catch (error) {
    console.error('삭제 중 오류 발생:', error);
    return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.', error }), {
      status: 500,
    });
  }
}