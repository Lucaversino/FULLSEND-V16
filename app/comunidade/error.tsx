'use client'
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="cm-card cm-error" role="alert"><h2>Não foi possível carregar esta página.</h2><p>Verifique sua conexão e tente novamente.</p><button onClick={reset}>Tentar novamente</button></section>}
