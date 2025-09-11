
"use client"

import { useEffect, useRef, useState } from "react"

interface TextElement {
    id: string,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    isEditing?: boolean
}

const AddText = () => {
    const [isEditingText, setIsEditingText] = useState(false);
    const [editingTextId, setEditingTextId] = useState<string | null>(null)
    const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
    const [textElement, setTextElement] = useState<TextElement[]>([]);

    const textInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const g = {};
        // g.setTextHandlers({
        //     onTextCreate: handleTextCreate,
        //     onTextUpdate: handleTextUpdate,
        //     TextElements: TextElements 
        // });

    }, [])
    return (
        <div>
            <input ref={textInputRef} type="text" />
        </div>
    )
}

export default AddText