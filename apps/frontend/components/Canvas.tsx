
"use client";
import { useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import { Game } from "@/utils/Game";

const Canvas = ({ roomId, socket }:
  {
    roomId: number;
    socket: WebSocket
  }) => {

  const [canvasMessure, setCanvasMessure] = useState({ width: 500, height: 500 });
  const gameRef = useRef<Game>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  


  useEffect(() => {
    setCanvasMessure({
      width: window.innerWidth,
      height: window.innerHeight
    })
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !socket) return;
    console.log("the game class run two times....");
    let g;
    if(!gameRef.current) {
       g = new Game(canvasRef.current, roomId, socket);
       g.init();
      gameRef.current = g;
    }
    
    // initDraw(canvasRef.current, socket, roomId, g);
  }, []);

  return (
    <div className="w-full h-dvh overflow-hidden">
      <Toolbar game={gameRef.current} />
      <canvas ref={canvasRef} width={canvasMessure.width} height={canvasMessure.height}></canvas>
    </div>
  )
}

export default Canvas