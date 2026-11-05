export default function FeatureImage({
  src,
  alt,
  title,
  subtitle,
  className = "",
}) {
  return (
    <div className={`feature-image ${className}`}>
      <img src={src} alt={alt} loading="lazy" />

      {(title || subtitle) && (
        <div className="feature-image-caption">
          {title && <h3>{title}</h3>}
          {subtitle && <p>{subtitle}</p>}
        </div>
      )}
    </div>
  );
}