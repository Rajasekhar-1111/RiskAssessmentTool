import Sidebar from './Sidebar';

export default function AppLayout({ children, title, subtitle }) {
  return (
    <>
      <div className="app-bg"></div>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {(title || subtitle) && (
            <div className="page-header">
              {title && <h1 className="page-title">{title}</h1>}
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </>
  );
}
