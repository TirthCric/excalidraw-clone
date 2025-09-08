import { WebSocket, WebSocketServer } from 'ws';
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

const wss = new WebSocketServer({ port: 8800 });

interface User {
    socket: WebSocket,
    rooms?: string[],
    userId: string
}

interface Message {
    roomId: string,
    msg: string
}
const users: User[] = [];
const messages: Message[] = [];

wss.on("connection", (socket, request) => {
    const url = request?.url;
    const urlParams = new URLSearchParams((url as string).split("?")[1]);
    const token = urlParams.get("token");

    if (!token) {
        wss.close();
        return
    }

    const decode = jwt.verify(token as string, JWT_SECRET);
    if (!decode || !(decode as JwtPayload).userId) {
        wss.close();
        return;
    }


    users.push({ socket, userId: (decode as JwtPayload).userId, rooms: [] });

    socket.on("message", (data) => {
        const parsedData = JSON.parse(data.toString());

        // Joining the room
        if (parsedData.type == "join_room") {
            try {
                const newUser = users.find(ele => ele.socket === socket);
                if (!newUser) return
                newUser.rooms?.push(parsedData.payload.roomId);
                socket.send(JSON.stringify({ type: "ack", payload: { msg: "User joined the room" } }));

                // temporary sending existing Messages
                socket.send(JSON.stringify({ type: "prev_chats", payload: { chats: messages } }));
            } catch (error) {
                socket.send(JSON.stringify({ type: "error", payload: { msg: "User not find" } }));
            }
        }

        if (parsedData.type === "chat") {
            console.log("Req reach here");
            users.forEach(user => {
                if (user.rooms?.includes(parsedData.payload.roomId)) {
                    user.socket.send(JSON.stringify({ type: "chat", payload: { msg: parsedData.payload.msg } }));
                    messages.push({ roomId: parsedData.payload.roomId, msg: parsedData.payload.msg })
                }
            })

            console.log("messages: ", messages);
        }
    })
})


console.log("WSS code startedi")