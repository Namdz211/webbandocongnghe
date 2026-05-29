import React from 'react';

export default function AdminModal({
    title,
    children,
    footer,
    onClose,
    size = '',
    withBackdrop = false,
}) {
    const dialogClassName = ['modal-dialog', size ? `modal-${size}` : '']
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className="modal fade show"
            style={{
                display: 'block',
                ...(withBackdrop ? { backgroundColor: 'rgba(0,0,0,0.5)' } : {}),
            }}
            tabIndex="-1"
        >
            <div className={dialogClassName}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="close" onClick={onClose}>
                            <span>&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">{children}</div>
                    {footer && <div className="modal-footer">{footer}</div>}
                </div>
            </div>
        </div>
    );
}
