import React, { useState } from 'react';
import { ClientFormData } from '../../types/client';
import { GlobalLocation } from '../../types/location';
import { GlobalLocationPicker } from '../map/GlobalLocationPicker';
import { useApp } from '../../store/AppContext';
import { CheckCircle2, User, Mail, Phone, Calendar, Clock, Sparkles, FileText, Send } from 'lucide-react';

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

const DEFAULT_FORM_STATE: ClientFormData = {
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

export const ClientIntakeForm: React.FC = () => {
  const { submitClientForm } = useApp();
  const [formData, setFormData] = useState<ClientFormData>(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

    const result = await submitClientForm(formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsSubmitted(true);
    } else if (result.errors) {
      setErrors(result.errors);
      // İlk hatalı alana kaydır
      const firstKey = Object.keys(result.errors)[0];
      const element = document.getElementById(`field-${firstKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleResetForm = () => {
    setFormData(DEFAULT_FORM_STATE);
    setErrors({});
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-amber-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-100">
              Bilgileriniz Başarıyla Alındı
            </h2>
            <p className="text-stone-400 text-sm max-w-md mx-auto leading-relaxed">
              Kişisel bilgileriniz, global doğum koordinatlarınız ve analiz verileriniz sisteme kaydedildi.
              Dövme tasarımcınız verilerinizi inceleyerek kişiye özel tasarım konsepti ve tarifinizi hazırlayacaktır.
            </p>
          </div>

          <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl text-left text-xs space-y-1.5 max-w-md mx-auto text-stone-400">
            <div className="flex justify-between">
              <span className="text-stone-500">Danışan:</span>
              <span className="text-stone-200 font-medium">{formData.firstName} {formData.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Doğum Yeri:</span>
              <span className="text-stone-200">{formData.birthLocation.city}, {formData.birthLocation.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Astroloji Referansı:</span>
              <span className="text-stone-200">Batı / Tropical (Placidus)</span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-6 py-2.5 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
            >
              Yeni Bir Form Gönder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      {/* Başlık Alanı */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-400/90 tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Kişiye Özel Dövme Tasarımı</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif text-stone-100">
          Danışan Bilgi Formu
        </h1>
        <p className="text-stone-400 text-sm max-w-xl mx-auto leading-relaxed">
          Tasarım konseptiniz, Batı / Tropical astroloji haritanız, ebced ve sembol analizleriniz
          için lütfen aşağıdaki bilgileri eksiksiz doldurunuz.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. BÖLÜM: KİŞİSEL BİLGİLER */}
        <section className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-800">
            <User className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-stone-200">1. Kişisel Bilgiler</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div id="field-firstName">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Adınız <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Örn: Deniz"
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                  errors.firstName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              {errors.firstName && <p className="text-xs text-rose-400 mt-1">{errors.firstName}</p>}
            </div>

            <div id="field-lastName">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Soyadınız <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Örn: Yıldız"
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                  errors.lastName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              {errors.lastName && <p className="text-xs text-rose-400 mt-1">{errors.lastName}</p>}
            </div>

            <div id="field-email">
              <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                <span>E-posta Adresi</span> <span className="text-amber-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="isim@example.com"
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                  errors.email ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
            </div>

            <div id="field-phone">
              <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-500" />
                <span>Telefon Numarası</span> <span className="text-amber-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                  errors.phone ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              {errors.phone && <p className="text-xs text-rose-400 mt-1">{errors.phone}</p>}
            </div>
          </div>
        </section>

        {/* 2. BÖLÜM: DOĞUM BİLGİLERİ & BATI ASTROLOJİSİ */}
        <section className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-stone-200">2. Doğum Bilgileri (Batı / Tropical Astroloji)</h2>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">Placidus Ev Sistemi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div id="field-birthDate">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Doğum Tarihi <span className="text-amber-500">*</span>
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                  errors.birthDate ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              {errors.birthDate && <p className="text-xs text-rose-400 mt-1">{errors.birthDate}</p>}
            </div>

            <div id="field-birthTime">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span>Doğum Saati</span>
                  {!formData.isBirthTimeUnknown && <span className="text-amber-500">*</span>}
                </label>

                <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isBirthTimeUnknown}
                    onChange={(e) => handleChange('isBirthTimeUnknown', e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-amber-500"
                  />
                  <span>Doğum saatimi bilmiyorum</span>
                </label>
              </div>

              <input
                type="time"
                value={formData.isBirthTimeUnknown ? '' : formData.birthTime}
                onChange={(e) => handleChange('birthTime', e.target.value)}
                disabled={formData.isBirthTimeUnknown}
                placeholder="14:30"
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  errors.birthTime ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              {formData.isBirthTimeUnknown ? (
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Doğum saati bilinmediğinde doğum haritası öğle saati referansıyla ve ev sınırları dikkate alınarak değerlendirilecektir.
                </p>
              ) : (
                errors.birthTime && <p className="text-xs text-rose-400 mt-1">{errors.birthTime}</p>
              )}
            </div>
          </div>

          {/* Global Harita Tabanlı Doğum Yeri Seçimi */}
          <div id="field-birthLocation" className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-stone-300">
                Global Doğum Yeri (Harita Üzerinden Seçim) <span className="text-amber-500">*</span>
              </label>
              <span className="text-[11px] text-stone-500">Dünya genelindeki tüm şehirler desteklenir</span>
            </div>

            <GlobalLocationPicker
              value={formData.birthLocation}
              onChange={(loc) => handleChange('birthLocation', loc)}
              error={errors.birthLocation}
            />
          </div>
        </section>

        {/* 3. BÖLÜM: EBCED VE DİĞER BİLGİLER */}
        <section className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-800">
            <FileText className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-stone-200">3. Ebced ve Tasarım Talepleri</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div id="field-motherName" className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Anne Adınız (Ebced Analizi İçin) <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={formData.motherName}
                onChange={(e) => handleChange('motherName', e.target.value)}
                placeholder="Örn: Fatma, Ayşe, Gül..."
                className={`w-full px-3.5 py-2.5 text-sm bg-stone-950 border rounded-lg text-stone-100 focus:outline-none transition-colors ${
                  errors.motherName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-800 focus:border-amber-500'
                }`}
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Ebced sisteminde gezegensel ve harfsel rezonans hesaplamaları için anne adı esastır.
              </p>
              {errors.motherName && <p className="text-xs text-rose-400 mt-1">{errors.motherName}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Dövme Fikri, İstenen Semboller veya Özel Notlarınız (Opsiyonel)
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Örneğin: İç kol bölgesinde minimal fine-line tarzda kutsal geometri veya şahin motifi düşünüyorum..."
                className="w-full px-3.5 py-2.5 text-sm bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Gönder Butonu */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-semibold text-sm rounded-xl shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                <span>Form Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Danışan Bilgi Formunu Gönder</span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-stone-500 mt-3">
            Bilgileriniz yalnızca kişisel dövme tasarım analiziniz için kullanılmakta olup gizli tutulur.
          </p>
        </div>
      </form>
    </div>
  );
};
