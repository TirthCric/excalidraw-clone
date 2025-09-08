
import React, { ReactNode } from 'react'

const ToobarButton = ({ icon, isActive, onClick }: { icon: ReactNode, isActive: boolean, onClick: () => void }) => {
    return (
        <button onClick={onClick} className={`border-none outline-none cursor-pointer p-2 rounded-md text-white ${isActive ? "bg-secondary" : "hover:bg-[#323245]"}`}>
            <span>{icon}</span>
        </button>
    )
}

export default ToobarButton