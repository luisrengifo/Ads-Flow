import React, { useState, useEffect, FC, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, User, SupabaseClient } from '@supabase/supabase-js';
import './index.css';

// --- ENVIRONMENT & CLIENT SETUP ---
// FIX: Use process.env.API_KEY for the Gemini API key per coding guidelines.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = process.env.API_KEY && SUPABASE_URL && SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const ai: GoogleGenAI | null = isConfigured ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

// --- TYPES AND SCHEMAS ---
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

type Plan = 'free' | 'business' | 'agency';

interface UserProfile {
    id: string;
    plan: Plan;
    generations_used: number;
    generation_reset_date: string;
}

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

const PLAN_LIMITS: Record<Plan, number> = {
    free: 2,
    business: 15,
    agency: Infinity
};

// --- COMPONENTS ---

const ConfigurationWarning: FC = () => {
    const missingKeys: string[] = [];
    if (!process.env.API_KEY) {
        missingKeys.push('API_KEY');
    }
    if (!import.meta.env.VITE_SUPABASE_URL) {
        missingKeys.push('VITE_SUPABASE_URL');
    }
    if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
        missingKeys.push('VITE_SUPABASE_ANON_KEY');
    }

    return (
        <div className="config-warning">
            <h2>Configuração Necessária</h2>
            {missingKeys.length > 0 && (
                 <p>
                    A aplicação não está configurada corretamente. As seguintes variáveis de ambiente estão faltando: <code>{missingKeys.join('</code>, <code>')}</code>.
                </p>
            )}
            <p>
                Por favor, configure as variáveis de ambiente em seu provedor de hospedagem (ex: Vercel) para habilitar o funcionamento completo. Após adicionar as chaves, você deve fazer o "redeploy" do seu projeto.
            </p>
            <p>
                Para desenvolvimento local, crie um arquivo <code>.env.local</code> na raiz do projeto com estas chaves.
            </p>
        </div>
    );
};

const AuthModal: FC<{ onClose: () => void; onSuccess: () => void; }> = ({ onClose, onSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setLoading(true);
        setError('');
        setMessage('');

        if (mode === 'register') {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: phone,
                    }
                }
            });

            if (signUpError) {
                setError(signUpError.message);
            } else if (data.user) {
                // O gatilho no Supabase cuidará da criação do perfil
                setMessage('Verifique seu e-mail para confirmar o cadastro!');
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 3000);
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setError(error.message);
            } else {
                onSuccess();
            }
        }
        setLoading(false);
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{mode === 'login' ? 'Login' : 'Criar Conta'}</h2>
                <p>{mode === 'login' ? 'Acesse sua conta para continuar.' : 'Crie uma conta para gerar suas campanhas.'}</p>
                
                <div className="auth-mode-toggle">
                    <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
                    <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Registrar</button>
                </div>

                <form onSubmit={handleAuth} className="auth-form">
                    {mode === 'register' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="fullName">Nome Completo</label>
                                <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Telefone</label>
                                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">E-mail</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Senha</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                        <p className="form-helper-text">Mínimo de 6 caracteres.</p>
                    </div>
                    
                    {error && <p className="error-message">{error}</p>}
                    {message && <p className="success-message">{message}</p>}

                    <button type="submit" className="generate-button auth-button" disabled={loading}>
                        {loading ? <div className="spinner"></div> : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
                    </button>
                </form>
                
                <button className="close-modal-button" onClick={onClose} aria-label="Fechar">×</button>
            </div>
        </div>
    );
};

