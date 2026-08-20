import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
