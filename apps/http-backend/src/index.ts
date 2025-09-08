
import express from 'express';
import { userSchema } from '@repo/common/zodSchema'
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prisma } from '@repo/db/client'
import authMiddleware from './middleware';
import cors from 'cors'


const app = express();
app.use(express.json());
app.use(cors())

app.use("/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(403).json({ success: false, message: "Username and Password required" });
        }

        const parseUser = userSchema.safeParse({ username, password });
        if (!parseUser.success) {
            return res.status(403).json({ success: false, message: "Invalid username or password" });
        }

        //  database store
        try {
            await prisma.user.create({
                data: {
                    username: parseUser.data.username,
                    password: parseUser.data.password
                }
            })
            return res.status(201).json({ success: true, message: "User signup successfully!" });
        } catch (error) {
            return res.status(403).json({ success: false, message: "Username already exist" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server erorr" });
        console.log("Error in signup route: ", error)
    }
})

app.use("/signin", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(403).json({ success: false, message: "Username and Password required" });
        }

        const parseUser = userSchema.safeParse({ username, password });
        if (!parseUser.success) {
            return res.status(403).json({ success: false, message: "Invalid username or password" });
        }

        //  database Varification
        const user = await prisma.user.findFirst({
            where: {
                username,
                password
            },
            select: {
                id: true,
                username: true
            }
        });

        if (!user) {
            return res.status(403).json({ success: false, message: "Invalid username or password" });
        }
        // const user = { userId: 1 };
        const token = jwt.sign({ ...user, userId: user?.id }, JWT_SECRET);
        res.status(200).json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server erorr" });
        console.log("Error in signin route: ", error)
    }
})

app.use("/room", authMiddleware, async (req, res) => {
    try {
        const { userId, slug } = req.body;
        // roomId logic
        const room = await prisma.room.create({
            data: {
                slug,
                adminId: userId
            }
        })
        res.status(201).json({ success: true, roomId: room?.id });
    } catch (error) {
        res.status(411).json({ success: false, message: "Room already exist" });
        console.log("Error in room route: ", error)
    }
})


app.use("/chats", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        const roomId = req.query.roomId;

        console.log("roomId: ", roomId);
        console.log("userId: ", userId);

        if(!roomId) {
            return res.status(411).json({success: false, message: "Room not found"});
        }
        const chats = await prisma.chat.findMany({
            where: {
                roomId: Number(roomId),
                adminId: userId
            }
        });
        res.status(200).json({success: true, chats});
    } catch (error) {
        res.status(500).json({success: false, message: "Internal server error"});
        console.log("Error in chats route: ", error);
    }
})

app.listen(3002, () => console.log("Server started at port:3002"));


// function generateSlug() {
//     const str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890"
//     const length = str.length
//     let slug = ""

//     for (let i = 0; i < 8; i++) {
//         slug += str[Math.floor(Math.random() * length)];
//     }
//     return slug
// }