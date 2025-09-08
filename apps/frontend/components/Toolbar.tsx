
"use client";

import { Circle, MoveRight, Square } from "lucide-react";
import ToobarButton from "./ToobarButton";
import { Game } from "@/utils/Game";
import { useState } from "react";

const Toolbar = ({ game }: { game?: Game }) => {
  const [shapeType, setShapeStyle] = useState("rect");

  return (
    <div className="bg-bg rounded-md flex gap-1 p-1 px-4 fixed top-10 left-1/2 -translate-x-1/2">
      <ToobarButton isActive={shapeType === 'rect'} icon={<Square className="size-4" />}
        onClick={() => {
          setShapeStyle("rect");
          game ? game.selectedStyle = "rect" : ""
        }} />
      <ToobarButton isActive={shapeType === 'circle'} icon={<Circle className="size-4" />}
        onClick={() => {
          setShapeStyle("circle");
          game ? game.selectedStyle = "rect" : ""
        }} />
      <ToobarButton isActive={shapeType === 'line'} icon={<MoveRight className="size-4" />}
        onClick={() => {
          setShapeStyle("line");
          game ? game.selectedStyle = "rect" : ""
        }} />
    </div>
  )
}

export default Toolbar