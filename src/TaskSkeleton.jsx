import React from 'react'

export default function TaskSkeleton() {
  return (
    <div className="fade-in">
      {/* Date Header Skeleton */}
      <div className="date-header">
        <div className="date-header-left">
          <div className="skeleton-box skeleton-title" style={{ width: '130px', height: '26px', marginBottom: '6px' }} />
          <div className="skeleton-box skeleton-sub" style={{ width: '170px', height: '14px' }} />
        </div>
        <div className="date-nav-arrows" style={{ display: 'flex', gap: '6px' }}>
          <div className="skeleton-box" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
          <div className="skeleton-box" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
        </div>
      </div>

      {/* Category Card Skeletons */}
      {[1, 2].map((sectionKey) => (
        <div key={sectionKey}>
          <div className="skeleton-box" style={{ width: '100px', height: '18px', marginTop: '1.5rem', marginBottom: '0.5rem' }} />
          <div className="modern-card skeleton-card">
            {[75, 45, 60].map((widthPct, itemKey) => (
              <div key={itemKey} className="skeleton-item">
                <div className="skeleton-box" style={{ width: `${widthPct}%`, height: '18px', borderRadius: '6px' }} />
                <div className="skeleton-box" style={{ width: '48px', height: '24px', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
