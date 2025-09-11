
"use client";
import { use, useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import { Game } from "@/utils/Game";
import { TextElement } from "@/utils/shapeTypes";

const Canvas = ({ roomId, socket }:
  {
    roomId: number;
    socket: WebSocket
  }) => {

  const [canvasMessure, setCanvasMessure] = useState({ width: 500, height: 500 });
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const [textElements, setTextElements] = useState<TextElement[]>([]);

  const gameRef = useRef<Game>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanvasMessure({
      width: window.innerWidth,
      height: window.innerHeight
    })
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !socket) return;
    let g;
    if (!gameRef.current && textInputRef.current) {
      g = new Game(canvasRef.current, roomId, socket);
      g.init();
      gameRef.current = g;
    }

  }, []);


  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current;

    // Double click Handler
    const handleDoubleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if double clicking on existing text
      const clickedText = findTextAtPosition(x, y);
      console.log("There is clickedText: ", clickedText);
      if (clickedText) {
        if(gameRef.current){
          gameRef.current.removeTextElement(clickedText.id);
        }
        editExistingText(clickedText);
      } else {
        createNewText(x, y);
      }
    };

    // On click Handler
    const handleClick = (e: MouseEvent) => {
      if (isEditingText) {
        finishTextEditing();
      }
    };


    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("click", handleClick);
    }
  }, [isEditingText]);

  useEffect(() => {
  if (textInputRef.current) {
    textInputRef.current.focus();

    const range = document.createRange();
    range.selectNodeContents(textInputRef.current);
    range.collapse(false); // moves cursor to end

    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}, [isEditingText]);


  const findTextAtPosition = (x: number, y: number): TextElement | null => {
    return textElements.find((ele) => {
      const textWidth = ele.text.length * ele.fontSize * 0.6;
      const textHeight = ele.fontSize;
      console.log("Find Text At Position run.....");
      console.log("x >= ele.x: ", x >= ele.x);
      console.log(" x <= ele.x + textWidth: ", x <= ele.x + textWidth);
      console.log("y >= ele.y: ", y >= ele.y);
      console.log("y <= ele.y + textHeight: ", y <= ele.y + textHeight);
      console.log(x, y, ele.x, ele.y);
      return x >= ele.x && x <= ele.x + textWidth && y >= ele.y - textHeight && y <= ele.y;
    }) || null;
  };

  const createNewText = (x: number, y: number) => {
    setInputPosition({ x, y });
    setIsEditingText(true);
    setEditingTextId(null);

    if (textInputRef.current) {
      textInputRef.current.textContent = "";
    }
  };

  const editExistingText = (textElement: TextElement) => {
    setInputPosition({ x: textElement.x, y: textElement.y });
    setIsEditingText(true);
    setEditingTextId(textElement.id);
    console.log("edit existing text run: ", textElement);
    if (textInputRef.current) {
      console.log("Text set to the input...");
      textInputRef.current.textContent = textElement.text;
    }
  };

  const finishTextEditing = () => {
    if (!textInputRef.current) return;

    const text = textInputRef.current.textContent || "";
    // console.log("Text in finishText: ", text);

    if (text.trim()) {
      if (editingTextId) {
        // Update existing text
        console.log("handleTextUpdate is called");
        handleTextUpdate(editingTextId, text);
      } else {
        // Create new text
        // console.log("handleTextCreate is called");
        handleTextCreate(text, inputPosition.x, inputPosition.y);
      }
    } else if (editingTextId) {
      // Delete empty text
      // console.log("handleTextDelete is called");
      handleTextDelete(editingTextId);
    }

    textInputRef.current.textContent = "";
    setIsEditingText(false);
    setEditingTextId(null);
    setInputPosition({ x: 0, y: 0 });
  };

  const handleTextCreate = (text: string, x: number, y: number) => {
    const newTextElement: TextElement = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      type: 'text',
      text,
      x,
      y,
      fontSize: 16,
      color: "white",
    }
    // console.log("New Text element Created:", newTextElement);
    const updatedElements = [...textElements, newTextElement];
    setTextElements(updatedElements);

    if (gameRef.current) {
      // console.log("I called game.addTextElement....");
      gameRef.current.addTextElement(newTextElement);
    }
  };

  const handleTextUpdate = (id: string, newText: string) => {
    const updatedElements = textElements.map(ele => ele.id === id ? { ...ele, text: newText } : ele);
    setTextElements(updatedElements);

    if (gameRef.current) {
      gameRef.current.updateTextElement(id, newText);
    }

    socket.send(JSON.stringify({
      type: "text_update",
      id,
      text: newText
    }));
  };

  const handleTextDelete = (id: string) => {
    const updatedElements = textElements.filter(ele => ele.id !== id);
    setTextElements(updatedElements);

    if (gameRef.current) {
      gameRef.current.deleteTextElement(id);
    }

    socket.send(JSON.stringify({
      type: "text_delete",
      id
    }));
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishTextEditing();
    } else if (e.key === 'Escape') {
      setIsEditingText(false);
      setEditingTextId(null);
    }
  };


  return (
    <div className="relative w-full h-dvh overflow-hidden">

      {/* Text Input */}
      <div
        ref={textInputRef}
        contentEditable={isEditingText}
        className={`absolute bg-transparent outline-none border-none text-white font-sans resize-none min-w-4 min-h-4 ${!isEditingText ? 'hidden pointer-events-none' : 'block'
          }`}
        style={{
          left: `${inputPosition.x}px`,
          top: `${inputPosition.y - 16}px`, // Offset by font size
          fontSize: '16px',
          lineHeight: '1.2',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
        onKeyDown={handleKeyDown}
        onBlur={finishTextEditing}
        suppressContentEditableWarning={true}
      />
      <Toolbar game={gameRef.current} />
      <canvas ref={canvasRef} width={canvasMessure.width} height={canvasMessure.height}></canvas>
    </div>
  )
}

export default Canvas