const UpgradeModal: FC<{
    onClose: () => void;
    currentPlan: Plan;
    user: User | null;
}> = ({ onClose, currentPlan, user }) => {
    // Adiciona o e-mail do usuário como parâmetro de URL para rastreamento no checkout
    const businessUrl = `https://pay.kiwify.com.br/L2SO74f?email=${user?.email || ''}`;
    const agencyUrl = `https://pay.kiwify.com.br/1YNBAZH?email=${user?.email || ''}`;

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal upgrade-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Faça um Upgrade</h2>
                <p>Você atingiu o limite de gerações do seu plano. Faça upgrade para continuar usando o Ads Flow.</p>
                <div className="plans-container">
                    <div className={`plan-card ${currentPlan === 'business' ? 'current' : ''}`}>
                        <h3>Plano Negócio</h3>
                        <div className="plan-price">15 Gerações/Mês</div>
                        <ul>
                            <li><span role="img" aria-label="check">✅</span> Estruturas completas</li>
                            <li><span role="img" aria-label="check">✅</span> Palavras-chave e extensões</li>
                            <li><span role="img" aria-label="check">✅</span> Exportação em TXT, CSV, PDF</li>
                        </ul>
                        <a 
                            href={businessUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`generate-button ${currentPlan === 'business' ? 'disabled-link' : ''}`}
                            aria-disabled={currentPlan === 'business'}
                        >
                            {currentPlan === 'business' ? 'Plano Atual' : 'Fazer Upgrade'}
                        </a>
                    </div>
                    <div className={`plan-card ${currentPlan === 'agency' ? 'current' : ''}`}>
                        <h3>Plano Agência</h3>
                        <div className="plan-price">Gerações Ilimitadas</div>
                         <ul>
                            <li><span role="img" aria-label="check">✅</span> Tudo do Plano Negócio</li>
                            <li><span role="img" aria-label="check">✅</span> Sem limites de uso</li>
                            <li><span role="img" aria-label="check">✅</span> Suporte prioritário</li>
                        </ul>
                        <a 
                            href={agencyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`generate-button ${currentPlan === 'agency' ? 'disabled-link' : ''}`}
                            aria-disabled={currentPlan === 'agency'}
                        >
                            {currentPlan === 'agency' ? 'Plano Atual' : 'Fazer Upgrade'}
                        </a>
                    </div>
                </div>
                <button className="close-modal-button" onClick={onClose} aria-label="Fechar">×</button>
            </div>
        </div>
    );
};


