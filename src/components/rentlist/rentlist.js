"use client"; // 클라이언트 사이드에서만 동작하도록 지정

import { useCallback, useEffect, useState } from "react";
import css from "./rentlist.module.css";

export default function Rentlist({ setRentList, contractList }) {
  const [isOpen, setOpen] = useState(false);
  const [isEdit, setEdit] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [contractDate, setContractDate] = useState("");
  const [contractPeriod, setContractPeriod] = useState("");
  const [roomNum, setRoomNum] = useState("");
  const [name, setName] = useState("");
  const [phoneNum, setPhoneNum] = useState("");
  const [deposit, setDeposit] = useState("");
  const [rentFee, setRentFee] = useState("");
  const [vat, setVat] = useState("");
  const [managementFee, setManagementFee] = useState("");
  const [rows, setRows] = useState([]);

  const addRow = () => {
	setEdit(false);
	setEditIndex(null);
    setInit();
    setOpen(true);
  };

  const setInit = useCallback(() => {
    setContractDate("");
    setContractPeriod("");
    setRoomNum("");
    setName("");
    setPhoneNum("");
    setDeposit("");
    setRentFee("");
    setVat("");
    setManagementFee("");
  }, []);



  useEffect(()=> {
    if(contractList) {
      setRows(contractList)
    }


  }, [contractList])

  const onClose = useCallback(() => {
    setOpen(false);
  }, []);

  const onSave = useCallback(() => {
    setRows([
      ...rows,
      {
        contractDate,
        contractPeriod,
        roomNumber: roomNum,
        name,
        phone: phoneNum,
        deposit,
        rent: rentFee,
        vat,
        managementFee,
      },
    ]);
    onClose();
  }, [contractDate, contractPeriod, roomNum, name, phoneNum, deposit, rentFee, vat, managementFee, rows]);

  useEffect(() => {
    if (rows.length > 0) {
      setRentList(rows);
      console.log(rows);
    }
  }, [rows, setRentList]);

  const onEditClick = useCallback((row, index) => {
	setEdit(true);
    setOpen(true);
	setContractDate(row.contractDate);
    setContractPeriod(row.contractPeriod);
    setRoomNum(row.roomNumber);
    setName(row.name);
    setPhoneNum(row.phone);
    setDeposit(row.deposit);
    setRentFee(row.rent);
    setVat(row.vat);
    setManagementFee(row.managementFee);
	setEditIndex(index)
  }, []);

  const onEdit = useCallback(() => {
    setOpen(false);
    console.log('contractDate', rows[editIndex]);
  
    // 새로운 객체를 만들어서 업데이트
    const updatedRows = rows.map((row, index) => {
      if (index === editIndex) {
        return {
          ...row, // 기존 row의 모든 프로퍼티를 복사
          contractDate, // 업데이트된 contractDate
          contractPeriod, // 업데이트된 contractPeriod
          roomNumber: roomNum, // 업데이트된 roomNumber
          name, // 업데이트된 name
          phone: phoneNum, // 업데이트된 phoneNum
          deposit, // 업데이트된 deposit
          rent: rentFee, // 업데이트된 rent
          vat, // 업데이트된 vat
          managementFee, // 업데이트된 managementFee
        };
      }
      return row; // 수정되지 않은 row는 그대로 반환
    });
  
    // 상태를 업데이트
    setRows(updatedRows);
  }, [rows, editIndex, contractDate, contractPeriod, roomNum, name, phoneNum, deposit, rentFee, vat, managementFee]);
  
  return (
    <div>
      {isOpen && (
        <div className={css.modalBackdrop}>
          <div className={css.modal}>
            <div className={css.form}>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="date"
                  value={contractDate}
                  placeholder="계약일"
                  onChange={(e) => setContractDate(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={contractPeriod}
                  placeholder="계약기간"
                  onChange={(e) => setContractPeriod(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={roomNum}
                  placeholder="호실"
                  onChange={(e) => setRoomNum(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={name}
                  placeholder="이름"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={phoneNum}
                  placeholder="연락처"
                  onChange={(e) => setPhoneNum(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={deposit}
                  placeholder="보증금"
                  onChange={(e) => setDeposit(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={rentFee}
                  placeholder="월세"
                  onChange={(e) => setRentFee(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={vat}
                  placeholder="부가세"
                  onChange={(e) => setVat(e.target.value)}
                />
              </div>
              <div className={css.row}>
                <input
                  className={css.textInput}
                  type="text"
                  value={managementFee}
                  placeholder="관리비"
                  onChange={(e) => setManagementFee(e.target.value)}
                />
              </div>
			  {!isEdit ?
				<button className={css.button} onClick={onSave}>
					저장
				</button> :
				<button className={css.button} onClick={onEdit}>
					수정
				</button>
			  }
              <button className={css.button} onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={css.cardContainer}>
		{rows.map((row, index) => (
			<div className={css.card} key={row + index} onClick={() => onEditClick(row, index)}>
				<h3 className={css.cardTitle}>{`${row.name}(${row.roomNumber})`}</h3>
				<p>계약일: {row.contractDate}</p>
				<p>계약기간: {row.contractPeriod}</p>
				<p>호실: {row.roomNumber}</p>
				<p>이름: {row.name}</p>
				<p>연락처: {row.phone}</p>
				<p>보증금: {row.deposit}</p>
				<p>월세: {row.rent}</p>
				<p>부가세: {row.vat}</p>
				<p>관리비: {row.managementFee}</p>
			</div>
		))}
        <button className={css.button} onClick={addRow}> + 임차인 추가 </button>
      </div>
    </div>
  );
}
