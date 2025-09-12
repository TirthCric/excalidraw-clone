import { getExistingShapes } from "./http";
import { Ellipse, Line, Rect, TextElement } from "./shapeTypes";
type Shape = Rect | Ellipse | Line;

interface ResizeHandle {
    x: number;
    y: number;
    cursor: string;
    direction: string;
}

export class Game {
    private canvas;
    private ctx;
    private roomId;
    private socket;
    private existingShapes: Shape[] = [];
    private textElements: TextElement[] = [];
    private textHandlers: any = null;
    private selectedStyle = "select";
    private startX = 0;
    private startY = 0;
    private isDragging = false;

    // Selection and manipulation state
    private selectedShape: Shape | null = null;
    private selectedShapeIndex = -1;
    private isSelectionMode = false;
    private isDraggingShape = false;
    private isResizing = false;
    private resizeHandle = "";
    private dragOffsetX = 0;
    private dragOffsetY = 0;
    private resizeHandles: ResizeHandle[] = [];
    private handleSize = 8;

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
        this.canvas.addEventListener("keydown", this.keyDownHandler);
        // Make canvas focusable for keyboard events
        this.canvas.setAttribute("tabindex", "0");
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
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on resize handle
        if (this.selectedShape && this.selectedStyle === "select") {
            const handle = this.getResizeHandle(x, y);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.startX = x;
                this.startY = y;
                return;
            }
        }

        // Check if clicking on existing shape
        let clickedShape: Shape | null = null;
        let clickedIndex = -1;

        // Check from top to bottom (reverse order for proper selection)
        for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            if (this.isPointInShape(x, y, this.existingShapes[i])) {
                clickedShape = this.existingShapes[i];
                clickedIndex = i;
                break;
            }
        }

        if (clickedShape && this.selectedStyle === "select") {
            // Select and prepare for dragging
            this.selectedShape = clickedShape;
            this.selectedShapeIndex = clickedIndex;
            this.resizeHandles = this.generateResizeHandles(clickedShape);
            this.isDraggingShape = true;
            this.isSelectionMode = true;

            // Calculate drag offset
            switch (clickedShape.type) {
                case 'rect':
                    this.dragOffsetX = x - clickedShape.x;
                    this.dragOffsetY = y - clickedShape.y;
                    break;
                case 'ellipse':
                    this.dragOffsetX = x - (clickedShape.x1 + clickedShape.x2) / 2;
                    this.dragOffsetY = y - (clickedShape.y1 + clickedShape.y2) / 2;
                    break;
                case 'line':
                    this.dragOffsetX = x - clickedShape.fromX;
                    this.dragOffsetY = y - clickedShape.fromY;
                    break;
            }
            this.clearCanvasAndRender();
            return;
        }

        // No shape clicked, deselect and start drawing new shape
        this.selectedShape = null;
        this.selectedShapeIndex = -1;
        this.resizeHandles = [];
        this.isSelectionMode = false;

        this.isDragging = true;
        this.startX = x;
        this.startY = y;
        this.clearCanvasAndRender();
    };

    // Mouse Move handler
    private mouseMoveHandler = (e: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update cursor based on hover state
        this.updateCursor(x, y);

        if (this.isResizing && this.selectedShape) {
            this.handleResize(x, y);
            return;
        }

        if (this.isDraggingShape && this.selectedShape) {
            this.handleShapeDrag(x, y);
            return;
        }

        if (!this.isDragging) return;
        if (!this.ctx) return;

        const width = x - this.startX;
        const height = y - this.startY;

        if (!width && !height) return;

        let x1 = Math.min(this.startX, x);
        let y1 = Math.min(this.startY, y);
        let x2 = Math.max(this.startX, x);
        let y2 = Math.max(this.startY, y);

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
                toX: x,
                toY: y
            }
            this.drawArrow(shape);
        }
    };

    // Mouse Up Handler
    private mouseUpHandler = (e: MouseEvent) => {
        if (this.isResizing || this.isDraggingShape) {
            // Send update to server for moved/resized shapes
            if (this.selectedShape) {
                this.socket.send(JSON.stringify({
                    type: "shape_update",
                    payload: {
                        roomId: this.roomId,
                        index: this.selectedShapeIndex,
                        shape: this.selectedShape
                    }
                }));
            }
            this.isResizing = false;
            this.isDraggingShape = false;
            this.resizeHandle = "";
            return;
        }

        if (!this.isDragging) return;

        this.isDragging = false;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = x - this.startX;
        const height = y - this.startY;

        if (!width && !height) return;
        if (!this.ctx) return;

        let x1 = Math.min(this.startX, x);
        let y1 = Math.min(this.startY, y);
        let x2 = Math.max(this.startX, x);
        let y2 = Math.max(this.startY, y);

        if (this.selectedStyle === "rect") {
            const shape: Rect = {
                type: "rect",
                x: this.startX,
                y: this.startY,
                width,
                height
            }
            this.existingShapes.push(shape);
            this.socket.send(JSON.stringify({ type: "chat", payload: { roomId: this.roomId, msg: JSON.stringify(shape) } }))
        } else if (this.selectedStyle === 'ellipse') {
            const shape: Ellipse = {
                type: 'ellipse',
                x1,
                y1,
                x2,
                y2
            }
            this.existingShapes.push(shape);
            this.socket.send(JSON.stringify({ type: "chat", payload: { roomId: this.roomId, msg: JSON.stringify(shape) } }))
        } else if (this.selectedStyle === 'line') {
            const shape: Line = {
                type: "line",
                fromX: this.startX,
                fromY: this.startY,
                toX: x,
                toY: y
            }
            this.existingShapes.push(shape);
            this.socket.send(JSON.stringify({ type: "chat", payload: { roomId: this.roomId, msg: JSON.stringify(shape) } }))
        }
    };

    // Keyboard handler for deleting selected shapes
    private keyDownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selectedShape && this.selectedShapeIndex >= 0) {
                this.existingShapes.splice(this.selectedShapeIndex, 1);
                this.selectedShape = null;
                this.selectedShapeIndex = -1;
                this.resizeHandles = [];
                this.clearCanvasAndRender();

                this.socket.send(JSON.stringify({
                    type: "shape_delete",
                    payload: {
                        roomId: this.roomId,
                        index: this.selectedShapeIndex
                    }
                }));
            }
        } else if (e.key === 'Escape') {
            this.selectedShape = null;
            this.selectedShapeIndex = -1;
            this.resizeHandles = [];
            this.clearCanvasAndRender();
        }
    };

    // check if point is inside a shape
    private isPointInShape(x: number, y: number, shape: Shape): boolean {

        switch (shape.type) {
            case "rect":
                return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;

            case "ellipse":
                const centerX = (shape.x1 + shape.x2) / 2;
                const centerY = (shape.y1 + shape.y2) / 2;
                const radiusX = Math.abs(shape.x2 - shape.x1) / 2;
                const radiusY = Math.abs(shape.y2 - shape.y1) / 2;

                const normalizedX = (x - centerX) / radiusX;
                const normalizedY = (y - centerY) / radiusY;
                return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;

            case 'line':
                // Check if point is near the line (within 10 pixels)
                const distanceToLine = this.pointToLineDistance(x, y, shape.fromX, shape.fromY, shape.toX, shape.toY);
                return distanceToLine <= 10;

            default:
                return false;

        }
        return false;
    }

    // Calculate distance from point to line
    private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) return Math.sqrt(A * A + B * B);

        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));

        const xx = x1 + param * C;
        const yy = y1 + param * D;

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Generate resize handles for selected shape
    private generateResizeHandles(shape: Shape): ResizeHandle[] {
        const handles: ResizeHandle[] = [];

        switch (shape.type) {
            case 'rect':
                const x = shape.x;
                const y = shape.y;
                const w = shape.width;
                const h = shape.height;

                handles.push(
                    { x: x, y: y, cursor: 'nw-resize', direction: 'nw' },
                    { x: x + w / 2, y: y, cursor: 'n-resize', direction: 'n' },
                    { x: x + w, y: y, cursor: 'ne-resize', direction: 'ne' },
                    { x: x + w, y: y + h / 2, cursor: 'e-resize', direction: 'e' },
                    { x: x + w, y: y + h, cursor: 'se-resize', direction: 'se' },
                    { x: x + w / 2, y: y + h, cursor: 's-resize', direction: 's' },
                    { x: x, y: y + h, cursor: 'sw-resize', direction: 'sw' },
                    { x: x, y: y + h / 2, cursor: 'w-resize', direction: 'w' }
                );
                break;

            case 'ellipse':
                const centerX = (shape.x1 + shape.x2) / 2;
                const centerY = (shape.y1 + shape.y2) / 2;
                const radiusX = Math.abs(shape.x2 - shape.x1) / 2;
                const radiusY = Math.abs(shape.y2 - shape.y1) / 2;

                handles.push(
                    { x: shape.x1, y: shape.y1, cursor: 'nw-resize', direction: 'nw' },
                    { x: centerX, y: shape.y1, cursor: 'n-resize', direction: 'n' },
                    { x: shape.x2, y: shape.y1, cursor: 'ne-resize', direction: 'ne' },
                    { x: shape.x2, y: centerY, cursor: 'e-resize', direction: 'e' },
                    { x: shape.x2, y: shape.y2, cursor: 'se-resize', direction: 'se' },
                    { x: centerX, y: shape.y2, cursor: 's-resize', direction: 's' },
                    { x: shape.x1, y: shape.y2, cursor: 'sw-resize', direction: 'sw' },
                    { x: shape.x1, y: centerY, cursor: 'w-resize', direction: 'w' }
                );
                break;

            case 'line':
                handles.push(
                    { x: shape.fromX, y: shape.fromY, cursor: 'move', direction: 'start' },
                    { x: shape.toX, y: shape.toY, cursor: 'move', direction: 'end' }
                );
                break;
        }

        return handles;
    }

    // Check if point is on a resize handle
    private getResizeHandle(x: number, y: number): string {
        for (const handle of this.resizeHandles) {
            if (x >= handle.x - this.handleSize / 2 && x <= handle.x + this.handleSize / 2 &&
                y >= handle.y - this.handleSize / 2 && y <= handle.y + this.handleSize / 2) {
                return handle.direction;
            }
        }
        return "";
    }

    // Handle shape dragging
    private handleShapeDrag(x: number, y: number) {
        if (!this.selectedShape) return;

        const newX = x - this.dragOffsetX;
        const newY = y - this.dragOffsetY;

        switch (this.selectedShape.type) {
            case 'rect':
                this.selectedShape.x = newX;
                this.selectedShape.y = newY;
                break;

            case 'ellipse':
                const width = this.selectedShape.x2 - this.selectedShape.x1;
                const height = this.selectedShape.y2 - this.selectedShape.y1;
                this.selectedShape.x1 = newX - width / 2;
                this.selectedShape.y1 = newY - height / 2;
                this.selectedShape.x2 = newX + width / 2;
                this.selectedShape.y2 = newY + height / 2;
                break;

            case 'line':
                const deltaX = newX - this.selectedShape.fromX;
                const deltaY = newY - this.selectedShape.fromY;
                this.selectedShape.fromX = newX;
                this.selectedShape.fromY = newY;
                this.selectedShape.toX += deltaX;
                this.selectedShape.toY += deltaY;
                break;
        }

        this.resizeHandles = this.generateResizeHandles(this.selectedShape);
        this.existingShapes[this.selectedShapeIndex] = this.selectedShape;
        this.clearCanvasAndRender();
    }

    // Handle shape resizing
    private handleResize(x: number, y: number) {
        if (!this.selectedShape) return;

        switch (this.selectedShape.type) {
            case 'rect':
                this.resizeRect(x, y);
                break;
            case 'ellipse':
                this.resizeEllipse(x, y);
                break;
            case 'line':
                this.resizeLine(x, y);
                break;
        }

        this.resizeHandles = this.generateResizeHandles(this.selectedShape);
        this.existingShapes[this.selectedShapeIndex] = this.selectedShape;
        this.clearCanvasAndRender();
    }

    // Resize rectangle
    private resizeRect(deltaX: number, deltaY: number) {
        const rect = this.selectedShape as Rect;
        const originalX = rect.x;
        const originalY = rect.y;
        const originalWidth = rect.width;
        const originalHeight = rect.height;

        switch (this.resizeHandle) {
            case 'nw':
                rect.x = deltaX;
                rect.y = deltaY;
                rect.width = originalWidth - (deltaX - originalX);
                rect.height = originalHeight - (deltaY - originalY);
                break;
            case 'n':
                rect.y = deltaY;
                rect.height = originalHeight - (deltaY - originalY);
                break;
            case 'ne':
                rect.y = deltaY;
                rect.width = deltaX - originalX;
                rect.height = originalHeight - (deltaY - originalY);
                break;
            case 'e':
                rect.width = deltaX - originalX;
                break;
            case 'se':
                rect.width = deltaX - originalX;
                rect.height = deltaY - originalY;
                break;
            case 's':
                rect.height = deltaY - originalY;
                break;
            case 'sw':
                rect.x = deltaX;
                rect.width = originalWidth - (deltaX - originalX);
                rect.height = deltaY - originalY;
                break;
            case 'w':
                rect.x = deltaX;
                rect.width = originalWidth - (deltaX - originalX);
                break;
        }
    }

    // Resize ellipse
    private resizeEllipse(deltaX: number, deltaY: number) {
        const ellipse = this.selectedShape as Ellipse;

        switch (this.resizeHandle) {
            case 'nw':
                ellipse.x1 = deltaX;
                ellipse.y1 = deltaY;
                break;
            case 'n':
                ellipse.y1 = deltaY;
                break;
            case 'ne':
                ellipse.x2 = deltaX;
                ellipse.y1 = deltaY;
                break;
            case 'e':
                ellipse.x2 = deltaX;
                break;
            case 'se':
                ellipse.x2 = deltaX;
                ellipse.y2 = deltaY;
                break;
            case 's':
                ellipse.y2 = deltaY;
                break;
            case 'sw':
                ellipse.x1 = deltaX;
                ellipse.y2 = deltaY;
                break;
            case 'w':
                ellipse.x1 = deltaX;
                break;
        }

        // Ensure minimum size
        if (Math.abs(ellipse.x2 - ellipse.x1) < 20) {
            if (this.resizeHandle.includes('e')) {
                ellipse.x2 = ellipse.x1 + 20;
            } else if (this.resizeHandle.includes('w')) {
                ellipse.x1 = ellipse.x2 - 20;
            }
        }
        if (Math.abs(ellipse.y2 - ellipse.y1) < 20) {
            if (this.resizeHandle.includes('s')) {
                ellipse.y2 = ellipse.y1 + 20;
            } else if (this.resizeHandle.includes('n')) {
                ellipse.y1 = ellipse.y2 - 20;
            }
        }
    }

    // Resize line
    private resizeLine(x: number, y: number) {
        const line = this.selectedShape as Line;

        if (this.resizeHandle === 'start') {
            line.fromX = x;
            line.fromY = y;
        } else if (this.resizeHandle === 'end') {
            line.toX = x;
            line.toY = y;
        }
    }

    // Update cursor based on hover state
    private updateCursor(x: number, y: number) {
        let cursor = 'default';

        if (this.selectedShape) {
            const handle = this.getResizeHandle(x, y);
            if (handle) {
                const handleObj = this.resizeHandles.find(h => h.direction === handle);
                cursor = handleObj?.cursor || 'default';
            } else if (this.isPointInShape(x, y, this.selectedShape)) {
                cursor = 'move';
            }
        }

        this.canvas.style.cursor = cursor;
    }

    // Draw selection outline and resize handles
    private drawSelection() {
        if (!this.selectedShape || !this.ctx) return;
        console.log("Draw Section run...");
        this.ctx.save();
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        // Draw selection outline
        switch (this.selectedShape.type) {
            case 'rect':
                this.ctx.strokeRect(this.selectedShape.x - 4, this.selectedShape.y - 4,
                    this.selectedShape.width + 4, this.selectedShape.height + 4);
                break;
            case 'ellipse':
                const centerX = (this.selectedShape.x1 + this.selectedShape.x2) / 2;
                const centerY = (this.selectedShape.y1 + this.selectedShape.y2) / 2;
                const radiusX = Math.abs(this.selectedShape.x2 - this.selectedShape.x1) / 2 + 2;
                const radiusY = Math.abs(this.selectedShape.y2 - this.selectedShape.y1) / 2 + 2;

                this.ctx.beginPath();
                this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;
        }

        this.ctx.restore();

        // Draw resize handles
        this.ctx.save();
        this.ctx.fillStyle = '#007ACC';
        // this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);

        for (const handle of this.resizeHandles) {
            this.ctx.fillRect(handle.x - this.handleSize / 2, handle.y - this.handleSize / 2,
                this.handleSize, this.handleSize);
            this.ctx.strokeRect(handle.x - this.handleSize / 2, handle.y - this.handleSize / 2,
                this.handleSize, this.handleSize);
        }

        this.ctx.restore();
    }


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
        this.drawSelection();
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
        this.textElements = this.textElements.map(ele => ele.id === id ? { ...ele, text: "" } : ele);
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

    // Enable selection mode
    enableSelectionMode() {
        this.isSelectionMode = true;
        this.selectedStyle = "select";
    }

    // Disable selection mode
    disableSelectionMode() {
        this.isSelectionMode = false;
        this.selectedShape = null;
        this.selectedShapeIndex = -1;
        this.resizeHandles = [];
        this.clearCanvasAndRender();
    }

}
