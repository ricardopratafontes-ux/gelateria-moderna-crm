import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para ícones do Leaflet com bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ClienteRota {
  cliente_id?: string;
  nome: string;
  endereco?: string;
  segmento?: string;
  latitude?: number | string;
  longitude?: number | string;
  visitado?: boolean;
  dias_sem_visita?: number;
}

interface MapaRotaProps {
  clientes: ClienteRota[];
  vendedorPos?: { latitude: number; longitude: number } | null;
  altura?: string;
}

const iconeCliente = (idx: number, visitado: boolean) => {
  const cor = visitado ? '#22c55e' : '#3b82f6';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${cor};color:#fff;width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-weight:bold;
      font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)
    ">${idx + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const iconeVendedor = L.divIcon({
  className: '',
  html: `<div style="
    background:#f31c40;color:#fff;width:32px;height:32px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;font-size:16px;
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)
  ">🧑‍💼</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const MapaRota: React.FC<MapaRotaProps> = ({ clientes, vendedorPos, altura = '400px' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Inicializar mapa se não existe
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([-10.9, -37.07], 13); // Default: Aracaju

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;

    // Limpar layers anteriores (exceto tile)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const pontos: L.LatLng[] = [];
    const pontosRota: L.LatLng[] = [];

    // Adicionar markers dos clientes
    clientes.forEach((cliente, idx) => {
      const lat = Number(cliente.latitude);
      const lon = Number(cliente.longitude);
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) return;

      const latlng = L.latLng(lat, lon);
      pontos.push(latlng);
      pontosRota.push(latlng);

      const marker = L.marker(latlng, { icon: iconeCliente(idx, !!cliente.visitado) })
        .addTo(map);

      const popupContent = `
        <div style="min-width:160px">
          <strong style="font-size:13px">#${idx + 1} ${cliente.nome}</strong>
          ${cliente.endereco ? `<br><span style="font-size:11px;color:#666">${cliente.endereco}</span>` : ''}
          ${cliente.segmento ? `<br><span style="font-size:11px;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px">${cliente.segmento}</span>` : ''}
          ${cliente.dias_sem_visita ? `<br><span style="font-size:11px;color:${Number(cliente.dias_sem_visita) > 7 ? '#dc2626' : '#f59e0b'}">${cliente.dias_sem_visita}d sem visita</span>` : ''}
          ${cliente.visitado ? '<br><span style="font-size:11px;color:#16a34a;font-weight:600">✓ Visitado</span>' : ''}
        </div>
      `;
      marker.bindPopup(popupContent);
    });

    // Desenhar linha da rota (sequência)
    if (pontosRota.length >= 2) {
      L.polyline(pontosRota, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 8',
      }).addTo(map);
    }

    // Marker do vendedor
    if (vendedorPos?.latitude && vendedorPos?.longitude) {
      const vendedorLatLng = L.latLng(vendedorPos.latitude, vendedorPos.longitude);
      pontos.push(vendedorLatLng);
      L.marker(vendedorLatLng, { icon: iconeVendedor })
        .addTo(map)
        .bindPopup('<strong>Vendedor</strong><br>Posição atual');
    }

    // Ajustar zoom para mostrar todos os pontos
    if (pontos.length > 0) {
      const bounds = L.latLngBounds(pontos);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    return () => {};
  }, [clientes, vendedorPos]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height: altura, width: '100%', borderRadius: 8, overflow: 'hidden' }}
    />
  );
};

export default MapaRota;
