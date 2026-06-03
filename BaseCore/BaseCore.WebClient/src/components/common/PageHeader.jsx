import React from 'react';

export default function PageHeader({ title, activeLabel }) {
    return (
        <div className="content-header">
            <div className="container-fluid">
                <div className="row mb-2">
                    <div className="col-sm-6">
                        <h1 className="m-0">{title}</h1>
                    </div>
                    {activeLabel && (
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-right">
                                <li className="breadcrumb-item"><a href="/">Trang chủ</a></li>
                                <li className="breadcrumb-item active">{activeLabel}</li>
                            </ol>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
