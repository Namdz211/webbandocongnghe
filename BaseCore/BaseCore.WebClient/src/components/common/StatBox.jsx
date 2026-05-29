import React from 'react';

export default function StatBox({ color, icon, label, value, footer = '\u00a0' }) {
    return (
        <div className="col-lg-3 col-6">
            <div className={`small-box bg-${color}`}>
                <div className="inner">
                    <h3 style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.2rem)', overflowWrap: 'anywhere' }}>
                        {value}
                    </h3>
                    <p>{label}</p>
                </div>
                <div className="icon">
                    <i className={icon}></i>
                </div>
                <span className="small-box-footer">{footer}</span>
            </div>
        </div>
    );
}
