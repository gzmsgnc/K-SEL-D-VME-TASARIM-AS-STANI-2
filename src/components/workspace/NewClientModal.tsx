import React, { useState } from 'react';
import { ClientFormData } from '../../types/client';
import { GlobalLocation } from '../../types/location';
import { GlobalLocationPicker } from '../map/GlobalLocationPicker';
import { useApp } from '../../store/AppContext';
import { X, UserPlus, User, Mail, Phone, Calendar, Clock, FileText } from 'lucide-react';

const INITIAL_LOCATION: GlobalLocation = {
  country: 'Türkiye',
  countryCode: 'TR',
  city: 'İstanbul',
  stateOrRegion: 'Marmara',
  placeName: 'İstanbul, Türkiye',
  latitude: 41.0082,
  longitude: 28.9784,
  timezone: 'Europe/Istanbul',
  utcOffsetMinutes: 180,
  source: 'MAP_CLICK',
};

const DEFAULT_FORM_DATA: ClientFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  birthTime: '12:00',
  isBirthTimeUnknown: false,
  birthLocation: INITIAL_LOCATION,
  motherName: '',
  notes: '',
};

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose }) => {
  const { createClientManual } = useApp();
  const [formData, setFormData] = useState<ClientFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof ClientFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const result = await createClientManual(formData);
    setIsSubmitting(false);

    if (result.success) {
      setFormData(DEFAULT_FORM_DATA);
      onClose();
    } else if (result.errors) {
      setErrors(result.errors);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-stone-100">Yeni Danışan Kaydı Ekle</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Alanı */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {errors.form && (
            <div className="p-3 text-xs bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg">
              {errors.form}
            </div>
          )}

          {/* 1. Kişisel Bilgiler */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Kişisel Bilgiler</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Ad <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Danışan adı"
                  className={`w-full px-3 py-2 text-xs bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                    errors.firstName ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
                  }`}
                />
                {errors.firstName && <p className="text-[11px] text-rose-400 mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Soyad <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Danışan soyadı"
                  className={`w-full px-3 py-2 text-xs bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                    errors.lastName ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
                  }`}
                />
                {errors.lastName && <p className="text-[11px] text-rose-400 mt-1">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-stone-500" />
                  <span>E-posta</span> <span className="text-amber-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="ornek@domain.com"
                  className={`w-full px-3 py-2 text-xs bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                    errors.email ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
                  }`}
                />
                {errors.email && <p className="text-[11px] text-rose-400 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-stone-500" />
                  <span>Telefon</span> <span className="text-amber-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+90 5XX XXX XX XX"
                  className={`w-full px-3 py-2 text-xs bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                    errors.phone ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-rose-400 mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* 2. Doğum Bilgileri */}
          <div className="space-y-3 pt-3 border-t border-stone-800">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Doğum Bilgileri (Batı / Tropical Astroloji)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Doğum Tarihi <span className="text-amber-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 text-xs bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                    errors.birthDate ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
                  }`}
                />
                {errors.birthDate && <p className="text-[11px] text-rose-400 mt-1">{errors.birthDate}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-stone-500" />
                    <span>Doğum Saati</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-stone-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBirthTimeUnknown}
                      onChange={(e) => handleChange('isBirthTimeUnknown', e.target.checked)}
                      className="rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-0 accent-amber-500"
                    />
                    <span>Saat bilinmiyor</span>
                  </label>
                </div>
                <input
                  type="time"
                  value={formData.isBirthTimeUnknown ? '' : formData.birthTime}
                  onChange={(e) => handleChange('birthTime', e.target.value)}
                  disabled={formData.isBirthTimeUnknown}
                  className="w-full px-3 py-2 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-40"
                />
                {errors.birthTime && <p className="text-[11px] text-rose-400 mt-1">{errors.birthTime}</p>}
              </div>
            </div>

            {/* Global Harita Seçici */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Global Doğum Yeri Seçimi <span className="text-amber-500">*</span>
              </label>
              <GlobalLocationPicker
                value={formData.birthLocation}
                onChange={(loc) => handleChange('birthLocation', loc)}
                error={errors.birthLocation}
              />
            </div>
          </div>

          {/* 3. Ebced ve Notlar */}
          <div className="space-y-3 pt-3 border-t border-stone-800">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Ebced ve Notlar</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Anne Adı (Ebced Analizi İçin) <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={formData.motherName}
                onChange={(e) => handleChange('motherName', e.target.value)}
                placeholder="Örn: Fatma"
                className={`w-full px-3 py-2 text-xs bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                  errors.motherName ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              {errors.motherName && <p className="text-[11px] text-rose-400 mt-1">{errors.motherName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Notlar ve Tasarım Beklentisi
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Danışan hakkında dövme fikri ve özel notlar..."
                className="w-full px-3 py-2 text-xs bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Modal Butonları */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Danışanı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
