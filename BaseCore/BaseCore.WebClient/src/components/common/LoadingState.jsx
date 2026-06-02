import React from 'react';

export default function LoadingState({ className = 'py-5' }) {
    return (
        <div className={`text-center ${className}`}>
            <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Đang tải...</span>
            </div>
        </div>
    );
}