const EditableField: FC<{
    initialValue: string;
    onSave: (newValue: string) => void;
    onCopy: (text: string) => void;
    maxLength?: number;
}> = ({ initialValue, onSave, onCopy, maxLength }) => {
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
                <div className="edit-input-wrapper">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        autoFocus
                        maxLength={maxLength}
                    />
                    {maxLength && (
                        <span className={`char-counter ${value.length > maxLength ? 'error' : ''}`}>
                            {value.length}/{maxLength}
                        </span>
                    )}
                </div>
                <div className="edit-actions">
                    <button onClick={handleSave} className="edit-action-button save-button">✓</button>
                    <button onClick={() => setIsEditing(false)} className="edit-action-button cancel-button">×</button>
                </div>
            </div>
        );
    }

    const isOverLimit = maxLength !== undefined && value.length > maxLength;
    const displayValue = isOverLimit ? value.substring(0, maxLength) : value;

    return (
        <div className="editable-field">
            <span className="editable-field-text" title={isOverLimit ? value : undefined}>{displayValue}</span>
            {isOverLimit && (
                <span className="char-counter-static error" aria-label={`Exceeded character limit. ${value.length} of ${maxLength}`}>
                    ⚠️
                </span>
            )}
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

const ResultCard: FC<{ title: string; icon: string; children: ReactNode; fullWidth?: boolean; headerContent?: ReactNode }> = ({ title, icon, children, fullWidth = false, headerContent }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    return (
        <div className={`result-card ${fullWidth ? 'full-width' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}>
            <div className="result-card-header" onClick={toggleCollapse}>
                <h3>
                    <span role="img" aria-hidden="true" style={{ marginRight: '10px' }}>{icon}</span>
                    {title}
                </h3>
                <div className="header-actions" onClick={(e) => e.stopPropagation()}>
                    {headerContent}
                    <button className="collapse-toggle" onClick={toggleCollapse} aria-expanded={!isCollapsed} aria-label={isCollapsed ? 'Expandir' : 'Recolher'}>
                       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                </div>
            </div>
            <div className="result-card-body">
                {children}
            </div>
        </div>
    );
};

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

const SalesPage: FC = () => {
    const handleScrollToGenerator = () => {
        document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="sales-page">
            <section className="hero-section">
                <h1>Crie Anúncios no Google Ads <br/> <span className="title-gradient">10x Mais Rápido</span></h1>
                <p className="subtitle">Apresentamos o Ads Flow: a nova geração de criação de campanhas para a Rede de Pesquisa no Google. Nossa tecnologia de ponta analisa e estrutura anúncios para você em segundos, garantindo que sua marca, produto ou serviço esteja sempre à frente da concorrência.</p>
                <button className="generate-button hero-cta" onClick={handleScrollToGenerator}>
                    Começar Agora
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                </button>
            </section>

            <section className="sales-section">
                <h2>Como Funciona? Simples Assim.</h2>
                <div className="how-it-works-grid">
                    <div className="step-card">
                        <div className="step-number">1</div>
                        <h3>Descreva</h3>
                        <p>Forneça o contexto da sua marca, produto ou serviço. Quanto mais detalhes, melhor será o resultado.</p>
                    </div>
                    <div className="step-card">
                        <div className="step-number">2</div>
                        <h3>Gere</h3>
                        <p>Com um clique, o Ads Flow cria uma estrutura completa com palavras-chave, títulos, descrições e muito mais.</p>
                    </div>
                    <div className="step-card">
                        <div className="step-number">3</div>
                        <h3>Lance</h3>
                        <p>Revise, edite se necessário, exporte em seu formato preferido e suba sua campanha para o Google Ads.</p>
                    </div>
                </div>
            </section>
            
            <section className="sales-section">
                 <h2>Tudo que você precisa para uma campanha de sucesso</h2>
                 <div className="features-grid">
                     <div className="feature-card">
                        <div className="feature-icon">🔑</div>
                        <h3>Palavras-chave Relevantes</h3>
                        <p>Receba listas de palavras-chave nos 3 tipos de correspondência: Ampla, Frase e Exata.</p>
                     </div>
                     <div className="feature-card">
                        <div className="feature-icon">✍️</div>
                        <h3>Anúncios Persuasivos</h3>
                        <p>Gere múltiplos títulos e descrições otimizados para atrair cliques e conversões.</p>
                     </div>
                     <div className="feature-card">
                        <div className="feature-icon">🔗</div>
                        <h3>Extensões de Anúncios</h3>
                        <p>Crie Sitelinks, Frases de Destaque e Snippets Estruturados para aumentar a relevância do seu anúncio.</p>
                     </div>
                      <div className="feature-card">
                        <div className="feature-icon">⛔</div>
                        <h3>Negativação Inteligente</h3>
                        <p>Receba uma lista extensa de palavras-chave negativas para evitar gastos com tráfego indesejado.</p>
                     </div>
                      <div className="feature-card">
                        <div className="feature-icon">✏️</div>
                        <h3>Totalmente Editável</h3>
                        <p>Ajuste e refine qualquer parte da estrutura gerada para que ela se alinhe perfeitamente à sua estratégia.</p>
                     </div>
                      <div className="feature-card">
                        <div className="feature-icon">🚀</div>
                        <h3>Exporte e Utilize</h3>
                        <p>Exporte a campanha completa em TXT, CSV ou PDF, pronta para ser implementada no Google Ads.</p>
                     </div>
                 </div>
            </section>
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
    
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);


    // Render a warning if the app is not configured
    if (!isConfigured || !supabase || !ai) {
        return (
            <div className="container">
                 <header>
                    <div className="container">
                         <h1 className="app-name"><span>Ads Flow</span></h1>
                    </div>
                </header>
                <main>
                    <ConfigurationWarning />
                </main>
            </div>
        );
    }

    useEffect(() => {
        document.body.className = `${theme}-mode`;
    }, [theme]);
    
    const fetchUserProfile = async (currentUser: User) => {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        if (data) {
            setProfile(data);
        } else if (error) {
            console.error('Error fetching profile:', error);
            // Optionally create a profile if it doesn't exist for some reason
        }
    };


    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if(session?.user) {
                fetchUserProfile(session.user);
            }
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchUserProfile(currentUser);
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const handleGenerate = async () => {
        if (!user || !profile) {
            setShowAuthModal(true);
            return;
        }

        if (!prompt) {
            setError('Por favor, descreva o contexto da sua campanha.');
            return;
        }
        
        // --- LIMIT CHECK LOGIC ---
        const now = new Date();
        const lastReset = new Date(profile.generation_reset_date);
        let currentUsage = profile.generations_used;

        // Reset if the current month is different from the last reset month
        if (now.getFullYear() > lastReset.getFullYear() || now.getMonth() > lastReset.getMonth()) {
            currentUsage = 0;
            const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({ generations_used: 0, generation_reset_date: now.toISOString() })
                .eq('id', user.id)
                .select()
                .single();
            if (updateError) console.error("Error resetting usage:", updateError);
            else setProfile(updatedProfile); // Update state with fresh data from DB
        }

        const userLimit = PLAN_LIMITS[profile.plan] ?? 2;

        if (currentUsage >= userLimit) {
            setError("Você atingiu o limite de gerações do seu plano. Faça upgrade para continuar.");
            setShowUpgradeModal(true);
            return;
        }

        // --- END LIMIT CHECK ---

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

            const responseText = result.text;
            if (!responseText) {
                setError('A resposta da IA estava vazia. Tente novamente ou ajuste seu pedido.');
                return;
            }

            const parsedData = JSON.parse(responseText);
            setCampaignData(parsedData);
            setSitelinkBaseUrl(parsedData.finalUrl || 'https://sitedocliente.com');

            // --- INCREMENT USAGE ---
            const newUsage = currentUsage + 1;
            const { error: updateError } = await supabase.from('profiles').update({ generations_used: newUsage }).eq('id', user.id);
            if (updateError) console.error("Failed to update generation count:", updateError);
            else setProfile(prev => prev ? { ...prev, generations_used: newUsage } : null);

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
    
    const renderUserPlan = () => {
        if (!profile) return null;
        const limit = PLAN_LIMITS[profile.plan];
        const usageText = isFinite(limit) ? `${profile.generations_used}/${limit}` : 'Ilimitado';
        const planName = profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1);
        return (
            <div className="user-plan-info">
                <span>Plano: <strong>{planName}</strong></span>
                <span className="usage-separator">|</span>
                <span>Uso: {usageText}</span>
            </div>
        );
    };

    return (
        <>
            <header>
                 <div className="container">
                    <h1 className="app-name"><span>Ads Flow</span></h1>
                    <div className="header-controls">
                        <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                            {theme === 'dark' ? '🌙' : '☀️'}
                        </button>
                        {user ? (
                            <div className="user-info">
                                {renderUserPlan()}
                                <button onClick={() => supabase.auth.signOut()} className="logout-button">Sair</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowAuthModal(true)}>Login / Registrar</button>
                        )}
                    </div>
                 </div>
            </header>
            
            <div className="container">
                <SalesPage />

                <main id="generator">
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
                                            maxLength={15}
                                        />
                                        <span>/</span>
                                        <EditableField
                                            initialValue={campaignData.displayPath2}
                                            onSave={(v) => handleUpdateData(['displayPath2'], v)}
                                            onCopy={handleCopy}
                                            maxLength={15}
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
                                    <ul>{campaignData.headlines.map((h, i) => <li key={`h-${i}`}><EditableField initialValue={h} onSave={(v) => handleUpdateData(['headlines', i], v)} onCopy={handleCopy} maxLength={30} /></li>)}</ul>
                                </ResultCard>
                                
                                <ResultCard 
                                    icon="📝" 
                                    title="Descrições" 
                                    fullWidth={true}
                                    headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.descriptions)}>Copiar Todas</button>}
                                >
                                    <p className="card-description">Quanto mais idéias de descrições você inserir, maiores serão as chances de o Google Ads veicular anúncios associados às consultas de pesquisa dos clientes em potencial, o que pode melhorar a performance da publicidade.</p>
                                    <ul>{campaignData.descriptions.map((d, i) => <li key={`d-${i}`}><EditableField initialValue={d} onSave={(v) => handleUpdateData(['descriptions', i], v)} onCopy={handleCopy} maxLength={90} /></li>)}</ul>
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
                                                <strong><EditableField initialValue={s.text} onSave={(v) => handleUpdateData(['sitelinks', i, 'text'], v)} onCopy={handleCopy} maxLength={25} /></strong>
                                                <div className="sitelink-descriptions">
                                                    <EditableField initialValue={s.description1} onSave={(v) => handleUpdateData(['sitelinks', i, 'description1'], v)} onCopy={handleCopy} maxLength={35} />
                                                    <EditableField initialValue={s.description2} onSave={(v) => handleUpdateData(['sitelinks', i, 'description2'], v)} onCopy={handleCopy} maxLength={35} />
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
                                    <ul>{campaignData.callouts.map((c, i) => <li key={`c-${i}`}><EditableField initialValue={c} onSave={(v) => handleUpdateData(['callouts', i], v)} onCopy={handleCopy} maxLength={25} /></li>)}</ul>
                                </ResultCard>
                                
                                <ResultCard 
                                    icon="📑" 
                                    title="Snippets Estruturados"
                                    headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.structuredSnippets)}>Copiar Todas</button>}
                                >
                                    <p className="card-description">Snippets estruturados são recursos que destacam aspectos específicos dos seus produtos e serviços. Eles aparecem abaixo do seu anúncio de texto em formato de cabeçalho (por exemplo: "Destinos") e lista de valores (por exemplo: "Havaí, Costa Rica, África do Sul").</p>
                                    <ul>{campaignData.structuredSnippets.map((s, i) => <li key={`s-${i}`}><EditableField initialValue={s} onSave={(v) => handleUpdateData(['structuredSnippets', i], v)} onCopy={handleCopy} maxLength={25} /></li>)}</ul>
                                </ResultCard>
                                
                               <ResultCard 
                                    icon="⛔" 
                                    title="Palavras-chave Negativas" 
                                    fullWidth={true}
                                    headerContent={
                                        <button className="copy-all-button" onClick={handleCopyAllNegative}>Copiar Todas</button>
                                    }
                                >
                                    <p className="card-description">São termos que você adiciona à sua campanha para impedir que seu anúncio seja exibido quando alguém pesquisa por eles. Elas são essenciais para otimizmar o orçamento.</p>
                                    <ul className="negative-keywords-list">
                                        {campaignData.negativeKeywords.map((n, i) => <li key={`n-${i}`}><EditableField initialValue={n} onSave={(v) => handleUpdateData(['negativeKeywords', i], v)} onCopy={handleCopy} /></li>)}
                                    </ul>
                                </ResultCard>
                            </div>
                        </div>
                    )}
                    {copiedText && <div className="copy-feedback">Copiado!</div>}
                </main>

                <footer>
                    <p>Criado com ❤️ por Ads Flow</p>
                </footer>
            </div>

            {showAuthModal && <AuthModal 
                onClose={() => setShowAuthModal(false)}
                onSuccess={() => {
                    setShowAuthModal(false);
                }}
            />}
            {showUpgradeModal && profile && <UpgradeModal 
                currentPlan={profile.plan}
                user={user}
                onClose={() => setShowUpgradeModal(false)}
            />}
        </>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}