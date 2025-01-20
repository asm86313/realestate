"use client";

import List from "@/components/rsms/list";
import { getRecentlyWinningNumber } from "@/utils/core";
import { useDispatch } from 'react-redux';
import { setBuildings, setContracts } from "@/app/slices/storeSlice";
import { useCallback, useEffect } from 'react';


export default function Page() {
  const dispatch = useDispatch();
  let winningSum = [];
  let winningNum = [];
  let recent10Num = [];
  let recent9Num = [];
  let recent8Num = [];
  let recent7Num = [];
  let recent6Num = [];
  let recent5Num = [];
  let recent4Num = [];
  let recent3Num = [];
  let recent2Num = [];
  let recent1Num = [];
  let numbers = [];
  let shuffledNumbers1 = []
  let shuffledNumbers2 = []

  const shuffle1 = (array) => {

    const result = [];
    while (result.length < 6 && array.length > 0) {
      const randomIndex = Math.floor(Math.random() * array.length);
      const randomNumb = Number(array.splice(randomIndex, 1)[0])
      if(!(result.includes(randomNumb))){
        result.push(randomNumb);
      }
      if(result.length === 6) {
        const sum = result.reduce((acc, cur) => acc + cur, 0);
        if(!
          (110 <= sum && sum < 160)) {
          result.splice(0, 6)
        }
      }
    }
    return result.sort((a, b) => a - b);
  }

  const shuffle2 = (array) => {
    let result = [];

    while (result.length < 6 && array.length > 0) {
      const randomIndex = Math.floor(Math.random() * array.length);
      const randomNumb = Number(array.splice(randomIndex, 1)[0])
      if(!(result.includes(randomNumb))){
        result.push(randomNumb);
      }
      if(result.length === 6) {
        const sum = result.reduce((acc, cur) => acc + cur, 0);
        if((110 <= sum && sum < 160)) {
          result.splice(0, 6)
        }
      }
    }
    return result.sort((a, b) => a - b);
  }


  const getWinningNumber = useCallback(async(drwNo=1154, cnt=100) => {
    let a = [10, 16, 19, 27, 37, 38]


    const res = await getRecentlyWinningNumber(drwNo, cnt);
    if(res) {
      for (let i = 0; i <= 0; i++) {
        recent10Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent10Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent9Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent9Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent8Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent8Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent7Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent7Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent6Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent6Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent5Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent5Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent4Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent4Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent3Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent3Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent2Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent2Num = [...new Set(recent10Num)];
      for (let i = 0; i <= 10; i++) {
        recent1Num.push(res[i].drwtNo1, res[i].drwtNo2, res[i].drwtNo3, res[i].drwtNo4, res[i].drwtNo5, res[i].drwtNo6)
      }
      recent1Num = [...new Set(recent10Num)];
      res.map(item => {
        winningSum.map(i => {
          if(i.sum <= (item.drwtNo1 + item.drwtNo2 + item.drwtNo3 + item.drwtNo4 + item.drwtNo5 + item.drwtNo6) && (i.sum + 10) > (item.drwtNo1 + item.drwtNo2 + item.drwtNo3 + item.drwtNo4 + item.drwtNo5 + item.drwtNo6)) {
            i.value = i.value + 1
          }
        })
        winningNum.map(i => {
          if(i.num === item.drwtNo1) {
            i.value = i.value + 1
          }
          if(i.num === item.drwtNo2) {
            i.value = i.value + 1
          }
          if(i.num === item.drwtNo3) {
            i.value = i.value + 1
          }
          if(i.num === item.drwtNo4) {
            i.value = i.value + 1
          }
          if(i.num === item.drwtNo5) {
            i.value = i.value + 1
          }
          if(i.num === item.drwtNo6) {
            i.value = i.value + 1
          }
        })
      })
      winningNum.map(w => {
          w.value = w.value * 10
      })
      recent10Num.map(r => {
        winningNum.map(w => {
          if(w.num == r) {
            w.value = w.value / 10
          }
        })
      })
      winningNum.map(w => {
        for (let i = 0; i < w.value; i++) {
          numbers.push(w.num)
        }
        for (let i = numbers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

      })
      for (let i = 0; i < 1000; i++) {
        shuffledNumbers1 = shuffle1(numbers);
        let commonCount = a.filter(value => shuffledNumbers1.includes(value)).length;
        if(commonCount>3) {
          console.log(`111    번호 : ${shuffledNumbers1}, 같은수 : ${commonCount}, 합계 : ${shuffledNumbers1.reduce((acc, cur) => acc + cur, 0)}`)
        }
      }
      for (let i = 0; i < 1000; i++) {
        shuffledNumbers2 = shuffle2(numbers);
        let commonCount = a.filter(value => shuffledNumbers2.includes(value)).length;
        if(commonCount>3) {
          console.log(`222   번호 : ${shuffledNumbers1}, 같은수 : ${commonCount}, 합계 : ${shuffledNumbers1.reduce((acc, cur) => acc + cur, 0)}`)
        }
      }
    }
    console.log('end')
  }, [])



  useEffect(() => {
    getWinningNumber();
    for (let i = 1; i <= 45; i++) {
      winningNum.push({num: i, value: 0})
    }
    for (let i = 20; i <= 260; i=i+10) {
      winningSum.push({sum: i, value: 0})
    }
  }, [])

  return (
    <div>
      sfsadf
      {winningSum[0]}
    </div>
  );
}
