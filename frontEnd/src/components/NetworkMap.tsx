import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { FaMapMarkerAlt } from 'react-icons/fa'
import type { BaseStation } from '../types'

function createStationIcon(status: string) {
  const colorMap: Record<string, string> = {
    ACTIVE:   '#10B981',
    WARNING:  '#FFCB05',
    CRITICAL: '#EF4444',
    OFFLINE:  '#6B7280',
  }
  const color = colorMap[status] || '#6B7280'

  return L.divIcon({
    className: '',
    html: `
      <div class="pin-marker ${status}">
        <div class="pin-head" style="background:${color}"></div>
        <div class="pin-stem"></div>
      </div>
    `,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -32],
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
        <FaMapMarkerAlt /> İstasyon Haritası — İstanbul
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
