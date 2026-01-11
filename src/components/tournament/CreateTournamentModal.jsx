import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, Users, MapPin, DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createTournament, updateTournament } from '../../services/firestoreService';

const CreateTournamentModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sportType: 'FOOTBALL',
        format: 'KNOCKOUT',
        teamSize: 7,
        maxTeams: 8,
        entryFee: 500,
        prizePool: 5000,
        startDate: '',
        registrationDeadline: '',
        location: '',
        status: 'registration_open'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                sportType: initialData.sportType || 'FOOTBALL',
                format: initialData.format || 'KNOCKOUT',
                teamSize: initialData.teamSize || 7,
                maxTeams: initialData.maxTeams || 8,
                entryFee: initialData.entryFee || 0,
                prizePool: initialData.prizePool || 0,
                startDate: initialData.startDate?.toDate ? initialData.startDate.toDate().toISOString().split('T')[0] : (initialData.startDate || ''),
                registrationDeadline: initialData.registrationDeadline?.toDate ? initialData.registrationDeadline.toDate().toISOString().split('T')[0] : (initialData.registrationDeadline || ''),
                location: initialData.location || '',
                status: initialData.status || 'registration_open'
            });
        }
    }, [initialData]);

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            sportType: 'FOOTBALL',
            format: 'KNOCKOUT',
            teamSize: 7,
            maxTeams: 8,
            entryFee: 500,
            prizePool: 5000,
            startDate: '',
            registrationDeadline: '',
            location: '',
            status: 'registration_open'
        });
        setError(null);
        setSuccess(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        if (!currentUser) {
            setError('Giriş yapmanız gerekiyor');
            return;
        }

        if (!formData.name.trim() || !formData.startDate || !formData.registrationDeadline) {
            setError('Lütfen zorunlu alanları doldurun');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const tournamentData = {
                ...formData,
                name: formData.name.trim(),
                description: formData.description.trim(),
                teamSize: Number(formData.teamSize),
                maxTeams: Number(formData.maxTeams),
                entryFee: Number(formData.entryFee),
                prizePool: Number(formData.prizePool),
                startDate: new Date(formData.startDate),
                registrationDeadline: new Date(formData.registrationDeadline),
                // Add owner info if new
                ...(!initialData ? {
                    organizerId: currentUser.uid,
                    organizerName: currentUser.displayName || 'Anonim',
                    registeredTeams: 0,
                    createdAt: new Date()
                } : {})
            };

            let result;
            if (initialData) {
                result = await updateTournament(initialData.id, tournamentData);
            } else {
                result = await createTournament(tournamentData);
            }

            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    resetForm();
                    onSuccess?.();
                    onClose();
                }, 1500);
            } else {
                setError(result.error || 'İşlem başarısız');
            }
        } catch (err) {
            setError('Bir hata oluştu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white rounded-t-2xl z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Trophy size={28} />
                            <div>
                                <h2 className="text-xl font-bold">{initialData ? 'Turnuvayı Düzenle' : 'Yeni Turnuva Oluştur'}</h2>
                                <p className="text-yellow-100 text-sm">Turnuvanızı planlayın</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Success State */}
                {success && (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} className="text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{initialData ? 'Güncellendi!' : 'Oluşturuldu!'}</h3>
                        <p className="text-gray-500">İşleminiz başarıyla tamamlandı.</p>
                    </div>
                )}

                {/* Form */}
                {!success && (
                    <div className="p-6 space-y-6">
                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Tournament Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Turnuva Adı *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Örn: İstanbul Kış Kupası 2024"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Açıklama
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Turnuva hakkında bilgi, kurallar..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 resize-none"
                            />
                        </div>

                        {/* Location */}
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Konum / Tesis
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Örn: Mega Halısaha, Şişli"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                            />
                        </div>


                        {/* Sport Type & Format */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Spor Türü
                                </label>
                                <select
                                    name="sportType"
                                    value={formData.sportType}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 bg-white"
                                >
                                    <option value="FOOTBALL">Futbol</option>
                                    <option value="BASKETBALL">Basketbol</option>
                                    <option value="VOLLEYBALL">Voleybol</option>
                                    <option value="TENNIS">Tenis</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Format
                                </label>
                                <select
                                    name="format"
                                    value={formData.format}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 bg-white"
                                >
                                    <option value="KNOCKOUT">Elemeli (Knockout)</option>
                                    <option value="LEAGUE">Lig Formatı</option>
                                    <option value="GROUP_KNOCKOUT">Grup + Eleme</option>
                                </select>
                            </div>
                        </div>

                        {/* Team Size & Max Teams */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Takım Büyüklüğü
                                </label>
                                <select
                                    name="teamSize"
                                    value={formData.teamSize}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 bg-white"
                                >
                                    <option value={5}>5 kişi (5v5)</option>
                                    <option value={6}>6 kişi (6v6)</option>
                                    <option value={7}>7 kişi (7v7)</option>
                                    <option value={11}>11 kişi (11v11)</option>
                                    <option value={1}>Bireysel</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Maksimum Takım Sayısı
                                </label>
                                <select
                                    name="maxTeams"
                                    value={formData.maxTeams}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 bg-white"
                                >
                                    <option value={4}>4 Takım</option>
                                    <option value={8}>8 Takım</option>
                                    <option value={16}>16 Takım</option>
                                    <option value={32}>32 Takım</option>
                                    <option value={64}>64 Takım</option>
                                </select>
                            </div>
                        </div>

                        {/* Entry Fee & Prize Pool */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Katılım Ücreti (₺)
                                </label>
                                <input
                                    type="number"
                                    name="entryFee"
                                    value={formData.entryFee}
                                    onChange={handleChange}
                                    min={0}
                                    step={50}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ödül Havuzu (₺)
                                </label>
                                <input
                                    type="number"
                                    name="prizePool"
                                    value={formData.prizePool}
                                    onChange={handleChange}
                                    min={0}
                                    step={500}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kayıt Son Tarihi *
                                </label>
                                <input
                                    type="date"
                                    name="registrationDeadline"
                                    value={formData.registrationDeadline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Başlangıç Tarihi *
                                </label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                />
                            </div>
                        </div>

                        {/* Status (Only for edit) */}
                        {initialData && (
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Durum
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 bg-white"
                                >
                                    <option value="draft">Taslak</option>
                                    <option value="registration_open">Kayıtlar Açık</option>
                                    <option value="ongoing">Devam Ediyor</option>
                                    <option value="completed">Tamamlandı</option>
                                    <option value="cancelled">İptal Edildi</option>
                                </select>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !formData.name.trim() || !formData.startDate || !formData.registrationDeadline}
                                className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-500/30"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        İşleniyor...
                                    </>
                                ) : (
                                    <>
                                        <Trophy size={18} />
                                        {initialData ? 'Güncelle' : 'Turnuva Oluştur'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateTournamentModal;
