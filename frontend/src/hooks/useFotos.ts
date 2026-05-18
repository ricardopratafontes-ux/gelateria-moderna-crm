/**
 * Hook para captura e compressão de fotos de visita.
 * Comprime imagens para max 800px e qualidade 0.6 antes de armazenar como base64.
 * Para o MVP, as fotos vão como base64 no JSON.
 * Futuro: migrar para upload direto ao Supabase Storage.
 */
import { useState, useCallback } from 'react';

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.6;

function comprimirImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Redimensionar mantendo proporção
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('Canvas não suportado'); return; }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
        resolve(dataUrl);
      };
      img.onerror = () => reject('Erro ao carregar imagem');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject('Erro ao ler arquivo');
    reader.readAsDataURL(file);
  });
}

export function useFotos(maxFotos = 5) {
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const capturarFoto = useCallback(() => {
    if (fotos.length >= maxFotos) {
      alert(`Máximo de ${maxFotos} fotos por visita`);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const compressed = await comprimirImagem(file);
        setFotos(prev => [...prev, compressed]);
      } catch (err) {
        console.error('Erro ao processar foto:', err);
        alert('Erro ao processar a foto. Tente novamente.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }, [fotos.length, maxFotos]);

  const removerFoto = useCallback((idx: number) => {
    setFotos(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const limparFotos = useCallback(() => {
    setFotos([]);
  }, []);

  return { fotos, uploading, capturarFoto, removerFoto, limparFotos, setFotos };
}
