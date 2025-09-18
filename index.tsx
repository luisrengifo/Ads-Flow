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
        negativeKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista de pelo menos 100 palavras-chave negativas relevantes." }
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

const EditableField: FC<{
    initialValue: string;
    onSave: (newValue: string) => void;
    onCopy: (text: string) => void;
}> = ({ initialValue, onSave, onCopy }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleSave = () => {
        onSave(value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="editable-field editing">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    autoFocus
                />
                <button onClick={handleSave} className="edit-action-button save-button">✓</button>
                <button onClick={() => setIsEditing(false)} className="edit-action-button cancel-button">×</button>
            </div>
        );
    }

    return (
        <div className="editable-field">
            <span>{value}</span>
            <div className="field-actions">
                 <button className="icon-button" onClick={() => setIsEditing(true)} aria-label="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button className="icon-button" onClick={() => onCopy(value)} aria-label="Copy">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
        </div>
    );
};

const ResultCard: FC<{ title: string; icon: string; children: ReactNode; fullWidth?: boolean; headerContent?: ReactNode }> = ({ title, icon, children, fullWidth = false, headerContent }) => (
    <div className={`result-card ${fullWidth ? 'full-width' : ''}`}>
        <div className="result-card-header">
            <h3>
                <span role="img" aria-hidden="true" style={{ marginRight: '10px' }}>{icon}</span>
                {title}
            </h3>
            {headerContent}
        </div>
        {children}
    </div>
);

