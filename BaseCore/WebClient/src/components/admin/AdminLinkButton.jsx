function LinkButton({ to, onNavigate, className = '', children }) {
  return (
    <a
      className={className}
      href={to}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return
        }

        event.preventDefault()
        onNavigate(to)
      }}
    >
      {children}
    </a>
  )
}

export default LinkButton
