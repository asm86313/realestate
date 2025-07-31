'use client'

import css from "./calculator.module.css";
import { useState, useEffect } from "react";

const DraggableButton = ({ children }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const onMouseDown = (e) => {
        console.log('mouseDown', offset)
        setDragging(true);
        setOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });

        console.log('mouseDown', offset)
    };

    const onMouseMove = (e) => {
        if (dragging) {
            setPosition({
                x: e.clientX - offset.x,
                y: e.clientY - offset.y,
            });
            console.log('mouseMove',  e.clientX - offset.x,  e.clientY - offset.y)
        }
    };

    const onMouseUp = () => {
        setDragging(false);
    };

    // 전역 이벤트 리스너 추가
    useEffect(() => {
        if (dragging) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        } else {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        }

        // 클린업 함수
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [dragging]);

    return (
        <div
            style={{
                position: "absolute",
                left: position.x,
                top: position.y,
                cursor: dragging ? "grabbing" : "grab",
            }}
            onMouseDown={onMouseDown}
        >
            <button className={css.button}>{`${children} ${position.x} ${position.y}`}</button>
        </div>
    );
};






const Calculator = () => {

    const [number1, setNumber1] = useState(null);
    const [currentInput, setCurrentInput] = useState('');
    const [result, setResult] = useState(null);
    const [operator, setOperator] = useState(null);
    const keyPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '*', '/', '=', 'C'];
    const handleButtonClick = (value) => {
        console.log(value);
        if(isNaN(Number(value))) {
            if(value === 'C') {
                setNumber1(null);
                setOperator(null);
                setCurrentInput('');
                setResult(0);
            } else if(value === '=') {
                if(currentInput === '') {
                    setCurrentInput(number1);
                    if(operator === '/') {
                        setResult(number1 / Number(number1))
                        setNumber1(number1 / Number(number1))
                    } else if(operator === '*') {
                        setResult(number1 * Number(number1))
                        setNumber1(number1 * Number(number1))
                    } else if(operator === '-') {
                        setResult(number1 - Number(number1))
                        setNumber1(number1 - Number(number1))
                    } else if(operator === '+') {
                        setResult(number1 + Number(number1))
                        setNumber1(number1 + Number(number1))
                    }
                } else {
                    if(operator === '/') {
                        setResult(number1 / Number(currentInput))
                        setNumber1(number1 / Number(currentInput))
                    } else if(operator === '*') {
                        setResult(number1 * Number(currentInput))
                        setNumber1(number1 * Number(currentInput))
                    } else if(operator === '-') {
                        setResult(number1 - Number(currentInput))
                        setNumber1(number1 - Number(currentInput))
                    } else if(operator === '+') {
                        setResult(number1 + Number(currentInput))
                        setNumber1(number1 + Number(currentInput))
                    }
                }

            } else {
                if(number1 === null) {
                    if(currentInput !== '') {
                        setNumber1(Number(currentInput));
                        setCurrentInput('');
                    } else {
                        setNumber1(0);
                    }
                    setOperator(value);
                } else {
                    if(operator !== null && currentInput !== '') {
                        if(operator === '/') {
                            setNumber1(number1 / Number(currentInput))
                        } else if(operator === '*') {
                            setNumber1(number1 * Number(currentInput))
                        } else if(operator === '-') {
                            setNumber1(number1 - Number(currentInput))
                        } else if(operator === '+') {
                            setNumber1(number1 + Number(currentInput))
                        }
                    }
                    setOperator(value);
                    setCurrentInput('');
                }
            }
        } else {
            if(result !== null) {
                setCurrentInput(value);
                setResult(null);
            } else {
                let cI = currentInput + value
                setCurrentInput(cI)
            }

        }
        
    }
    // return (
    //     <div>
    //         <div className={css.buttonWrap}>
    //             {keyPad.map((num, index) => (
    //                 <DraggableButton key={index}>{num}
                        
    //                 </DraggableButton>
    //             ))}
    //         </div>
    //     </div>
    // );

    return (
        <div>
            <div>입력되는 숫자: {currentInput}</div>
            <div>숫자1: {number1}</div>
            <div>연산: {operator}</div>
            <div>결과: {result}</div>
                {keyPad.map((num, index) => (
                    <button key={num+index} onClick={() => handleButtonClick(num)}>{num}</button>
                 ))}
        </div>
    )
};

export default Calculator;