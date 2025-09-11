import { getExistingShapes } from "./http";
import { Ellipse, Line, Rect, TextElement } from "./shapeTypes";
type Shape = Rect | Ellipse | Line;

export class Game {
    private canvas;
    private ctx;
    private roomId;
    private socket;
    private existingShapes: Shape[] = [];
    private textElements: TextElement[] = [];
    private textHandlers: any = null;
    private selectedStyle = "rect";
    private startX = 0;
    private startY = 0;
    private isDragging = false;

    constructor(canvas: HTMLCanvasElement, roomId: number, socket: WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.roomId = roomId;
        this.socket = socket;
    };

    // Initializing Canvas
    async init() {
        this.existingShapes = await getExistingShapes(this.roomId);
        this.setupSocketListeners();
        this.clearCanvasAndRender();
        this.attachEvent();
    };

    // Atteching Events on canvas
    private attachEvent() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler);
        this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    };

    // Setting socket for listening messages
    private setupSocketListeners() {
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "chat") {
                const parsedMessage = JSON.parse(data.payload.msg);
                this.existingShapes.push(parsedMessage);
                this.clearCanvasAndRender();
            }
        };
    };

    // Mouse down handler
    private mouseDownHandler = (e: MouseEvent) => {
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
    };

    // Mouse Move handler
    private mouseMoveHandler = (e: MouseEvent) => {
        if (!this.isDragging) return;
        if (!this.ctx) return;
        const width = e.clientX - this.startX;
        const height = e.clientY - this.startY;

        if (!width && !height) return;
        // clearCanvas(canvas, ctx, existingShapes);
        // ctx.strokeRect(startX, startY, width, height);
        let x1 = Math.min(this.startX, e.clientX);  // Left side (smallest X)
        let y1 = Math.min(this.startY, e.clientY);  // Top side (smallest Y)
        let x2 = Math.max(this.startX, e.clientX);  // Right side (largest X)
        let y2 = Math.max(this.startY, e.clientY);  // Bottom side (largest Y)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // drawEllipse(ctx, x1, y1, x2, y2);
        // drawArrow(ctx, startX, startY, e.clientX, e.clientY);
        this.clearCanvasAndRender();
        if (this.selectedStyle === "rect") {
            const shape: Rect = {
                type: "rect",
                x: this.startX,
                y: this.startY,
                width,
                height
            }
            this.drawRect(shape);
        } else if (this.selectedStyle === 'ellipse') {
            const shape: Ellipse = {
                type: 'ellipse',
                x1,
                y1,
                x2,
                y2
            }
            this.drawEllipse(shape);
        } else if (this.selectedStyle === 'line') {
            const shape: Line = {
                type: "line",
                fromX: this.startX,
                fromY: this.startY,
                toX: e.clientX,
                toY: e.clientY
            }
            this.drawArrow(shape)
        }
    };

    // Mouse Up Handler
    private mouseUpHandler = (e: MouseEvent) => {
        this.isDragging = false;
        const width = e.clientX - this.startX;
        const height = e.clientY - this.startY;
        let x1 = Math.min(this.startX, e.clientX);  // Left side (smallest X)
        let y1 = Math.min(this.startY, e.clientY);  // Top side (smallest Y)
        let x2 = Math.max(this.startX, e.clientX);  // Right side (largest X)
        let y2 = Math.max(this.startY, e.clientY);  // Bottom side (largest Y)

        if (!width && !height) return;
        if (!this.ctx) return;

        if (this.selectedStyle === "rect") {
            const shape: Rect = {
                type: "rect",
                x: this.startX,
                y: this.startY,
                width,
                height
            }
            this.existingShapes.push(shape);
            this.socket.send(JSON.stringify({ type: "chat", payload: { roomId: 5, msg: JSON.stringify(shape) } }))
        } else if (this.selectedStyle === 'ellipse') {
            const shape: Ellipse = {
                type: 'ellipse',
                x1,
                y1,
                x2,
                y2
            }
            this.existingShapes.push(shape)
            this.socket.send(JSON.stringify({ type: "chat", payload: { roomId: 5, msg: JSON.stringify(shape) } }))

        } else if (this.selectedStyle === 'line') {
            const shape: Line = {
                type: "line",
                fromX: this.startX,
                fromY: this.startY,
                toX: e.clientX,
                toY: e.clientY
            }
            this.existingShapes.push(shape)
            this.drawArrow(shape)
            this.socket.send(JSON.stringify({ type: "chat", payload: { roomId: 5, msg: JSON.stringify(shape) } }))
        }
    };


    // Clearing the canvas and render thigs again
    clearCanvasAndRender = () => {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = ("black")
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = "white";

        this.existingShapes.forEach(shape => {
            if (shape.type === 'rect') {
                this.drawRect(shape);
            } else if (shape.type === 'ellipse') {
                this.drawEllipse(shape)
            } else if (shape.type === 'line') {
                this.drawArrow(shape);
            }
        })

        this.drawAllText();
    };

    // Drawing Rectangle on canvas
    drawRect = (shape: Rect) => {
        this.ctx?.strokeRect(shape.x, shape.y, shape.width, shape.height);
    };

    // Drawing Ellipse on canvas
    drawEllipse = (shape: Ellipse) => {
        const x1 = shape.x1;
        const y1 = shape.y1;
        const x2 = shape.x2;
        const y2 = shape.y2;
        const ctx = this.ctx;

        if (!ctx) return;
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
        ctx.strokeStyle = 'white';
        ctx.closePath();
        ctx.stroke();
    };

    // Drawing Arrow on Canvas
    drawArrow = (shape: Line) => {
        const fromX = shape.fromX;
        const fromY = shape.fromY;
        const toX = shape.toX;
        const toY = shape.toY;
        const ctx = this.ctx;
        const arrowWidth = 10;
        const arrowLength = 15

        if (!ctx) return;

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
    };

    // ********* Text Logic: Adding, removing and updating text on canvas ***********

    // Adding Text element on Canvas
    addTextElement(textElement: TextElement) {
        this.textElements.push(textElement);
        console.log("textElement added in class: ", this.textElements);
        this.clearCanvasAndRender();
    };

    // Updating existing text element on canvas
    updateTextElement(id: string, newText: string) {
        const element = this.textElements.find(ele => ele.id === id);
        console.log("Updating new element in canvas: ", element, id, newText);
        if (element) {
            element.text = newText;
            this.clearCanvasAndRender();
        }

        this.socket.send(JSON.stringify({
            type: "text_update",
            id,
            text: newText
        }));
    };

    // Deleting Text element on canvas
    deleteTextElement(id: string) {
        this.textElements = this.textElements.filter(ele => ele.id !== id);
        this.socket.send(JSON.stringify({
            type: "text_delete",
            id
        }));
        this.clearCanvasAndRender();
    };

    // Drawing All Text elements on canvas
    drawAllText() {
        if (!this.ctx) return;

        this.textElements.forEach(ele => {
            this.ctx!.font = `${ele.fontSize}px Arial`;
            this.ctx!.fillStyle = ele.color;
            this.ctx!.fillText(ele.text, ele.x, ele.y);
        })
    };

    removeTextElement(id: string) {
        this.textElements = this.textElements.map(ele => ele.id === id ? {...ele, text: ""} : ele);
        console.log("textele canvas: ", this.textElements);
        this.clearCanvasAndRender();
    }

    // Getting Shape type
    getType() {
        return this.selectedStyle;
    };

    // Setting Shape type
    setType(type: string) {
        this.selectedStyle = type;
    };

}
