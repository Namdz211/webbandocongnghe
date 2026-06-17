import React, { useEffect, useMemo, useState } from 'react';
import { AlertMessage, LoadingState, PageHeader } from '../../components/common';
import { manufacturerApi } from '../../services';
import { useAuth } from '../../auth/AuthContext';

/**
 * MẬT ĐỘ THÔNG TIN (VISUAL_DENSITY: 5)
 * Trang hiển thị bảng quản lý nhà sản xuất thương hiệu ở mức độ mật độ thông tin trung bình.
 * Bảng dữ liệu tập trung vào ID và Tên nhà sản xuất để dễ dàng đọc và quản lý.
 * 
 * ĐỒNG NHẤT HÌNH HỌC (SHAPE CONSISTENCY LOCK)
 * Các nút bấm "Thêm nhà sản xuất", nút thao tác sửa/xóa và các ô input tìm kiếm
 * tuân thủ bo góc nhẹ tiêu chuẩn của hệ thống (border-radius: 4px).
 * 
 * TRẠNG THÁI TƯƠNG TÁC (INTERACTIVE STATES)
 * Dòng trong bảng hover nhạt, các nút bấm thao tác có tooltip và hover chuyển màu rõ ràng.
 */
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
            setError('Vui lòng nhập tên nhà sản xuất');
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
            setError(error.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const handleDelete = async (manufacturer) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà sản xuất "${manufacturer.name}" không?`)) {
            return;
        }

        try {
            await manufacturerApi.delete(manufacturer.id);
            loadManufacturers();
        } catch (error) {
            alert(error.response?.data?.message || 'Xóa nhà sản xuất thất bại');
        }
    };

    return (
        <div className="content-wrapper">
            <PageHeader title="Quản lý nhà sản xuất" />

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
                                            placeholder="Tìm nhà sản xuất..."
                                            value={keyword}
                                            onChange={(event) => setKeyword(event.target.value)}
                                        />
                                    </form>
                                </div>
                                <div className="col-md-6 text-right">
                                    {isAdmin() && (
                                        <button className="btn btn-success" onClick={() => openModal()}>
                                            <i className="fas fa-plus"></i> Thêm nhà sản xuất
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            {/* TRẠNG THÁI TẢI DỮ LIỆU (LOADING STATE): hiển thị skeleton loader khi đang call API */}
                            {loading ? (
                                <LoadingState />
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-striped">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '90px' }}>ID</th>
                                                    <th>Tên</th>
                                                    {isAdmin() && <th style={{ width: '150px' }}>Thao tác</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredManufacturers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={isAdmin() ? 3 : 2} className="text-center">
                                                            Không tìm thấy nhà sản xuất
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
                                        Tổng: {filteredManufacturers.length} nhà sản xuất
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* THIẾT KẾ MODAL NHẬP LIỆU (MODAL LAYOUT)
                Layout đơn giản, tập trung tiêu điểm vào ô input tên nhà sản xuất,
                sử dụng backdrop mờ để tập trung sự chú ý của người quản trị. */}
            {showModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingManufacturer ? 'Chỉnh sửa nhà sản xuất' : 'Thêm nhà sản xuất'}
                                </h5>
                                <button type="button" className="close" onClick={closeModal}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <AlertMessage>{error}</AlertMessage>
                                    <div className="form-group">
                                        <label>Tên nhà sản xuất</label>
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
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingManufacturer ? 'Cập nhật' : 'Tạo mới'}
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
