import { ClientFormData } from '../types/client';

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorList: ValidationErrorItem[];
}

/**
 * Danışan Bilgi Formu Doğrulama Fonksiyonu
 * Bütün hata mesajları saf Türkçe, açık ve yönlendiricidir.
 */
export function validateClientFormData(data: ClientFormData): ValidationResult {
  const errors: Record<string, string> = {};
  const errorList: ValidationErrorItem[] = [];

  const addError = (field: string, message: string) => {
    errors[field] = message;
    errorList.push({ field, message });
  };

  // 1. Ad Kontrolü
  if (!data.firstName || data.firstName.trim().length < 2) {
    addError('firstName', 'Lütfen geçerli bir ad giriniz (en az 2 karakter).');
  }

  // 2. Soyad Kontrolü
  if (!data.lastName || data.lastName.trim().length < 2) {
    addError('lastName', 'Lütfen geçerli bir soyad giriniz (en az 2 karakter).');
  }

  // 3. E-posta Kontrolü
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email.trim())) {
    addError('email', 'Lütfen geçerli bir e-posta adresi giriniz (örnek: isim@domain.com).');
  }

  // 4. Telefon Kontrolü
  const cleanPhone = data.phone ? data.phone.replace(/[\s()-]/g, '') : '';
  if (!cleanPhone || cleanPhone.length < 7) {
    addError('phone', 'Lütfen geçerli bir telefon numarası giriniz.');
  }

  // 5. Doğum Tarihi Kontrolü
  if (!data.birthDate) {
    addError('birthDate', 'Doğum tarihi seçilmesi zorunludur.');
  } else {
    const parsedDate = new Date(data.birthDate);
    const now = new Date();
    if (isNaN(parsedDate.getTime())) {
      addError('birthDate', 'Geçersiz doğum tarihi formatı.');
    } else if (parsedDate > now) {
      addError('birthDate', 'Doğum tarihi gelecekte bir tarih olamaz.');
    } else {
      const year = parsedDate.getFullYear();
      if (year < 1900) {
        addError('birthDate', 'Lütfen 1900 yılından sonra geçerli bir doğum yılı giriniz.');
      }
    }
  }

  // 6. Doğum Saati Kontrolü (Doğum saati bilinmiyorsa kontrol zorunlu değildir)
  if (!data.isBirthTimeUnknown) {
    if (!data.birthTime || !/^\d{2}:\d{2}$/.test(data.birthTime)) {
      addError('birthTime', 'Doğum saati bilinmiyorsa "Doğum saatimi bilmiyorum" seçeneğini işaretleyiniz veya geçerli bir saat (SS:DD) giriniz.');
    } else {
      const [hh, mm] = data.birthTime.split(':').map(Number);
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
        addError('birthTime', 'Doğum saati 00:00 ile 23:59 arasında olmalıdır.');
      }
    }
  }

  // 7. Global Doğum Konumu Kontrolü
  if (!data.birthLocation) {
    addError('birthLocation', 'Harita üzerinden doğum yeri seçilmesi zorunludur.');
  } else {
    const loc = data.birthLocation;
    if (typeof loc.latitude !== 'number' || isNaN(loc.latitude) || loc.latitude < -90 || loc.latitude > 90) {
      addError('birthLocation', 'Geçerli bir enlem koordinatı (-90 ile +90 arası) gereklidir.');
    } else if (typeof loc.longitude !== 'number' || isNaN(loc.longitude) || loc.longitude < -180 || loc.longitude > 180) {
      addError('birthLocation', 'Geçerli bir boylam koordinatı (-180 ile +180 arası) gereklidir.');
    } else if (!loc.country && !loc.city && !loc.placeName) {
      addError('birthLocation', 'Lütfen harita üzerinden bir ülke veya şehir konumu seçiniz.');
    }
  }

  // 8. Ebced İçin Anne Adı Kontrolü
  if (!data.motherName || data.motherName.trim().length < 2) {
    addError('motherName', 'Ebced analizi altyapısı için anne adı girilmesi zorunludur (en az 2 karakter).');
  }

  return {
    isValid: errorList.length === 0,
    errors,
    errorList,
  };
}
