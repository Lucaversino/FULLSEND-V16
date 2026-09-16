import '@/components/community/community.css'
export default function Layout({children}:{children:React.ReactNode}){
 return <main className="cm-root cm-page"><div className="cm-container">{children}</div></main>
}
