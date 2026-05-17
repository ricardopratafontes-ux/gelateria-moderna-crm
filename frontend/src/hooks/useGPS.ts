import { useState, useCallback, useRef } from 'react';

interface Coordenadas {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function useGPS() {
  const [posicao, setPosicao] = useState<Coordenadas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rastreando, setRastreando] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Obter posição única
  const obterPosicao = useCallback((): Promise<Coordenadas> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'Geolocalização não suportada neste dispositivo';
        setErro(msg);
        reject(new Error(msg));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordenadas = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          setPosicao(coords);
          setErro(null);
          resolve(coords);
        },
        (error) => {
          let msg = 'Erro ao obter localização';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'Permissão de localização negada';
              break;
            case error.POSITION_UNAVAILABLE:
              msg = 'Localização indisponível';
              break;
            case error.TIMEOUT:
              msg = 'Tempo esgotado ao obter localização';
              break;
          }
          setErro(msg);
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  // Iniciar rastreamento contínuo
  const iniciarRastreamento = useCallback(() => {
    if (!navigator.geolocation) {
      setErro('Geolocalização não suportada');
      return;
    }

    if (watchIdRef.current !== null) return; // Já está rastreando

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coordenadas = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        setPosicao(coords);
        setErro(null);
      },
      (error) => {
        setErro('Erro no rastreamento GPS');
        console.error('GPS Error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );

    watchIdRef.current = id;
    setRastreando(true);
  }, []);

  // Parar rastreamento
  const pararRastreamento = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setRastreando(false);
    }
  }, []);

  // Calcular desvio de rota (distância até ponto em metros)
  const calcularDesvio = useCallback((latDestino: number, lonDestino: number): number | null => {
    if (!posicao) return null;

    const R = 6371000; // Raio da Terra em metros
    const dLat = (latDestino - posicao.latitude) * Math.PI / 180;
    const dLon = (lonDestino - posicao.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(posicao.latitude * Math.PI / 180) * Math.cos(latDestino * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, [posicao]);

  return {
    posicao,
    erro,
    rastreando,
    obterPosicao,
    iniciarRastreamento,
    pararRastreamento,
    calcularDesvio
  };
}
