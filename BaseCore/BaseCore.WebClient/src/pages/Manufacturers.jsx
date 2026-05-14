import React, { useEffect, useMemo, useState } from 'react';
import { manufacturerApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Manufacturers = () => {
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingManufacturer, setEditingManufacturer] = useState(null);
    const [formData, setFormData] = useState({ name: '' });
    const [error, setError] = useState('');
    const { isAdmin } = useAuth();

    useEffect(() => {
        loadManufacturers();
    }, []);

    const filteredManufacturers = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        if (!normalizedKeyword) {
            return manufacturers;
        }

        return manufacturers.filter((manufacturer) =>
            manufacturer.name?.toLowerCase().includes(normalizedKeyword),
        );
    }, [keyword, manufacturers]);

    const loadManufacturers = async () => {
        setLoading(true);
        try {
            const response = await manufacturerApi.getAll();
            setManufacturers(response.data || []);
        } catch (error) {
            console.error('Failed to load manufacturers:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (manufacturer = null) => {
        if (manufacturer) {
            setEditingManufacturer(manufacturer);
            setFormData({ name: manufacturer.name || '' });
        } else {
            setEditingManufacturer(null);
            setFormData({ name: '' });
        }

        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingManufacturer(null);
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        const payload = { name: formData.name.trim() };
        if (!payload.name) {
            setError('Manufacturer name is required');
            return;
        }

        try {
            if (editingManufacturer) {
                await manufacturerApi.update(editingManufacturer.id, payload);
            } else {
                await manufacturerApi.create(payload);
            }

            closeModal();
            loadManufacturers();
        } catch (error) {
            setError(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (manufacturer) => {
        if (!window.confirm(`Delete manufacturer "${manufacturer.name}"?`)) {
            return;
        }

        try {
            await manufacturerApi.delete(manufacturer.id);
            loadManufacturers();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete manufacturer');
        }
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Manufacturers Management</h1>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-header">
                            <div className="row align-items-center">
                                <div className="col-md-6">
                                    <form className="form-inline" onSubmit={(event) => event.preventDefault()}>
                                        <input
                                            type="text"
                                            className="form-control mr-2"
                                            placeholder="Search manufacturer..."
                                            value={keyword}
                                            onChange={(event) => setKeyword(event.target.value)}
                                        />
                                    </form>
                                </div>
                                <div className="col-md-6 text-right">
                                    {isAdmin() && (
                                        <button className="btn btn-success" onClick={() => openModal()}>
                                            <i className="fas fa-plus"></i> Add Manufacturer
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-striped">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '90px' }}>ID</th>
                                                    <th>Name</th>
                                                    {isAdmin() && <th style={{ width: '150px' }}>Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredManufacturers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={isAdmin() ? 3 : 2} className="text-center">
                                                            No manufacturers found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredManufacturers.map((manufacturer) => (
                                                        <tr key={manufacturer.id}>
                                                            <td>{manufacturer.id}</td>
                                                            <td>{manufacturer.name}</td>
                                                            {isAdmin() && (
                                                                <td>
                                                                    <button
                                                                        className="btn btn-sm btn-info mr-1"
                                                                        onClick={() => openModal(manufacturer)}
                                                                    >
                                                                        <i className="fas fa-edit"></i>
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-danger"
                                                                        onClick={() => handleDelete(manufacturer)}
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="text-muted">
                                        Total: {filteredManufacturers.length} manufacturers
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {showModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingManufacturer ? 'Edit Manufacturer' : 'Add Manufacturer'}
                                </h5>
                                <button type="button" className="close" onClick={closeModal}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="form-group">
                                        <label>Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.name}
                                            onChange={(event) => setFormData({ name: event.target.value })}
                                            placeholder="Apple, Samsung, Xiaomi..."
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingManufacturer ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default Manufacturers;
