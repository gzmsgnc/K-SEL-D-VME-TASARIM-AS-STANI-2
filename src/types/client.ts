import { GlobalLocation } from './location';

/**
 * Danışan Kayıt Modeli
 * Danışandan alınan veya uygulama sahibi tarafından girilen temel bilgileri barındırır.
 */
export interface Client {
  id: string;                       // Benzersiz danışan kimliği (UUID)
  
  // Kişisel Bilgiler
  firstName: string;                // Ad
  lastName: string;                 // Soyad
  email: string;                    // E-posta
  phone: string;                    // Telefon
  
  // Doğum Bilgileri
  birthDate: string;                // Doğum Tarihi (YYYY-MM-DD)
  birthTime: string;                // Doğum Saati (HH:mm)
  isBirthTimeUnknown: boolean;      // Doğum saati bilinmiyor mu?
  birthLocation: GlobalLocation;    // Global Doğum Yeri ve Koordinatları
  
  // Ebced Analizi İçin
  motherName: string;               // Anne Adı
  
  // Danışan Notları ve Özel Talepler
  notes: string;                    // Danışanın dövme fikri, stil beklentisi veya danışman notları
  
  // Sistem ve Takip Bilgileri
  createdAt: string;                // ISO 8601 oluşturulma zamanı
  updatedAt: string;                // ISO 8601 son güncellenme zamanı
  source: 'CLIENT_FORM' | 'OWNER_MANUAL'; // Bilginin geliş kanalı
  status: 'ACTIVE' | 'ARCHIVED';    // Danışanın arşiv durumu
}

/**
 * Danışan Bilgi Formu Girdi Tipi
 * Danışanın kendi doldurduğu ekranda sunduğu veri paketi
 */
export interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  birthTime: string;
  isBirthTimeUnknown: boolean;
  birthLocation: GlobalLocation;
  motherName: string;
  notes: string;
}
