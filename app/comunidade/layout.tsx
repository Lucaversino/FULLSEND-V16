import Link from 'next/link'
import '@/components/community/community.css'
export default function Layout({children}:{children:React.ReactNode}){return <main className="cm-root cm-page"><div className="cm-container"><header className="cm-hero"><div><Link href="/comunidade" className="cm-eyebrow">FULLSEND / COMUNIDADE</Link><h1>FEITO POR QUEM<br/><em>VIVE CARROS.</em></h1><p>O ponto de encontro dos seus projetos e da cultura automotiva.</p></div><span className="cm-hero-mark" aria-hidden="true">FS<span>COMMUNITY</span></span></header>{children}</div></main>}