const AdPreview: FC<{
    headline1: string;
    headline2: string;
    description1: string;
    finalUrl: string;
    displayPath1: string;
}> = ({ headline1, headline2, description1, finalUrl, displayPath1 }) => {

    const safeGetHostname = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch (e) {
            return "seusite.com";
        }
    };
    
    const displayUrl = `${safeGetHostname(finalUrl)}${displayPath1 ? '/' + displayPath1 : ''}`;
    
    return (
        <div className="ad-preview-mobile-frame">
            <div className="ad-preview-custom-header">
                <h3>Prévia do Anúncio</h3>
            </div>
            <div className="ad-preview-unit">
                <strong className="ad-preview-sponsored">Patrocinado</strong>
                <div className="ad-preview-source">
                    <div className="ad-preview-favicon">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285f4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <span className="ad-preview-display-url">{displayUrl}</span>
                </div>
                <h3 className="ad-preview-headline">{headline1} - {headline2}</h3>
                <p className="ad-preview-description">{description1}</p>
            </div>
            <div className="ad-result-placeholder">
                <div className="placeholder-line title"></div>
                <div className="placeholder-line text"></div>
                <div className="placeholder-line text short"></div>
            </div>
             <div className="ad-result-placeholder">
                <div className="placeholder-line title"></div>
                <div className="placeholder-line text"></div>
                <div className="placeholder-line text short"></div>
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
    const [sitelinkBaseUrl, setSitelinkBaseUrl] = useState('');

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
        setSitelinkBaseUrl('');

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
            setSitelinkBaseUrl(parsedData.finalUrl || 'https://sitedocliente.com');
        } catch (e) {
            console.error(e);
            setError('Ocorreu um erro ao gerar a campanha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleUpdateData = (path: (string | number)[], value: string) => {
        if (!campaignData) return;
    
        setCampaignData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData)); // Deep copy
            let current = newData;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
            return newData;
        });
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 1500);
    };
    
    const formatSitelinkUrl = (baseUrl: string, index: number): string => {
        let cleanUrl = (baseUrl || 'https://sitedocliente.com').trim();
        const queryIndex = cleanUrl.indexOf('?');
        if (queryIndex !== -1) cleanUrl = cleanUrl.substring(0, queryIndex);
        const hashIndex = cleanUrl.indexOf('#');
        if (hashIndex !== -1) cleanUrl = cleanUrl.substring(0, hashIndex);
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        const utmParams = `/?utm_source=google-ads&utm_campaign=sitelink&utm_content=0${index + 1}`;
        return cleanUrl + utmParams;
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
            
            content += `Sitelinks:\n${sitelinks.map((s, i) => `- ${s.text}\n  - ${s.description1}\n  - ${s.description2}\n  - ${formatSitelinkUrl(sitelinkBaseUrl, i)}`).join('\n\n')}\n\n`;
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
            sitelinks.forEach((s, i) => content += `Sitelink,"${s.text}","${s.description1} | ${s.description2}","${formatSitelinkUrl(sitelinkBaseUrl, i)}"\n`);
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
    
    const getPopulatedHtml = async (data: CampaignData, promptText: string, baseUrl: string): Promise<string> => {
        try {
            const response = await fetch('/print_template.html');
            if (!response.ok) throw new Error('Template não encontrado');
            let template = await response.text();

            const createList = (items: string[]) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;

            const keywordsHtml = `
                <table class="keywords-table">
                    <thead>
                        <tr>
                            <th>Ampla</th>
                            <th>Frase</th>
                            <th>Exata</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${createList(data.keywords.broad)}</td>
                            <td>${createList(data.keywords.phrase.map(k => `"${k.replace(/"/g, '')}"`))}</td>
                            <td>${createList(data.keywords.exact.map(k => `[${k.replace(/\[|\]/g, '')}]`))}</td>
                        </tr>
                    </tbody>
                </table>`;

            const sitelinksHtml = data.sitelinks.map((s, i) => `
                <div class="sitelink-item">
                    <h4>${s.text}</h4>
                    <p>${s.description1}<br/>${s.description2}</p>
                    <a href="${formatSitelinkUrl(baseUrl, i)}">${formatSitelinkUrl(baseUrl, i)}</a>
                </div>
            `).join('');

            const contentHtml = `
                <h2>Informações Gerais</h2>
                <div class="section-content">
                    <ul>
                        <li><strong>URL Final:</strong> ${data.finalUrl}</li>
                        <li><strong>Caminho de Exibição:</strong> /${data.displayPath1}/${data.displayPath2}</li>
                        <li><strong>Nome da Empresa:</strong> ${data.companyName}</li>
                    </ul>
                </div>

                <h2>Títulos</h2>
                <div class="section-content">${createList(data.headlines)}</div>

                <h2>Descrições</h2>
                <div class="section-content">${createList(data.descriptions)}</div>

                <h2>Palavras-chave</h2>
                ${keywordsHtml}

                <h2>Sitelinks</h2>
                ${sitelinksHtml}

                <h2>Frases de Destaque</h2>
                <div class="section-content">${createList(data.callouts)}</div>

                <h2>Snippets Estruturados</h2>
                <div class="section-content">${createList(data.structuredSnippets)}</div>

                <h2>Palavras-chave Negativas</h2>
                <ul class="negative-keywords-list">${data.negativeKeywords.map(k => `<li>-${k}</li>`).join('')}</ul>
            `;

            template = template.replace(/\[CAMPAIGN_TITLE\]/g, 'Estrutura de Campanha Google Ads');
            template = template.replace(/\[PROMPT\]/g, promptText);
            template = template.replace(/\[GENERATION_DATE\]/g, new Date().toLocaleDateString('pt-BR'));
            template = template.replace('[CAMPAIGN_CONTENT]', contentHtml);
            
            return template;
        } catch (e) {
            console.error("Erro ao popular o template:", e);
            throw e;
        }
    };
    
    const handlePrint = async () => {
        if (!campaignData) return;

        try {
            const htmlString = await getPopulatedHtml(campaignData, prompt, sitelinkBaseUrl);
            const printWindow = window.open('', '_blank');
            
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(htmlString);
                printWindow.document.close();

                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 500);
            } else {
                 throw new Error("Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.");
            }
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            setError("Ocorreu um erro ao preparar o documento para impressão.");
        }
    };

    const handleCopyAll = (data: string[]) => {
        if (!data) return;
        handleCopy(data.join('\n'));
    };

    const handleCopyAllKeywords = () => {
        if (!campaignData) return;
        const { broad, phrase, exact } = campaignData.keywords;
        const content = `Ampla:\n${broad.join('\n')}\n\nFrase:\n${phrase.map(k => `"${k.replace(/"/g, '')}"`).join('\n')}\n\nExata:\n${exact.map(k => `[${k.replace(/\[|\]/g, '')}]`).join('\n')}`;
        handleCopy(content);
    };
    
    const handleCopyAllSitelinks = () => {
        if (!campaignData) return;
        const content = campaignData.sitelinks.map((s, i) => {
            return `Texto: ${s.text}\nDescrição 1: ${s.description1}\nDescrição 2: ${s.description2}\nURL: ${formatSitelinkUrl(sitelinkBaseUrl, i)}`;
        }).join('\n\n');
        handleCopy(content);
    };

    const handleCopyAllNegative = () => {
        if (!campaignData || !campaignData.negativeKeywords) return;
        const formattedKeywords = campaignData.negativeKeywords.map(k => `-${k}`).join(', ');
        handleCopy(formattedKeywords);
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
                       Crie campanhas no Google Ads em <strong className="highlight-white">segundos</strong>. Insira o contexto da sua marca, produto ou serviço e deixe que o Ads Flow gere uma estrutura <strong className="highlight-white">completa e otimizada</strong> para a Rede de Pesquisa.
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

                         <div className="ad-previews-grid">
                           {[0, 1, 2].map(i => (
                               <AdPreview 
                                   key={i}
                                   headline1={campaignData.headlines?.[i % campaignData.headlines.length] || ''}
                                   headline2={campaignData.headlines?.[(i + 1) % campaignData.headlines.length] || ''}
                                   description1={campaignData.descriptions?.[i % campaignData.descriptions.length] || ''}
                                   finalUrl={campaignData.finalUrl}
                                   displayPath1={campaignData.displayPath1}
                               />
                           ))}
                       </div>
                       
                        <div className="results-grid">
                            <ResultCard 
                                icon="🌐" 
                                title="URL Final"
                            >
                                <p className="card-description">Isso vai ser usado para sugerir recursos para seu anúncio.</p>
                                <EditableField
                                    initialValue={campaignData.finalUrl}
                                    onSave={(v) => handleUpdateData(['finalUrl'], v)}
                                    onCopy={handleCopy}
                                />
                            </ResultCard>

                            <ResultCard 
                                icon="🛣️" 
                                title="Caminho de Exibição"
                            >
                                <p className="card-description">Os campos "Caminho" fazem parte do URL de visualização em anúncios responsivos de pesquisa e geralmente são exibidos em um texto verde abaixo do título e acima da descrição. Os campos dão aos clientes em potencial uma ideia da página que eles acessarão no seu site depois de clicar no anúncio. Assim, os textos inseridos nos campos devem descrever o produto ou serviço promovido no anúncio em mais detalhes.</p>
                                <div className="display-path-container">
                                    <span>{`${(() => {
                                        try { return new URL(campaignData.finalUrl).hostname }
                                        catch { return 'seusite.com' }
                                    })()}/`}</span>
                                    <EditableField
                                        initialValue={campaignData.displayPath1}
                                        onSave={(v) => handleUpdateData(['displayPath1'], v)}
                                        onCopy={handleCopy}
                                    />
                                    <span>/</span>
                                    <EditableField
                                        initialValue={campaignData.displayPath2}
                                        onSave={(v) => handleUpdateData(['displayPath2'], v)}
                                        onCopy={handleCopy}
                                    />
                                </div>
                            </ResultCard>

                            <ResultCard 
                                icon="🔑" 
                                title="Palavras-chave"
                                headerContent={<button className="copy-all-button" onClick={handleCopyAllKeywords}>Copiar Todas</button>}
                            >
                                <h4>Ampla</h4>
                                <p className="keyword-type-description">Seu anúncio será exibido para pesquisas que incluam sinônimos, variações relacionadas e erros de digitação da sua palavra-chave. É a correspondência mais flexível.</p>
                                <ul>{campaignData.keywords.broad.map((kw, i) => <li key={`b-${i}`}><EditableField initialValue={kw} onSave={(v) => handleUpdateData(['keywords', 'broad', i], v)} onCopy={handleCopy} /></li>)}</ul>
                                
                                <h4>Frase</h4>
                                <p className="keyword-type-description">Seu anúncio aparece para pesquisas que contêm sua palavra-chave frase, na mesma ordem, mas com palavras adicionais antes ou depois.</p>
                                <ul>{campaignData.keywords.phrase.map((kw, i) => <li key={`p-${i}`}><EditableField initialValue={`"${kw.replace(/"/g, '')}"`} onSave={(v) => handleUpdateData(['keywords', 'phrase', i], v.replace(/"/g, ''))} onCopy={handleCopy} /></li>)}</ul>

                                <h4>Exata</h4>
                                <p className="keyword-type-description">O seu anúncio só aparece quando a pesquisa do usuário é a sua palavra-chave exata, ou uma variação muito próxima (como plural ou erro de digitação). É a mais restritiva de todas.</p>
                                <ul>{campaignData.keywords.exact.map((kw, i) => <li key={`e-${i}`}><EditableField initialValue={`[${kw.replace(/\[|\]/g, '')}]`} onSave={(v) => handleUpdateData(['keywords', 'exact', i], v.replace(/\[|\]/g, ''))} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="🏷️" 
                                title="Títulos"
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.headlines)}>Copiar Todas</button>}
                            >
                                <p className="card-description">Quanto mais idéias de títulos você inserir, maiores serão as chances de o Google Ads veicular anúncios associados às consultas de pesquisa dos clientes em potencial, o que pode melhorar a performance da publicidade.</p>
                                <ul>{campaignData.headlines.map((h, i) => <li key={`h-${i}`}><EditableField initialValue={h} onSave={(v) => handleUpdateData(['headlines', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="📝" 
                                title="Descrições" 
                                fullWidth={true}
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.descriptions)}>Copiar Todas</button>}
                            >
                                <p className="card-description">Quanto mais idéias de descrições você inserir, maiores serão as chances de o Google Ads veicular anúncios associados às consultas de pesquisa dos clientes em potencial, o que pode melhorar a performance da publicidade.</p>
                                <ul>{campaignData.descriptions.map((d, i) => <li key={`d-${i}`}><EditableField initialValue={d} onSave={(v) => handleUpdateData(['descriptions', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>

                            <ResultCard 
                                icon="🔗" 
                                title="Sitelinks" 
                                fullWidth={true}
                                headerContent={<button className="copy-all-button" onClick={handleCopyAllSitelinks}>Copiar Todas</button>}
                            >
                                <p className="card-description">Adicione links aos anúncios para direcionar as pessoas a páginas específicas do seu site (por exemplo, a página de um determinado produto ou que mostra o horário de funcionamento da loja).</p>
                                <div className="sitelink-url-input">
                                    <label htmlFor="sitelink-base-url">URL Base para Sitelinks:</label>
                                    <input
                                        id="sitelink-base-url"
                                        type="text"
                                        value={sitelinkBaseUrl}
                                        onChange={(e) => setSitelinkBaseUrl(e.target.value)}
                                        placeholder="https://sitedocliente.com"
                                    />
                                    <p>
                                        Insira a <strong className="highlight-white">URL principal sem a / no final</strong> que será usada nos sitelinks. O código de rastreamento será adicionado automaticamente.
                                    </p>
                                </div>
                                <div className="sitelinks-grid">
                                    {campaignData.sitelinks.map((s, i) => (
                                        <div key={`sl-${i}`} className="sitelink-item">
                                            <strong><EditableField initialValue={s.text} onSave={(v) => handleUpdateData(['sitelinks', i, 'text'], v)} onCopy={handleCopy} /></strong>
                                            <div className="sitelink-descriptions">
                                                <EditableField initialValue={s.description1} onSave={(v) => handleUpdateData(['sitelinks', i, 'description1'], v)} onCopy={handleCopy} />
                                                <EditableField initialValue={s.description2} onSave={(v) => handleUpdateData(['sitelinks', i, 'description2'], v)} onCopy={handleCopy} />
                                            </div>
                                            <small>{formatSitelinkUrl(sitelinkBaseUrl, i)}</small>
                                        </div>
                                    ))}
                                </div>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="✨" 
                                title="Frases de Destaque"
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.callouts)}>Copiar Todas</button>}
                            >
                                <p className="card-description">As frases de destaque podem melhorar seus anúncios de texto por meio da promoção de ofertas exclusivas para os compradores, como frete grátis ou atendimento ao cliente 24 horas.</p>
                                <ul>{campaignData.callouts.map((c, i) => <li key={`c-${i}`}><EditableField initialValue={c} onSave={(v) => handleUpdateData(['callouts', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="📑" 
                                title="Snippets Estruturados"
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.structuredSnippets)}>Copiar Todas</button>}
                            >
                                <p className="card-description">Snippets estruturados são recursos que destacam aspectos específicos dos seus produtos e serviços. Eles aparecem abaixo do seu anúncio de texto em formato de cabeçalho (por exemplo: "Destinos") e lista de valores (por exemplo: "Havaí, Costa Rica, África do Sul").</p>
                                <ul>{campaignData.structuredSnippets.map((s, i) => <li key={`s-${i}`}><EditableField initialValue={s} onSave={(v) => handleUpdateData(['structuredSnippets', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                           <ResultCard 
                                icon="⛔" 
                                title="Palavras-chave Negativas" 
                                fullWidth={true}
                                headerContent={
                                    <button className="copy-all-button" onClick={handleCopyAllNegative}>Copiar Todas</button>
                                }
                            >
                                <p className="card-description">São termos que você adiciona à sua campanha para impedir que seu anúncio seja exibido quando alguém pesquisa por eles. Elas são essenciais para otimizar o orçamento.</p>
                                <ul className="negative-keywords-list">
                                    {campaignData.negativeKeywords.map((n, i) => <li key={`n-${i}`}><EditableField initialValue={n} onSave={(v) => handleUpdateData(['negativeKeywords', i], v)} onCopy={handleCopy} /></li>)}
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