
"use client";
import initDraw from "@/utils/initDraw";
import { WS_URL } from "@repo/common/config";
import { useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import { Game } from "@/utils/Game";

const Canvas = ({ roomId, socket }:
  {
    roomId: number;
    socket: WebSocket
  }) => {

  const [canvasMessure, setCanvasMessure] = useState({ width: 500, height: 500 });
  const [game, setGame] = useState<Game>();
  const canvasRef = useRef<HTMLCanvasElement>(null);


  useEffect(() => {
    setCanvasMessure({
      width: window.innerWidth,
      height: window.innerHeight
    })
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !socket) return;
    const g = new Game("rect");
    setGame(g);
    initDraw(canvasRef.current, socket, roomId, g);
  }, []);

  return (
    <div className="w-full h-dvh overflow-hidden">
      <Toolbar game={game} />
      <canvas ref={canvasRef} width={canvasMessure.width} height={canvasMessure.height}></canvas>
    </div>
  )
}

export default Canvas