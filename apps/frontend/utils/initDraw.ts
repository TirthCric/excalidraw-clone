import { BACKEND_URL } from "@repo/common/config";
import axios from "axios";
import { Game } from "./Game";

interface Shape {
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number
}
interface Rect {
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number
}
// interface Circle {
//     type: "circle",
//     centerX: number,
//     centerY: number,
//     radius: number,
//     startAngle?: number,
//     endAngle: number,
//     ccw: boolean
// }

interface Circle {
    type: "circle",
    x1: number,
    x2: number,
    y1: number,
    y2: number
}
interface Line {
    type: "line",
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
}
export default async function initDraw(canvas: HTMLCanvasElement, socket: WebSocket, roomId: number, g: Game) {
    let existingShapes: Shape[] = await getExistingShapes(roomId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return

    clearCanvas(canvas, ctx, existingShapes);

    socket.onmessage = (event) => {
        const parseData = JSON.parse(event.data);
        if (parseData.type === "chat") {
            const parseMessage = JSON.parse(parseData.payload.msg);
            existingShapes.push(parseMessage);
            clearCanvas(canvas, ctx, existingShapes);
        }

        console.log("This is first message send by default");
    }

    let startX = 0;
    let startY = 0;
    let isDragging = false;

    canvas.addEventListener("mousedown", (e: MouseEvent) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        console.log(startX, startY)
    })

    canvas.addEventListener("mousemove", (e: MouseEvent) => {
        if (!isDragging) return;
        const width = e.clientX - startX;
        const height = e.clientY - startY;
        // clearCanvas(canvas, ctx, existingShapes);
        // ctx.strokeRect(startX, startY, width, height);
        let x1 = Math.min(startX, e.clientX);  // Left side (smallest X)
        let y1 = Math.min(startY, e.clientY);  // Top side (smallest Y)
        let x2 = Math.max(startX, e.clientX);  // Right side (largest X)
        let y2 = Math.max(startY, e.clientY);  // Bottom side (largest Y)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // drawEllipse(ctx, x1, y1, x2, y2);
        // drawArrow(ctx, startX, startY, e.clientX, e.clientY);
        if (g.getType() === "rect") {
            ctx.strokeRect(startX, startY, width, height);
        } else if (g.getType() === 'circle') {
            drawEllipse(ctx, x1, y1, x2, y2)
        } else if (g.getType() === 'line') {
            drawArrow(ctx, startX, startY, e.clientX, e.clientY)
        }
    })

    canvas.addEventListener("mouseup", (e) => {
        isDragging = false;
        const width = e.clientX - startX;
        const height = e.clientY - startY;
        // existingShapes.push({ type: "rect", x: startX, y: startY, width, height})
        socket.send(JSON.stringify({ type: "chat", payload: { roomId: 5, msg: JSON.stringify({ type: "rect", x: startX, y: startY, width, height }) } }))
    })

    console.log("Existing messges: ", existingShapes);
}


function clearCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, existingShapes: Shape[]) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = ("black")
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "white";
    existingShapes.forEach(shape => {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    })
}

function parsedShapes(prevShapes: string[]) {
    return prevShapes.map(shape => JSON.parse(shape));
}

async function getExistingShapes(roomId: number) {
    try {
        // roomId = (await params).roomId;
        const response = await axios.get(`${BACKEND_URL}/chats?roomId=${roomId}`, {
            headers: {
                // Authorization: `${localStorage.getItem("token")}`
                Authorization: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRhNjg2YjU2LWM1Y2ItNDRmYi05N2U5LTlkMTE3M2QxNDI1MSIsInVzZXJuYW1lIjoiSGVsbG8iLCJ1c2VySWQiOiJkYTY4NmI1Ni1jNWNiLTQ0ZmItOTdlOS05ZDExNzNkMTQyNTEiLCJpYXQiOjE3NTczMTA3ODR9.JybklJVFPzAHurt9sdXPb6rIFS6GqR7yu4xVPWyPi_U`
            }
        })

        const shapes = parsedShapes(response?.data.chats)
        return shapes;
    } catch (error) {
        console.log("Error in getting existing shapes: ", error);
        return [];
    }

}

function selectedStyle(shape: Rect | Circle | Line, ctx: CanvasRenderingContext2D) {
    if (shape.type === "rect") {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === 'circle') {
        // ctx.beginPath();
        // ctx.arc(shape.centerX, shape.centerY, shape.radius, shape.startAngle || 0, shape.endAngle || 2 * Math.PI, shape.ccw || false);
        // ctx.stroke();
        // ctx.closePath();
        drawEllipse(ctx, shape.x1, shape.y1, shape.x2, shape.y2)
    } else if (shape.type === 'line') {
        drawArrow(ctx, shape.fromX, shape.fromY, shape.toX, shape.toY)
    }

}


function drawEllipse(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {

    var radiusX = (x2 - x1) * 0.5,   /// radius for x based on input
        radiusY = (y2 - y1) * 0.5,   /// radius for y based on input
        centerX = x1 + radiusX,      /// calc center
        centerY = y1 + radiusY,
        step = 0.01,                 /// resolution of ellipse
        a = step,                    /// counter
        pi2 = Math.PI * 2 - step;    /// end angle

    /// start a new path
    ctx.beginPath();

    /// set start point at angle 0
    ctx.moveTo(centerX + radiusX * Math.cos(0),
        centerY + radiusY * Math.sin(0));

    /// create the ellipse    
    for (; a < pi2; a += step) {
        ctx.lineTo(centerX + radiusX * Math.cos(a),
            centerY + radiusY * Math.sin(a));
    }

    /// close it and stroke it for demo
    ctx.closePath();
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, arrowWidth = 10, arrowLength = 15) {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - arrowLength * Math.cos(angle - Math.PI / 6),
        toY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - arrowLength * Math.cos(angle + Math.PI / 6),
        toY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
}

