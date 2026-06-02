import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import Navbar from '../components/Navbar'
import 'leaflet/dist/leaflet.css'

// ── Custom emoji markers (avoids Vite broken icon path) ─────────────────────
const makeIcon = (emoji, size = 30) => L.divIcon({
  html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));cursor:pointer">${emoji}</div>`,
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor: [0, -(size / 2) - 4],
})

const STATUS_ICON = {
  pending:   makeIcon('🟡'),
  allocated: makeIcon('🟢'),
  expired:   makeIcon('🔴'),
  cancelled: makeIcon('⚫'),
}
const NGO_ICON    = makeIcon('🏢', 34)
const DEFAULT_ICON = makeIcon('🟡')

// ── Auto-fit map to markers ──────────────────────────────────────────────────
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [points, map])
  return null
}

const STATUS_BADGE = {
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'PENDING' },
  allocated: { bg: '#d1fae5', color: '#065f46', label: 'ALLOCATED' },
  accepted:  { bg: '#dbeafe', color: '#1e40af', label: 'ACCEPTED' },
  completed: { bg: '#e0e7ff', color: '#3730a3', label: 'COMPLETED' },
  rejected:  { bg: '#fee2e2', color: '#991b1b', label: 'REJECTED' },
  expired:   { bg: '#fee2e2', color: '#991b1b', label: 'EXPIRED' },
  cancelled: { bg: '#f1f5f9', color: '#475569', label: 'CANCELLED' },
}

function MapView() {
  const navigate = useNavigate()
  const [data, setData]     = useState({ donations: [], ngos: [], allocations: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const role = localStorage.getItem('role')

  useEffect(() => {
    api.get('/map-data/')
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => { setError('Failed to load map data.'); setLoading(false) })
  }, [])

  const ngoById      = Object.fromEntries(data.ngos.map(n => [n.id, n]))
  const donationById = Object.fromEntries(data.donations.map(d => [d.id, d]))

  const lines = data.allocations
    .filter(a => !['rejected', 'cancelled'].includes(a.status))
    .map(a => {
      const don = donationById[a.food_id]
      const ngo = ngoById[a.ngo_id]
      if (!don?.latitude || !ngo?.latitude) return null
      return {
        from:     [don.latitude, don.longitude],
        to:       [ngo.latitude, ngo.longitude],
        status:   a.status,
        score:    a.score,
        distance: a.distance_km,
      }
    }).filter(Boolean)

  // All coordinates for FitBounds
  const allPoints = [
    ...data.donations.filter(d => d.latitude).map(d => [d.latitude, d.longitude]),
    ...data.ngos.filter(n => n.latitude).map(n => [n.latitude, n.longitude]),
  ]

  const pendingCount   = data.donations.filter(d => d.status === 'pending').length
  const allocatedCount = data.donations.filter(d => d.status === 'allocated').length

  return (
    <>
      <Navbar />
      <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>

        {/* ── Top control bar ─────────────────────────── */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          padding: '0.6rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>🗺️ Live Map</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { val: data.donations.length, label: 'Donations', color: 'var(--green-primary)' },
                { val: data.ngos.length, label: 'NGOs', color: 'var(--blue)' },
                { val: pendingCount, label: 'Pending', color: 'var(--amber)' },
                { val: allocatedCount, label: 'Allocated', color: 'var(--green-light)' },
              ].map(s => (
                <span key={s.label} style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '100px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}>
                  <span style={{ color: s.color, fontWeight: 700 }}>{s.val}</span> {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { icon: '🟡', label: 'Pending donation' },
              { icon: '🟢', label: 'Allocated' },
              { icon: '🏢', label: 'NGO' },
            ].map(l => (
              <span key={l.label} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {l.icon} {l.label}
              </span>
            ))}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 18, height: 2, background: '#10b981', display: 'inline-block', borderRadius: 2 }} />
              Allocation route
            </span>
          </div>
        </div>

        {/* ── Map ─────────────────────────────────────── */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: '1rem' }}>
            <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading map data…</p>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <p style={{ color: 'var(--red)' }}>{error}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Go back</button>
          </div>
        ) : (
          <MapContainer
            center={[28.6139, 77.2090]}
            zoom={12}
            style={{ flex: 1, width: '100%' }}
          >
            {/* Dark basemap — Stadia Alidade Smooth Dark (free, no API key) */}
            <TileLayer
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
              maxZoom={20}
            />

            {/* Auto fit */}
            {allPoints.length > 0 && <FitBounds points={allPoints} />}

            {/* Allocation lines */}
            {lines.map((line, i) => (
              <Polyline
                key={i}
                positions={[line.from, line.to]}
                color={line.status === 'completed' ? '#3b82f6' : '#10b981'}
                weight={2.5}
                opacity={0.75}
              />
            ))}

            {/* Donation markers */}
            {data.donations.filter(d => d.latitude && d.longitude).map(d => {
              const b = STATUS_BADGE[d.status] || STATUS_BADGE.pending
              const ai = d.allocation_info
              return (
                <Marker
                  key={`don-${d.id}`}
                  position={[d.latitude, d.longitude]}
                  icon={STATUS_ICON[d.status] || DEFAULT_ICON}
                >
                  <Popup minWidth={210}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>🍱 {d.food_type}</p>
                      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 2 }}>📦 {d.quantity} units</p>
                      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 8 }}>📍 {d.location}</p>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 100,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: b.bg,
                        color: b.color,
                        letterSpacing: '0.04em',
                      }}>
                        {b.label}
                      </span>
                      {ai && (
                        <div style={{ marginTop: 10, padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, borderLeft: '3px solid #10b981' }}>
                          <p style={{ fontWeight: 700, color: '#065f46', fontSize: '0.85rem', marginBottom: 2 }}>🏢 {ai.ngo_name}</p>
                          <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>📍 {ai.distance_km} km away</p>
                          <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>AI Score: {ai.score} · {ai.priority}</p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* NGO markers */}
            {data.ngos.map(ngo => {
              const allocs = data.allocations.filter(a => a.ngo_id === ngo.id)
              return (
                <Marker
                  key={`ngo-${ngo.id}`}
                  position={[ngo.latitude, ngo.longitude]}
                  icon={NGO_ICON}
                >
                  <Popup minWidth={200}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>🏢 {ngo.name}</p>
                      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 2 }}>📍 {ngo.location}</p>
                      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 8 }}>
                        📦 Capacity: <strong>{ngo.capacity}</strong>
                      </p>
                      {allocs.length > 0 && (
                        <div style={{ padding: '6px 10px', background: '#eff6ff', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>
                          <p style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>
                            {allocs.length} allocation{allocs.length !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>
    </>
  )
}

export default MapView
