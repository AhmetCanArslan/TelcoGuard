import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import type { BaseStation } from '../types'

/* Custom colored markers via divIcon */
function createStationIcon(status: string) {
  const colorMap: Record<string, string> = {
    ACTIVE:   '#10B981',
    WARNING:  '#FFCC00',
    CRITICAL: '#EF4444',
    OFFLINE:  '#6B7280',
  }
  const color = colorMap[status] || '#6B7280'

  return L.divIcon({
    className: '',
    html: `<div class="station-marker ${status}" style="background:${color}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

interface Props {
  stations: BaseStation[]
}

export default function NetworkMap({ stations }: Props) {
  const navigate = useNavigate()

  return (
    <div className="map-container full-width">
      <div className="map-header">
        <span>📍</span> İstasyon Haritası — İstanbul
      </div>
      <MapContainer
        center={[41.015, 29.01]}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: 400 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map(station => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={createStationIcon(station.status)}
          >
            <Popup>
              <div className="popup-content">
                <h4>{station.name}</h4>
                <p><strong>Kod:</strong> {station.code}</p>
                <p><strong>Tip:</strong> {station.type === 'NR_5G' ? '5G NR' : '4G LTE'}</p>
                <p><strong>Durum:</strong> {station.status}</p>
                <p><strong>Kapasite:</strong> {station.capacity}</p>
                <span
                  className="popup-link"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/stations/${station.id}`)}
                >
                  Detayları Gör →
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
