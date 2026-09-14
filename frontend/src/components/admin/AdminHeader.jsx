import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../common/Icons';

export default function AdminHeader({
  title,
  subtitle,
  backTo = '/admin',
  backLabel = 'Back to Dashboard',
  badge,
  actions,
}) {
  return (
    <div className="admin-page-header-wrap">
      {backTo && (
        <Link className="admin-back-btn" to={backTo}>
          <ArrowLeftIcon size={14} />
          <span>{backLabel}</span>
        </Link>
      )}
      <div className="admin-page-header">
        <div className="admin-page-header-main">
          <p className="section-eyebrow">ADMINISTRATION</p>
          <div className="admin-title-row">
            <h1>{title}</h1>
            {badge && <span className="admin-header-badge">{badge}</span>}
          </div>
          {subtitle && <p className="admin-header-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="admin-page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
