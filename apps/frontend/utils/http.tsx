import { BACKEND_URL } from "@repo/common/config";
import axios from "axios";

export async function getExistingShapes(roomId: number) {
    try {
        // roomId = (await params).roomId;
        const response = await axios.get(`${BACKEND_URL}/chats?roomId=${roomId}`, {
            headers: {
                // Authorization: `${localStorage.getItem("token")}`
                Authorization: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRhNjg2YjU2LWM1Y2ItNDRmYi05N2U5LTlkMTE3M2QxNDI1MSIsInVzZXJuYW1lIjoiSGVsbG8iLCJ1c2VySWQiOiJkYTY4NmI1Ni1jNWNiLTQ0ZmItOTdlOS05ZDExNzNkMTQyNTEiLCJpYXQiOjE3NTczMTA3ODR9.JybklJVFPzAHurt9sdXPb6rIFS6GqR7yu4xVPWyPi_U`
            }
        })

        const shapes = response?.data.chats
        return shapes.map((shape: string) => JSON.parse(shape));
    } catch (error) {
        console.log("Error in getting existing shapes: ", error);
        return [];
    }

}