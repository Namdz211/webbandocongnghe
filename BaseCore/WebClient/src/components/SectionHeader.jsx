import LinkButton from './LinkButton.jsx'

export default function SectionHeader({ title, description, linkTo, onNavigate }) {
  return (
    <div className="section-title">
      <h3 className="title">{title}</h3>
      <div className="section-nav">
        {description && <span className="section-copy">{description}</span>}
        {linkTo && (
          <LinkButton className="section-link" to={linkTo} onNavigate={onNavigate}>
            Xem tất cả
          </LinkButton>
        )}
      </div>
    </div>
  )
}
