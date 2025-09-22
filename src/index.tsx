import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, Session } from '@supabase/supabase-js';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

// --- Type Definitions ---
type Theme = 'light' | 'dark';

type Sitelink = {
  text: string;
  description1: string;
  description2: string;
};

type CampaignData = {
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
  sitelinks: Sitelink[];
  callouts: string[];
  structuredSnippets: string[];
  negativeKeywords: string[];
};

// --- Supabase Client Initialization ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Helper Functions & Constants ---
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password: string) => password.length >= 6;

// --- UI Components ---
const ThemeToggleButton = ({ theme, onClick }: { theme: Theme; onClick: () => void }) => (
    <button onClick={onClick} className="theme-toggle-btn" aria-label={`Mudar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}>
        {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        )}
    </button>
);

const AuthModal = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Por favor, insira um e-mail válido.');
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword && !validatePassword(newPassword)) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
    } else {
      setPasswordError(null);
    }
  };
  
  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError || passwordError || !email || !password) {
      setError("Por favor, corrija os erros antes de continuar.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    
    const action = isLogin ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error: authError } = await action({ email, password });

    if (authError) {
      setError(authError.message);
    } else if (!isLogin) {
      setMessage('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <h2>{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h2>
        
        <button className="btn google-btn" onClick={handleGoogleLogin} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.6114V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"></path><path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.6114C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.96182 14.4205 5.23727 13.0182 4.56545 11.1818H1.55636V13.4441C3.03364 16.2027 5.79545 18 9 18Z" fill="#34A853"></path><path d="M4.56545 11.1818C4.35636 10.5632 4.24091 9.89909 4.24091 9.18545C4.24091 8.47182 4.35636 7.80773 4.56545 7.18909V4.92682H1.55636C0.822273 6.32909 0.363636 7.91591 0.363636 9.23136C0.363636 10.5468 0.822273 12.1336 1.55636 13.5359L4.56545 11.1818Z" fill="#FBBC05"></path><path d="M9 3.95C10.2318 3.95 11.295 4.36182 12.0818 5.10182L15.0218 2.34455C13.4618 0.891818 11.4255 0 9 0C5.79545 0 3.03364 1.79727 1.55636 4.55591L4.56545 6.81818C5.23727 4.98182 6.96182 3.95 9 3.95Z" fill="#EA4335"></path></svg>
          Continuar com o Google
        </button>

        <div className="divider">OU</div>
        
        <form onSubmit={handleAuthAction}>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={handleEmailChange} required />
            {emailError && <p className="error-text">{emailError}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="password-input-wrapper">
              <input id="password" className="input-field" type={showPassword ? 'text' : 'password'} value={password} onChange={handlePasswordChange} onKeyUp={checkCapsLock} onKeyDown={checkCapsLock} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? 
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                }
              </button>
            </div>
            {passwordError && <p className="error-text">{passwordError}</p>}
            {isCapsLockOn && <p className="caps-lock-warning">Caps Lock está ativado</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}</button>
        </form>
        {error && <p className="error-text" style={{textAlign: 'center', marginTop: '1rem'}}>{error}</p>}
        {message && <p className="feedback-text" style={{textAlign: 'center', marginTop: '1rem', color: 'var(--color-success)'}}>{message}</p>}
        <div className="auth-modal-switch">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}>
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesPageHeader = ({ onLoginClick, theme, onToggleTheme }: { onLoginClick: () => void; theme: Theme; onToggleTheme: () => void }) => (
    <header className="sales-header">
        <div className="sales-container">
            <span className="logo">Ads Flow</span>
            <nav className="sales-nav">
                <a href="#features">Funcionalidades</a>
                <a href="#pricing">Preços</a>
                <button onClick={onLoginClick} className="btn btn-secondary btn-login">Entrar</button>
                <ThemeToggleButton theme={theme} onClick={onToggleTheme} />
            </nav>
            <button className="mobile-nav-toggle" aria-label="Toggle navigation" onClick={() => {
                document.querySelector('.sales-nav')?.classList.toggle('active');
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
        </div>
    </header>
);

const SalesPageFooter = () => (
    <footer className="sales-footer">
        <div className="sales-container">
            <p>&copy; {new Date().getFullYear()} Ads Flow. Todos os direitos reservados.</p>
        </div>
    </footer>
);


const SalesPage = ({ onLoginClick, theme, onToggleTheme }: { onLoginClick: () => void; theme: Theme; onToggleTheme: () => void }) => {
    useEffect(() => {
        const nav = document.querySelector('.sales-nav');
        const links = nav?.querySelectorAll('a, button');
        const toggle = document.querySelector('.mobile-nav-toggle');

        const closeMenu = () => nav?.classList.remove('active');

        const handleLinkClick = (e: Event) => {
            const target = e.currentTarget as HTMLAnchorElement;
            const href = target.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
            }
            if (target.tagName.toLowerCase() !== 'button' || !target.classList.contains('theme-toggle-btn')) {
                closeMenu();
            }
        };

        links?.forEach(link => link.addEventListener('click', handleLinkClick));
        
        const handleClickOutside = (event: MouseEvent) => {
            if (nav?.classList.contains('active') && nav && !nav.contains(event.target as Node) && toggle && !toggle.contains(event.target as Node)) {
                closeMenu();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            links?.forEach(link => link.removeEventListener('click', handleLinkClick));
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
    <div className="sales-page-wrapper">
        <SalesPageHeader onLoginClick={onLoginClick} theme={theme} onToggleTheme={onToggleTheme} />
        <main>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="sales-container">
                    <h1>Crie Anúncios na Rede de Pesquisa para Google Ads 10x mais Rápido</h1>
                    <p className="subtitle">O Ads Flow gera estruturas completas com palavras-chave, anúncios e extensões em segundos. Otimize seu tempo e maximize seus resultados.</p>
                    <button className="btn btn-primary btn-cta" onClick={onLoginClick}>Comece Agora de Graça</button>
                    <p className="sub-cta">Não é necessário cartão de crédito.</p>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="how-it-works-section">
                <div className="sales-container">
                    <h2>Como o Gerador de Campanhas Google Ads Funciona</h2>
                    <div className="steps-container">
                        <div className="step">
                            <div className="step-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            </div>
                            <h3>1. Descreva seu Negócio</h3>
                            <p>Forneça uma breve descrição do seu produto ou serviço. Quanto mais detalhes, melhor a campanha.</p>
                        </div>
                        <div className="step">
                            <div className="step-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M2 8c0-2.2.7-4.3 2-6" /><path d="M22 8c0-2.2-.7-4.3-2-6" /><path d="m9 2 1 1 1-1" /><path d="m13 2 1 1 1-1" /></svg>
                            </div>
                            <h3>2. Gere com um Clique</h3>
                            <p>Nossa IA analisará sua descrição e criará uma estrutura de campanha completa em segundos.</p>
                        </div>
                        <div className="step">
                            <div className="step-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </div>
                            <h3>3. Exporte e Use</h3>
                            <p>Revise, ajuste e exporte sua campanha como um PDF profissional para usar no Google Ads.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="sales-container">
                    <h2>Recursos para uma Campanha Google Ads de Sucesso</h2>
                    <div className="features-grid">
                        <div className="feature-item">
                            <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg></div>
                            <h3>Estrutura Completa</h3>
                            <p>Receba uma estrutura otimizada com grupos de anúncios, títulos, descrições, palavras-chave, sitelinks e mais.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 13-1.4-4-5.1 5.1" /><path d="M12 2a10 10 0 1 0 10 10" /><path d="M2 12h4" /><path d="m20.5 7.5-.4.4" /><path d="M12 22v-4" /></svg></div>
                            <h3>Palavras-chave Relevantes</h3>
                            <p>Sugestões de palavras-chave baseadas na intenção de busca do seu público-alvo para atrair os clientes certos.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 11 2-2-2-2" /><path d="M11 13h4" /><path d="M5 21h14" /><path d="M5 3h14" /><path d="M17 3v18" /><path d="M7 3v18" /></svg></div>
                            <h3>Anúncios Persuasivos</h3>
                            <p>Textos de anúncio criados com técnicas de copywriting e otimizados para aumentar o CTR e as conversões.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg></div>
                            <h3>Extensões de Anúncio</h3>
                            <p>Gere Sitelinks, Callouts e Snippets Estruturados para aumentar a visibilidade e o Índice de Qualidade do seu anúncio.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 6 0" /></svg></div>
                            <h3>Palavras-chave Negativas</h3>
                            <p>Obtenha uma lista extensa de palavras-chave negativas para evitar cliques irrelevantes e gastos desnecessários.</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg></div>
                            <h3>Exportação Fácil</h3>
                            <p>Exporte sua campanha completa em formato PDF para compartilhar com sua equipe ou clientes.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="pricing-section">
                <div className="sales-container">
                    <h2>Planos e Preços Acessíveis</h2>
                    <div className="pricing-grid">
                        <div className="pricing-card">
                            <h3>Free</h3>
                            <p className="plan-description">Para experimentar e criar suas primeiras campanhas.</p>
                            <div className="price">Grátis</div>
                            <ul>
                                <li>2 Gerações por Mês</li>
                                <li>Funcionalidades Essenciais</li>
                                <li>Exportação em PDF</li>
                            </ul>
                            <button className="btn btn-primary" onClick={onLoginClick}>Comece Agora</button>
                        </div>
                        <div className="pricing-card popular">
                            <h3>Business</h3>
                            <p className="plan-description">Para profissionais e pequenas empresas.</p>
                            <div className="price">Em Breve</div>
                            <ul>
                                <li>15 Gerações por Mês</li>
                                <li>Todas as Funcionalidades</li>
                                <li>Suporte Prioritário</li>
                            </ul>
                            <button className="btn btn-secondary" disabled>Em Breve</button>
                        </div>
                        <div className="pricing-card">
                            <h3>Agency</h3>
                            <p className="plan-description">Para agências e uso intensivo.</p>
                            <div className="price">Em Breve</div>
                            <ul>
                                <li>Gerações Ilimitadas</li>
                                <li>Suporte Dedicado 24/7</li>
                                <li>Acesso à API</li>
                            </ul>
                            <button className="btn btn-secondary" disabled>Em Breve</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="sales-container">
                    <h2>Otimize suas Campanhas Google Ads Hoje</h2>
                    <p>Comece a usar o Ads Flow hoje mesmo e veja a diferença que a IA pode fazer.</p>
                    <button className="btn btn-primary btn-cta" onClick={onLoginClick}>Criar minha primeira campanha</button>
                </div>
            </section>
        </main>
        <SalesPageFooter />
    </div>
    );
};

const CampaignGenerator = ({ session, theme, onToggleTheme }: { session: Session; theme: Theme; onToggleTheme: () => void; }) => {
    const [prompt, setPrompt] = useState('');
    const [campaign, setCampaign] = useState<CampaignData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("O prompt não pode estar vazio.");
            return;
        }
        setLoading(true);
        setError(null);
        setCampaign(null);

        try {
            const { data, error: functionError } = await supabase.functions.invoke('generate-campaign', {
                body: { prompt },
            });

            if (functionError) {
                const context = (functionError as any).context;
                let errorMessage = functionError.message;
                if (context && context.json) {
                    try { const errorBody = await context.json(); if (errorBody.error) errorMessage = errorBody.error; } catch (e) {}
                }
                throw new Error(errorMessage);
            }
            setCampaign(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogout = async () => await supabase.auth.signOut();
    
    return (
      <div className="app-container">
          <header className="app-header">
              <h1>Gerador de Campanhas</h1>
              <div className="user-info">
                  <ThemeToggleButton theme={theme} onClick={onToggleTheme} />
                  <span>{session.user.email}</span>
                  <button onClick={handleLogout} className="btn btn-danger">Sair</button>
              </div>
          </header>
          
          <div className="form-group">
            <label htmlFor="prompt">Descreva seu produto ou serviço:</label>
            <textarea
                id="prompt"
                className="input-field"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: 'Uma loja online que vende carteiras de couro artesanais para homens.'"
                disabled={loading}
            />
          </div>

          <button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="btn btn-primary">
              {loading ? 'Gerando...' : 'Gerar Campanha'}
          </button>
          
          {loading && (
            <div className="loader-container">
                <div className="spinner"></div>
                <p>Gerando campanha, isso pode levar um momento...</p>
            </div>
          )}
          {error && <p className="error-text"><strong>Erro:</strong> {error}</p>}
          {campaign && <CampaignDisplay campaign={campaign} prompt={prompt} />}
      </div>
    );
};

const CampaignDisplay = ({ campaign, prompt }: { campaign: CampaignData, prompt: string }) => {
  const handlePrint = async () => {
    try {
      const response = await fetch('/print_template.html');
      if (!response.ok) throw new Error('Template de impressão não encontrado.');
      
      let template = await response.text();

      const escapeHtml = (text: string) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      let contentHtml = '';
      contentHtml += `<h2>Títulos (Headlines)</h2><div class="section-content"><ul>${(campaign.headlines ?? []).map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul></div>`;
      contentHtml += `<h2>Descrições</h2><div class="section-content"><ul>${(campaign.descriptions ?? []).map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul></div>`;
      
      contentHtml += `<h2>Palavras-chave</h2>
        <table class="keywords-table">
          <thead><tr><th>Ampla</th><th>Frase</th><th>Exata</th></tr></thead>
          <tbody><tr>
            <td><ul>${(campaign.keywords?.broad ?? []).map(k => `<li>${escapeHtml(k)}</li>`).join('')}</ul></td>
            <td><ul>${(campaign.keywords?.phrase ?? []).map(k => `<li>"${escapeHtml(k)}"</li>`).join('')}</ul></td>
            <td><ul>${(campaign.keywords?.exact ?? []).map(k => `<li>[${escapeHtml(k)}]</li>`).join('')}</ul></td>
          </tr></tbody>
        </table>`;

      contentHtml += `<h2>Sitelinks</h2>${(campaign.sitelinks ?? []).map(s => `
        <div class="sitelink-item">
          <h4>${escapeHtml(s.text)}</h4>
          <p>${escapeHtml(s.description1)}<br/>${escapeHtml(s.description2)}</p>
        </div>`).join('')}`;

      contentHtml += `<h2>Frases de Destaque (Callouts)</h2><div class="section-content"><ul>${(campaign.callouts ?? []).map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`;
      contentHtml += `<h2>Snippets Estruturados</h2><div class="section-content"><ul>${(campaign.structuredSnippets ?? []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>`;
      contentHtml += `<h2>Palavras-chave Negativas</h2><ul class="negative-keywords-list">${(campaign.negativeKeywords ?? []).map(n => `<li>-${escapeHtml(n)}</li>`).join('')}</ul>`;

      template = template.replace(/\[CAMPAIGN_TITLE\]/g, escapeHtml(`${campaign.companyName} - Campanha Google Ads`));
      template = template.replace(/\[PROMPT\]/g, escapeHtml(prompt));
      template = template.replace(/\[GENERATION_DATE\]/g, new Date().toLocaleDateString('pt-BR'));
      template = template.replace('[CAMPAIGN_CONTENT]', contentHtml);

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(template);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      } else {
        alert('Por favor, habilite pop-ups para imprimir o relatório.');
      }
    } catch (error) {
      console.error("Erro ao gerar impressão:", error);
      alert("Não foi possível gerar o relatório para impressão.");
    }
  };

  const renderList = (items: string[] | undefined) => {
      if (!items || items.length === 0) return <p>N/A</p>;
      return <ul className="result-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
  };
  
  const renderSitelinks = (items: Sitelink[] | undefined) => {
    if (!items || items.length === 0) return <p>N/A</p>;
    return (
      <ul className="result-list">
        {items.map((s, i) => (
          <li key={i}><strong>{s.text}</strong><br />{s.description1}<br />{s.description2}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="result-container">
      <div className="result-header">
        <h2>Campanha Gerada</h2>
        <button onClick={handlePrint} className="btn btn-secondary">
          <span role="img" aria-label="Impressora">🖨️</span> Imprimir / Exportar PDF
        </button>
      </div>

      <details className="result-section" open>
        <summary>Informações Gerais</summary>
        <div className="result-content">
          <p><strong>Empresa:</strong> {campaign.companyName ?? 'N/A'}</p>
          <p><strong>URL Final:</strong> <a href={campaign.finalUrl} target="_blank" rel="noopener noreferrer">{campaign.finalUrl ?? 'N/A'}</a></p>
          <p><strong>Caminho de Exibição:</strong> /{campaign.displayPath1 ?? ''}/{campaign.displayPath2 ?? ''}</p>
        </div>
      </details>
      
      <details className="result-section"><summary>Títulos ({(campaign.headlines ?? []).length})</summary><div className="result-content">{renderList(campaign.headlines)}</div></details>
      <details className="result-section"><summary>Descrições ({(campaign.descriptions ?? []).length})</summary><div className="result-content">{renderList(campaign.descriptions)}</div></details>

      <details className="result-section">
        <summary>Palavras-chave</summary>
        <div className="result-content keyword-group">
            <h4>Correspondência Ampla ({(campaign.keywords?.broad ?? []).length})</h4>{renderList(campaign.keywords?.broad)}
            <h4>Correspondência de Frase ({(campaign.keywords?.phrase ?? []).length})</h4>{renderList((campaign.keywords?.phrase ?? []).map(k => `"${k}"`))}
            <h4>Correspondência Exata ({(campaign.keywords?.exact ?? []).length})</h4>{renderList((campaign.keywords?.exact ?? []).map(k => `[${k}]`))}
        </div>
      </details>
      
      <details className="result-section"><summary>Sitelinks ({(campaign.sitelinks ?? []).length})</summary><div className="result-content">{renderSitelinks(campaign.sitelinks)}</div></details>
      <details className="result-section"><summary>Frases de Destaque ({(campaign.callouts ?? []).length})</summary><div className="result-content">{renderList(campaign.callouts)}</div></details>
      <details className="result-section"><summary>Snippets Estruturados ({(campaign.structuredSnippets ?? []).length})</summary><div className="result-content">{renderList(campaign.structuredSnippets)}</div></details>
      <details className="result-section"><summary>Palavras-chave Negativas ({(campaign.negativeKeywords ?? []).length})</summary><div className="result-content">{renderList(campaign.negativeKeywords)}</div></details>
    </div>
  );
};

const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<Theme>(() => {
        return (localStorage.getItem('theme') as Theme | null) || 'dark';
    });

    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            return newTheme;
        });
    };

    useEffect(() => {
        document.body.className = `${theme}-theme`;
    }, [theme]);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) setShowLogin(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
      return <div style={{textAlign: 'center', paddingTop: '4rem'}}>Carregando...</div>;
    }
    
    if (session) {
      return <CampaignGenerator session={session} theme={theme} onToggleTheme={toggleTheme} />;
    }
    
    if (showLogin) {
      return <AuthModal />;
    }

    return <SalesPage onLoginClick={() => setShowLogin(true)} theme={theme} onToggleTheme={toggleTheme} />;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount the application.");

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
        <Analytics />
    </React.StrictMode>
);