
"use client";
import { WS_URL } from '@repo/common/config';
import React, { useEffect, useRef, useState } from 'react'
import Canvas from './Canvas';

const CanvasRoom = ({ roomId }: { roomId: number }) => {
    const [socket, setSocket] = useState<WebSocket>();
    const [shapes, setShapes] =  useState<string[]>([]);
    // Initialized websocket 
    useEffect(() => {
        // const ws = new WebSocket(`${WS_URL}/?token=${localStorage.getItem("token")}`);
        const ws = new WebSocket(`${WS_URL}/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRhNjg2YjU2LWM1Y2ItNDRmYi05N2U5LTlkMTE3M2QxNDI1MSIsInVzZXJuYW1lIjoiSGVsbG8iLCJ1c2VySWQiOiJkYTY4NmI1Ni1jNWNiLTQ0ZmItOTdlOS05ZDExNzNkMTQyNTEiLCJpYXQiOjE3NTczMTA3ODR9.JybklJVFPzAHurt9sdXPb6rIFS6GqR7yu4xVPWyPi_U`);
        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "join_room", payload: { roomId } }))
        }
        setSocket(ws);
    }, [])


    if (!socket) {
        return <div>Loading...</div>
    }

    return (
        <div>
            <Canvas roomId={roomId} socket = {socket} />
        </div>
    )
}

export default CanvasRoom