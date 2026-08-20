import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

export async function POST(request) {
    const user = await requireUser(request);
    if (!user) {
        return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
    }
    const ownerId = await resolveOwnerId(user);

    const { bldDefaultInfo, rentList } = await request.json();

    try {
        let bldId = bldDefaultInfo?.id;

        // 1. 건물정보 upsert
        if (bldDefaultInfo) {
            // 기존 건물을 수정하는 경우, 우리 가족 소유가 맞는지 먼저 확인 (다른 가족 건물 id를 넣어 덮어쓰는 것 방지)
            if (bldDefaultInfo.id) {
                const { data: existing, error: existingError } = await supabaseAdmin
                    .from('Buildings')
                    .select('ownerId')
                    .eq('id', bldDefaultInfo.id)
                    .maybeSingle();

                if (existingError) throw existingError;
                if (!existing || existing.ownerId !== ownerId) {
                    return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
                }
            }

            const { data: bldData, error: bldError } = await supabaseAdmin
                .from('Buildings')
                .upsert([{ ...bldDefaultInfo, ownerId }], { onConflict: ['id'] })
                .select();

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

                const { error } = await supabaseAdmin.from('Contracts').upsert(contract, {onConflict: ['id']});

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
  const user = await requireUser(request);
  if (!user) {
    return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
  }
  const ownerId = await resolveOwnerId(user);

  try {
    const { id } = await request.json();

    if (!id) {
      return new NextResponse(JSON.stringify({ message: '삭제할 건물 ID가 없습니다.' }), { status: 400 });
    }

    // 건물 삭제 시 관련 계약도 자동 삭제됨 (CASCADE). 우리 가족 소유 건물만 삭제 가능.
    const { error: buildingDeleteError, count } = await supabaseAdmin
      .from('Buildings').delete({ count: 'exact' }).eq('id', id).eq('ownerId', ownerId);

    if (!buildingDeleteError && count === 0) {
      return new NextResponse(JSON.stringify({ message: '권한이 없거나 존재하지 않는 건물입니다.' }), { status: 403 });
    }

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
