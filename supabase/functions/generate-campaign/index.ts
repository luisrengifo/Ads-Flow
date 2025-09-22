import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@1.20.0';

// Fix: Add a declaration for the `Deno` global object to resolve TypeScript errors.
// The Supabase Edge Function runtime provides this global, but the static analysis
// tool appears to be missing the necessary Deno type definitions.
declare const Deno: any;

// CORS headers to allow requests from the web app
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This schema must be kept in sync with the AI's expectations.
const campaignSchema = {
    type: Type.OBJECT,
    properties: {
        finalUrl: { type: Type.STRING, description: "A URL final relevante para o produto/serviço. Ex: https://example.com/produto" },
        displayPath1: { type: Type.STRING, description: "Primeiro caminho de exibição, até 15 caracteres." },
        displayPath2: { type: Type.STRING, description: "Segundo caminho de exibição, até 15 caracteres." },
        headlines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "8 títulos de anúncio, cada um com até 30 caracteres." },
        descriptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 descrições de anúncio, cada uma com até 90 caracteres." },
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
            description: "4 extensões de sitelink.",
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
        callouts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "6 frases de destaque, cada uma com até 25 caracteres." },
        structuredSnippets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "6 snippets estruturados, cada um com até 25 caracteres." },
        negativeKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista de 20 palavras-chave negativas relevantes." }
    },
    required: ["finalUrl", "displayPath1", "displayPath2", "headlines", "descriptions", "companyName", "keywords", "sitelinks", "callouts", "structuredSnippets", "negativeKeywords"]
};

type Plan = 'free' | 'business' | 'agency';
const PLAN_LIMITS: Record<Plan, number> = {
    free: 2,
    business: 15,
    agency: Infinity
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { prompt } = await req.json();
        if (!prompt) {
            return new Response(JSON.stringify({ error: 'O prompt é obrigatório' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Cabeçalho de autorização é obrigatório' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }
        
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Falha na autenticação' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('plan, generations_used, generation_reset_date')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: 'Não foi possível recuperar o perfil do usuário' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }
        
        const now = new Date();
        const lastReset = new Date(profile.generation_reset_date);
        let currentUsage = profile.generations_used;

        if (now.getFullYear() > lastReset.getFullYear() || now.getMonth() > lastReset.getMonth()) {
            currentUsage = 0;
        }

        const userLimit = PLAN_LIMITS[profile.plan as Plan] ?? 2;
        if (currentUsage >= userLimit) {
             return new Response(JSON.stringify({ error: 'Limite de gerações atingido. Por favor, faça um upgrade no seu plano.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
            });
        }
        
        const API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!API_KEY) {
            return new Response(JSON.stringify({ error: 'Chave da API não configurada no servidor' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const systemInstruction = `Você é um especialista em Google Ads. Sua tarefa é criar uma estrutura de campanha para a Rede de Pesquisa, otimizada para performance e relevância, baseada na descrição do negócio fornecida pelo usuário. A resposta DEVE ser um JSON válido que siga o schema fornecido. Seja rápido e conciso.`;
        
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Descrição do negócio: "${prompt}"`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: campaignSchema,
            },
        });
        
        const responseText = result.text;
        if (!responseText) {
            return new Response(JSON.stringify({ error: 'A API retornou uma resposta vazia' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }
        
        const newUsage = currentUsage + 1;
        const updateData: { generations_used: number; generation_reset_date?: string } = {
            generations_used: newUsage
        };
        if (currentUsage === 0) {
            updateData.generation_reset_date = now.toISOString();
        }
        
        await supabaseAdmin.from('profiles').update(updateData).eq('id', user.id);

        return new Response(responseText, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Ocorreu um erro interno' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});