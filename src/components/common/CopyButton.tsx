import React, { useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { copyTextToClipboard } from '../../utils/clientComprehensiveCopy';

export interface CopyButtonProps {
  /** Kopyalanacak metin veya metni dinamik üreten fonksiyon */
  text?: string | (() => string);
  /** Kopyalanacak metin veya fonksiyon (alternatif isim) */
  textToCopy?: string | (() => string);
  /** Normal durumdaki buton etiketi (Varsayılan: 'Kopyala') */
  label?: string;
  /** Kopyalama başarılı olduğundaki etiket (Varsayılan: 'Kopyalandı ✓') */
  copiedLabel?: string;
  /** Buton başlığı (tooltip) */
  title?: string;
  /** Özel CSS sınıfları */
  className?: string;
  /** Stil varyantı */
  variant?: 'primary' | 'secondary' | 'subtle' | 'gold' | 'outline';
  /** Buton boyutu */
  size?: 'xs' | 'sm' | 'md';
  /** Başarı geri bildirimi geri çağırması */
  onSuccess?: () => void;
  /** Hata geri bildirimi geri çağırması */
  onError?: (errMessage: string) => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  textToCopy,
  label = 'Kopyala',
  copiedLabel = 'Kopyalandı ✓',
  title = 'Panoya kopyala',
  className = '',
  variant = 'secondary',
  size = 'sm',
  onSuccess,
  onError,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);

    const source = textToCopy ?? text;
    const resolvedText = typeof source === 'function' ? source() : (source || '');
    if (!resolvedText) {
      setHasError(true);
      if (onError) onError('Kopyalanacak metin bulunamadı.');
      setTimeout(() => setHasError(false), 2500);
      return;
    }

    const success = await copyTextToClipboard(resolvedText);
    if (success) {
      setIsCopied(true);
      if (onSuccess) onSuccess();
      setTimeout(() => setIsCopied(false), 2200);
    } else {
      setHasError(true);
      if (onError) onError('Panoya kopyalama başarısız oldu. Lütfen tarayıcı izinlerini kontrol edin.');
      setTimeout(() => setHasError(false), 2500);
    }
  };

  const getVariantClasses = () => {
    if (isCopied) {
      return 'bg-emerald-950/80 border-emerald-600 text-emerald-300 ring-1 ring-emerald-500/50';
    }
    if (hasError) {
      return 'bg-rose-950/80 border-rose-600 text-rose-300 ring-1 ring-rose-500/50';
    }

    switch (variant) {
      case 'gold':
        return 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold border border-amber-400 shadow-sm';
      case 'primary':
        return 'bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 hover:border-amber-500/60';
      case 'outline':
        return 'bg-transparent hover:bg-stone-800/60 text-stone-300 hover:text-stone-100 border border-stone-700 hover:border-stone-600';
      case 'subtle':
        return 'bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800';
      case 'secondary':
      default:
        return 'bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 hover:border-stone-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'px-2 py-0.5 text-[11px] gap-1';
      case 'md':
        return 'px-3.5 py-2 text-xs font-semibold gap-2';
      case 'sm':
      default:
        return 'px-2.5 py-1 text-xs font-medium gap-1.5';
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`rounded-lg transition-all inline-flex items-center justify-center shrink-0 cursor-pointer select-none ${getVariantClasses()} ${getSizeClasses()} ${className}`}
      title={title}
    >
      {isCopied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
          <span>{copiedLabel}</span>
        </>
      ) : hasError ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Hata</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
