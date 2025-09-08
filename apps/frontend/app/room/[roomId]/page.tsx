
import CanvasRoom from '@/components/CanvasRoom';
import React from 'react'

const DrawRoom = async ({ params }: { params: { roomIdabc: string } }) => {
  let roomId = 5;
  
  return (
    <CanvasRoom roomId={Number(roomId)} />
  )
}

export default DrawRoom