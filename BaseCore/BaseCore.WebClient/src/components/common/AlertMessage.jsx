import React from 'react';

export default function AlertMessage({ children, type = 'danger' }) {
    if (!children) {
        return null;
    }

    return (
        <div className={`alert alert-${type}`}>
            {children}
        </div>
    );
}
