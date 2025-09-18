import React, { useState, useEffect, FC, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const campaignSchema = {
    type: Type.OBJECT,
    properties: {
        finalUrl: { type: Type.STRING, description: "A URL final relevante para o produto/serviço. Ex: https://example.com/produto" },
        displayPath1: { type: Type.STRING, description: "Primeiro caminho de exibição, até 15 caracteres." },
        displayPath2: { type: Type.STRING, description: "Segundo caminho de exibição, até 15 caracteres." },
        headlines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "15 títulos de anúncio, cada um com até 30 caracteres." },
        descriptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 descrições de anúncio, cada uma com até 90 caracteres." },
        companyName: { type: Type.STRING, description: "O nome da empresa, até 25 caracteres." },
        keywords: {
            type: Type.OBJECT,
            properties: {
                broad: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 palavras-chave de correspondência ampla." },
                phrase: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 palavras-chave de correspondência de frase (sem aspas)." },
                exact: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 palavras-chave de correspondência exata (sem colchetes)." },
            },
            required: ["broad", "phrase", "exact"]
        },
        sitelinks: {
            type: Type.ARRAY,
            description: "6 extensões de sitelink.",
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "O texto do sitelink, até 25 caracteres." },
                    description1: { type: Type.STRING, description: "Primeira linha de descrição do sitelink, até 35 caracteres." },
                    description2: { type: Type.STRING, description: "Segunda linha de descrição do sitelink, até 35 caracteres." }
                },
                required: ["text", "description1", "description2"]
            }
        },
        callouts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 frases de destaque, cada uma com até 25 caracteres." },
        structuredSnippets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 snippets estruturados, cada um com até 25 caracteres." },
        negativeKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista de pelo menos 20 palavras-chave negativas relevantes." }
    },
    required: ["finalUrl", "displayPath1", "displayPath2", "headlines", "descriptions", "companyName", "keywords", "sitelinks", "callouts", "structuredSnippets", "negativeKeywords"]
};


interface CampaignData {
    finalUrl: string;
    displayPath1: string;
    displayPath2: string;
    headlines: string[];
    descriptions: string[];
    companyName: string;
    keywords: {
        broad: string[];
        phrase: string[];
        exact: string[];
    };
    sitelinks: {
        text: string;
        description1: string;
        description2: string;
    }[];
    callouts: string[];
    structuredSnippets: string[];
    negativeKeywords: string[];
}

