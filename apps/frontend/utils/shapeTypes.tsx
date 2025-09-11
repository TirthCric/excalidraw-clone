export interface Rect {
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number
}

export interface Ellipse {
    type: "ellipse",
    x1: number,
    x2: number,
    y1: number,
    y2: number
}

export interface Line {
    type: "line",
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
}

export interface TextElement {
    id: string,
    type: string,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    isEditing?: boolean
}