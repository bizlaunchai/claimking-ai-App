const AnalyticsCard = ({ title, value, trend, subtitle, progress, children, highlight = false, badge = null }) => {
    const isPositive = trend?.includes('+');

    return (
        <div className={`analytics-card ${highlight ? 'highlight' : ''}`}>
            <div className="analytics-card-header">
                <h3 className="analytics-card-title">{title}</h3>
                {badge ? (
                    <span className="analytics-badge urgent">{badge}</span>
                ) : (
                    <span className={`analytics-trend ${isPositive ? 'positive' : 'negative'}`}>
                        {trend || '0%'}
                    </span>
                )}
            </div>
            <div className="analytics-card-value">{value || '0'}</div>
            {subtitle && <div className="analytics-card-subtitle">{subtitle}</div>}

            {/* Progress Bar (Optional) */}
            {progress !== undefined && (
                <div className="analytics-progress">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            {/* Extra content (Stages, Success, Action Breakdown) */}
            {children && <div className="mt-4">{children}</div>}
        </div>
    );
};

export default AnalyticsCard;