const CopyableListItem: FC<{ text: string; onCopy: (text: string) => void }> = ({ text, onCopy }) => (
    <li>
        <span>{text}</span>
        <button className="copy-button" onClick={() => onCopy(text)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
    </li>
);

const ResultCard: FC<{ title: string; icon: string; children: ReactNode; fullWidth?: boolean }> = ({ title, icon, children, fullWidth = false }) => (
    <div className={`result-card ${fullWidth ? 'full-width' : ''}`}>
        <h3>
            <span role="img" aria-hidden="true" style={{ marginRight: '10px' }}>{icon}</span>
            {title}
        </h3>
        {children}
    </div>
);


const AdPreview: FC<{
    headline1: string;
    headline2: string;
    headline3: string;
    description1: string;
    description2: string;
    finalUrl: string;
    displayPath1: string;
    displayPath2: string;
}> = ({ headline1, headline2, headline3, description1, description2, finalUrl, displayPath1, displayPath2 }) => {

    const safeGetHostname = (url: string) => {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return "seusite.com";
        }
    };

    return (
        <div className="ad-preview-card">
            <h4>Preview do Anúncio</h4>
            <div className="ad-preview">
                <div className="ad-preview-url">
                    {safeGetHostname(finalUrl)} › {displayPath1} › {displayPath2}
                </div>
                <div className="ad-preview-headline">
                    {headline1} | {headline2} | {headline3}
                </div>
                <div className="ad-preview-description">
                    {description1} {description2}
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        document.body.className = `${theme}-mode`;
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Por favor, descreva o contexto da sua campanha.');
            return;
        }
        setLoading(true);
        setError('');
        setCampaignData(null);

        try {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Gere uma estrutura completa de campanha de Google Ads (Rede de Pesquisa) para o seguinte contexto: "${prompt}". A resposta DEVE ser um JSON válido que siga o schema fornecido.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: campaignSchema,
                },
            });

            const parsedData = JSON.parse(result.text);
            setCampaignData(parsedData);
        } catch (e) {
            console.error(e);
            setError('Ocorreu um erro ao gerar a campanha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 1500);
    };
    
    const formatSitelinkUrl = (baseUrl: string, index: number): string => {
        try {
            const url = new URL(baseUrl);
            url.searchParams.set('utm_source', 'google-ads');
            url.searchParams.set('utm_campaign', 'sitelink');
            url.searchParams.set('utm_content', `0${index + 1}`);
            return url.toString();
        } catch (e) {
            return `${baseUrl}?utm_source=google-ads&utm_campaign=sitelink&utm_content=0${index + 1}`;
        }
    };
    
    const handleExport = (format: 'txt' | 'csv') => {
        if (!campaignData) return;
        
        let content = '';
        const filename = `campanha_google_ads_${new Date().toISOString().split('T')[0]}`;

        const { keywords, headlines, descriptions, sitelinks, callouts, structuredSnippets, negativeKeywords, ...rest } = campaignData;

        if (format === 'txt') {
            content = `ESTRUTURA DA CAMPANHA GOOGLE ADS\n=================================\n\n`;
            content += `URL Final: ${rest.finalUrl}\n`;
            content += `Caminho de Exibição: /${rest.displayPath1}/${rest.displayPath2}\n`;
            content += `Nome da Empresa: ${rest.companyName}\n\n`;
            
            content += `Títulos:\n${headlines.map(h => `- ${h}`).join('\n')}\n\n`;
            content += `Descrições:\n${descriptions.map(d => `- ${d}`).join('\n')}\n\n`;
            
            content += `Palavras-chave (Ampla):\n${keywords.broad.map(k => `- ${k}`).join('\n')}\n\n`;
            content += `Palavras-chave (Frase):\n${keywords.phrase.map(k => `- "${k.replace(/"/g, '')}"`).join('\n')}\n\n`;
            content += `Palavras-chave (Exata):\n${keywords.exact.map(k => `- [${k.replace(/\[|\]/g, '')}]`).join('\n')}\n\n`;
            
            content += `Sitelinks:\n${sitelinks.map((s, i) => `- ${s.text}\n  - ${s.description1}\n  - ${s.description2}\n  - ${formatSitelinkUrl(rest.finalUrl, i)}`).join('\n\n')}\n\n`;
            content += `Frases de Destaque:\n${callouts.map(c => `- ${c}`).join('\n')}\n\n`;
            content += `Snippets Estruturados:\n${structuredSnippets.map(s => `- ${s}`).join('\n')}\n\n`;
            content += `Palavras-chave Negativas:\n${negativeKeywords.map(n => `- ${n}`).join('\n')}`;
            
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.txt`;
            a.click();
            URL.revokeObjectURL(url);

        } else if (format === 'csv') {
            content = 'Tipo de Ativo,Valor 1,Valor 2,Valor 3\n';
            headlines.forEach(h => content += `Título,"${h}"\n`);
            descriptions.forEach(d => content += `Descrição,"${d}"\n`);
            keywords.broad.forEach(k => content += `Palavra-chave (Ampla),${k}\n`);
            keywords.phrase.forEach(k => content += `Palavra-chave (Frase),"${k.replace(/"/g, '')}"\n`);
            keywords.exact.forEach(k => content += `Palavra-chave (Exata),[${k.replace(/\[|\]/g, '')}]\n`);
            sitelinks.forEach((s, i) => content += `Sitelink,"${s.text}","${s.description1} | ${s.description2}","${formatSitelinkUrl(rest.finalUrl, i)}"\n`);
            callouts.forEach(c => content += `Frase de Destaque,"${c}"\n`);
            structuredSnippets.forEach(s => content += `Snippet Estruturado,"${s}"\n`);
            negativeKeywords.forEach(n => content += `Palavra-chave Negativa,${n}\n`);
            
            const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="container">
            <header>
                 <h1 className="app-name"><span>Ads Flow</span></h1>
                 <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
            </header>
            
            <main>
                <div className="input-section">
                    <h2 className="title-neon">
                        É Inteligênte, É Único, É <span className="title-gradient">Ads Flow</span>
                    </h2>
                    <p>
                        Crie campanhas no Google Ads em <strong className="highlight-white">segundos</strong>. Insira o contexto da sua marca, produto ou serviço e deixe que o Ads Flow gerar uma estrutura <strong className="highlight-white">completa e otimizada</strong> para a Rede de Pesquisa.
                    </p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Crie uma campanha para uma loja de Sapatos em São Paulo, focada no público feminino entre 25-40 anos. Destaque o frete grátis e a produção sustentável."
                        disabled={loading}
                        rows={5}
                    />
                    <button className="generate-button" onClick={handleGenerate} disabled={loading}>
                        {loading ? (
                            <div className="spinner"></div>
                        ) : (
                            'Gerar Estrutura'
                        )}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {loading && (
                     <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Estamos construindo uma Estrutura de Campanhas Google Ads na Rede de Pesquisa...</p>
                    </div>
                )}
                
                {campaignData && (
                    <div className="results-section">
                         <div className="ad-previews-grid">
                           {[0, 1, 2].map(i => (
                               <AdPreview 
                                   key={i}
                                   headline1={campaignData.headlines?.[i % campaignData.headlines.length] || ''}
                                   headline2={campaignData.headlines?.[(i + 1) % campaignData.headlines.length] || ''}
                                   headline3={campaignData.headlines?.[(i + 2) % campaignData.headlines.length] || ''}
                                   description1={campaignData.descriptions?.[i % campaignData.descriptions.length] || ''}
                                   description2={campaignData.descriptions?.[(i + 1) % campaignData.descriptions.length] || ''}
                                   finalUrl={campaignData.finalUrl}
                                   displayPath1={campaignData.displayPath1}
                                   displayPath2={campaignData.displayPath2}
                               />
                           ))}
                       </div>
                       
                       <div className="export-controls">
                           <h3>Exportar Estrutura</h3>
                           <div className="export-buttons">
                               <button onClick={() => handleExport('txt')}>
                                   <span role="img" aria-hidden="true">📄</span> Exportar TXT
                               </button>
                               <button onClick={() => handleExport('csv')}>
                                   <span role="img" aria-hidden="true">📊</span> Exportar CSV
                               </button>
                               <button onClick={handlePrint}>
                                   <span role="img" aria-hidden="true">🖨️</span> Imprimir / PDF
                               </button>
                           </div>
                       </div>
                       
                        <div className="results-grid">
                            <ResultCard icon="🔑" title="Palavras-chave">
                                <h4>Ampla</h4>
                                <ul>{campaignData.keywords.broad.map((kw, i) => <li key={`b-${i}`}>{kw}</li>)}</ul>
                                <h4>Frase</h4>
                                <ul>{campaignData.keywords.phrase.map((kw, i) => <li key={`p-${i}`}>"{kw.replace(/"/g, '')}"</li>)}</ul>
                                <h4>Exata</h4>
                                <ul>{campaignData.keywords.exact.map((kw, i) => <li key={`e-${i}`}>[{kw.replace(/\[|\]/g, '')}]</li>)}</ul>
                            </ResultCard>
                            
                            <ResultCard icon="🏷️" title="Títulos">
                                <ul>{campaignData.headlines.map((h, i) => <CopyableListItem key={`h-${i}`} text={h} onCopy={handleCopy} />)}</ul>
                            </ResultCard>
                            
                            <ResultCard icon="📝" title="Descrições" fullWidth={true}>
                                <ul>{campaignData.descriptions.map((d, i) => <CopyableListItem key={`d-${i}`} text={d} onCopy={handleCopy} />)}</ul>
                            </ResultCard>

                            <ResultCard icon="🔗" title="Sitelinks" fullWidth={true}>
                                <div className="sitelinks-grid">
                                    {campaignData.sitelinks.map((s, i) => (
                                        <div key={`sl-${i}`} className="sitelink-item">
                                            <strong>{s.text}</strong>
                                            <p>{s.description1}<br/>{s.description2}</p>
                                            <small>{formatSitelinkUrl(campaignData.finalUrl, i)}</small>
                                        </div>
                                    ))}
                                </div>
                            </ResultCard>
                            
                            <ResultCard icon="✨" title="Frases de Destaque">
                                <ul>{campaignData.callouts.map((c, i) => <CopyableListItem key={`c-${i}`} text={c} onCopy={handleCopy} />)}</ul>
                            </ResultCard>
                            
                            <ResultCard icon="📑" title="Snippets Estruturados">
                                <ul>{campaignData.structuredSnippets.map((s, i) => <CopyableListItem key={`s-${i}`} text={s} onCopy={handleCopy} />)}</ul>
                            </ResultCard>
                            
                            <ResultCard icon="⛔" title="Palavras-chave Negativas" fullWidth={true}>
                                <ul className="negative-keywords-list">
                                    {campaignData.negativeKeywords.map((n, i) => <li key={`n-${i}`}>{n}</li>)}
                                </ul>
                            </ResultCard>
                        </div>
                    </div>
                )}
                {copiedText && <div className="copy-feedback">Copiado!</div>}
            </main>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}