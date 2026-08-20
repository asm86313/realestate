"use client"; // 클라이언트 사이드에서만 동작하도록 지정

import { useCallback, useEffect, useState } from "react";
import { Plus, User } from 'lucide-react';
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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
    toast.success('임차인이 추가되었습니다. 저장을 눌러야 실제로 반영됩니다.');
  }, [contractDate, contractPeriod, roomNum, name, phoneNum, deposit, rentFee, vat, managementFee, rows]);

  useEffect(() => {
    if (rows.length > 0) {
      setRentList(rows);
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
    toast.success('임차인 정보가 수정되었습니다. 저장을 눌러야 실제로 반영됩니다.');
  }, [rows, editIndex, contractDate, contractPeriod, roomNum, name, phoneNum, deposit, rentFee, vat, managementFee]);

  const fields = [
    { label: '계약일', value: contractDate, set: setContractDate, type: 'date' },
    { label: '계약기간', value: contractPeriod, set: setContractPeriod, type: 'text' },
    { label: '호실', value: roomNum, set: setRoomNum, type: 'text' },
    { label: '이름', value: name, set: setName, type: 'text' },
    { label: '연락처', value: phoneNum, set: setPhoneNum, type: 'text' },
    { label: '보증금', value: deposit, set: setDeposit, type: 'text' },
    { label: '월세', value: rentFee, set: setRentFee, type: 'text' },
    { label: '부가세', value: vat, set: setVat, type: 'text' },
    { label: '관리비', value: managementFee, set: setManagementFee, type: 'text' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? '임차인 정보 수정' : '임차인 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            {fields.map((f) => (
              <div className="flex flex-col gap-1.5" key={f.label}>
                <Label>{f.label}</Label>
                <Input type={f.type} value={f.value} placeholder={f.label} onChange={(e) => f.set(e.target.value)} />
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
            {!isEdit ? (
              <Button type="button" className="w-full" onClick={onSave}>저장</Button>
            ) : (
              <Button type="button" className="w-full" onClick={onEdit}>수정</Button>
            )}
            <Button type="button" variant="secondary" className="w-full" onClick={onClose}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-3">
		{rows.map((row, index) => (
			<Card
				key={row + index}
				className="cursor-pointer transition-colors hover:border-primary/50 active:bg-accent"
				onClick={() => onEditClick(row, index)}
			>
				<CardContent className="flex flex-col gap-1.5 p-4 sm:p-4 text-sm">
					<div className="mb-1 flex items-center gap-2 font-semibold">
						<User className="size-4 text-primary" />
						{`${row.name}(${row.roomNumber})`}
					</div>
					<div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
						<span>계약일: {row.contractDate}</span>
						<span>계약기간: {row.contractPeriod}</span>
						<span>연락처: {row.phone}</span>
						<span>보증금: {row.deposit}</span>
						<span>월세: {row.rent}</span>
						<span>부가세: {row.vat}</span>
						<span>관리비: {row.managementFee}</span>
					</div>
				</CardContent>
			</Card>
		))}
      </div>
      <Button type="button" variant="outline" className="gap-1.5" onClick={addRow}>
        <Plus className="size-4" /> 임차인 추가
      </Button>
    </div>
  );
}
