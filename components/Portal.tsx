import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const el = useRef<HTMLDivElement | null>(null);
    if (!el.current) el.current = document.createElement('div');

    useEffect(() => {
        const node = el.current!;
        document.body.appendChild(node);
        return () => { document.body.removeChild(node); };
    }, []);

    return createPortal(children, el.current);
};
