import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/ai-settings - Get AI configuration
router.get('/', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(`
      SELECT key, value FROM app_settings
      WHERE key LIKE 'ai_%'
    `);

    // Convert to object, mask API key
    const settings = {};
    result.rows.forEach(row => {
      if (row.key === 'ai_api_key' && row.value) {
        // Mask the API key, show only last 4 characters
        settings[row.key] = row.value.length > 4
          ? '*'.repeat(row.value.length - 4) + row.value.slice(-4)
          : '****';
        settings.ai_api_key_configured = true;
      } else {
        settings[row.key] = row.value;
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Failed to fetch AI settings' });
  }
});

// GET /api/ai-settings/status - Get AI configuration status (for all users)
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, value FROM app_settings
      WHERE key IN ('ai_provider', 'ai_api_key', 'ai_enabled')
    `);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    const isConfigured = Boolean(
      settings.ai_provider &&
      settings.ai_api_key &&
      settings.ai_enabled === 'true'
    );

    res.json({
      configured: isConfigured,
      provider: settings.ai_provider || null,
      enabled: settings.ai_enabled === 'true'
    });
  } catch (error) {
    console.error('Error fetching AI status:', error);
    res.status(500).json({ error: 'Failed to fetch AI status' });
  }
});

// POST /api/ai-settings - Save AI configuration
router.post('/', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ai_provider, ai_api_key, ai_model, ai_enabled } = req.body;

    // Validate provider
    const validProviders = ['claude', 'openai', 'gemini'];
    if (ai_provider && !validProviders.includes(ai_provider)) {
      return res.status(400).json({ error: 'Invalid AI provider' });
    }

    // Upsert settings
    const settings = [
      { key: 'ai_provider', value: ai_provider || '' },
      { key: 'ai_model', value: ai_model || '' },
      { key: 'ai_enabled', value: ai_enabled ? 'true' : 'false' }
    ];

    // Only update API key if provided (not masked)
    if (ai_api_key && !ai_api_key.includes('*')) {
      settings.push({ key: 'ai_api_key', value: ai_api_key });
    }

    for (const setting of settings) {
      await pool.query(`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [setting.key, setting.value]);
    }

    res.json({ success: true, message: 'AI settings saved successfully' });
  } catch (error) {
    console.error('Error saving AI settings:', error);
    res.status(500).json({ error: 'Failed to save AI settings' });
  }
});

// POST /api/ai-settings/test - Test AI connection
router.post('/test', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get current settings
    const result = await pool.query(`
      SELECT key, value FROM app_settings
      WHERE key IN ('ai_provider', 'ai_api_key', 'ai_model')
    `);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    if (!settings.ai_provider || !settings.ai_api_key) {
      return res.status(400).json({ error: 'AI not configured' });
    }

    // Test connection based on provider
    let testResult = { success: false, message: '' };

    try {
      if (settings.ai_provider === 'claude') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.ai_api_key,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: settings.ai_model || 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Test' }]
          })
        });

        if (response.ok) {
          testResult = { success: true, message: 'Connection to Claude API successful' };
        } else {
          const error = await response.json();
          testResult = { success: false, message: error.error?.message || 'Connection failed' };
        }
      } else if (settings.ai_provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.ai_api_key}`
          },
          body: JSON.stringify({
            model: settings.ai_model || 'gpt-4o-mini',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Test' }]
          })
        });

        if (response.ok) {
          testResult = { success: true, message: 'Connection to OpenAI API successful' };
        } else {
          const error = await response.json();
          testResult = { success: false, message: error.error?.message || 'Connection failed' };
        }
      } else if (settings.ai_provider === 'gemini') {
        const modelName = settings.ai_model || 'gemini-2.0-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${settings.ai_api_key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Test' }] }]
          })
        });

        if (response.ok) {
          testResult = { success: true, message: 'Connection to Gemini API successful' };
        } else {
          const error = await response.json();
          testResult = { success: false, message: error.error?.message || 'Connection failed' };
        }
      }
    } catch (fetchError) {
      testResult = { success: false, message: `Network error: ${fetchError.message}` };
    }

    res.json(testResult);
  } catch (error) {
    console.error('Error testing AI connection:', error);
    res.status(500).json({ error: 'Failed to test AI connection' });
  }
});

// POST /api/ai-settings/analyze - Run AI analysis on prospects data
router.post('/analyze', async (req, res) => {
  try {
    const { indicators, filters } = req.body;

    // Get AI settings
    const settingsResult = await pool.query(`
      SELECT key, value FROM app_settings
      WHERE key IN ('ai_provider', 'ai_api_key', 'ai_model', 'ai_enabled')
    `);

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    if (!settings.ai_enabled || settings.ai_enabled !== 'true') {
      return res.status(400).json({
        error: 'AI not enabled',
        code: 'AI_NOT_ENABLED',
        message: 'L\'IA n\'est pas activée. Contactez l\'administrateur pour configurer l\'IA.'
      });
    }

    if (!settings.ai_provider || !settings.ai_api_key) {
      return res.status(400).json({
        error: 'AI not configured',
        code: 'AI_NOT_CONFIGURED',
        message: 'L\'IA n\'est pas configurée. Contactez l\'administrateur.'
      });
    }

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(indicators, filters);

    // Call AI API based on provider
    let aiResponse;
    try {
      if (settings.ai_provider === 'claude') {
        aiResponse = await callClaudeAPI(settings.ai_api_key, settings.ai_model, prompt);
      } else if (settings.ai_provider === 'openai') {
        aiResponse = await callOpenAIAPI(settings.ai_api_key, settings.ai_model, prompt);
      } else if (settings.ai_provider === 'gemini') {
        aiResponse = await callGeminiAPI(settings.ai_api_key, settings.ai_model, prompt);
      } else {
        return res.status(400).json({ error: 'Unknown AI provider' });
      }
    } catch (apiError) {
      console.error('AI API error:', apiError);
      return res.status(500).json({
        error: 'AI API error',
        message: apiError.message
      });
    }

    res.json({
      success: true,
      analysis: aiResponse,
      provider: settings.ai_provider,
      model: settings.ai_model
    });

  } catch (error) {
    console.error('Error running AI analysis:', error);
    res.status(500).json({ error: 'Failed to run AI analysis' });
  }
});

// Helper function to build the analysis prompt
function buildAnalysisPrompt(indicators, filters) {
  const { current, previous, ecart } = indicators;

  return `Tu es un expert en analyse commerciale et CRM pour un centre de formation professionnelle au Maroc.

## CONTEXTE DE L'ACTIVITÉ
- Secteur: Formation professionnelle (comptabilité, gestion, informatique)
- Modèle commercial: Prospection téléphonique et digitale → Rendez-vous → Inscription → Formation
- Cycle de vente: Court (1-2 semaines en moyenne)
- Cibles: Jeunes diplômés, professionnels en reconversion, entreprises

## DONNÉES ACTUELLES (Période en cours)
${JSON.stringify(current, null, 2)}

## DONNÉES PRÉCÉDENTES (Période de comparaison)
${JSON.stringify(previous, null, 2)}

## ÉCARTS IDENTIFIÉS
${JSON.stringify(ecart, null, 2)}

## FILTRES APPLIQUÉS
- Segment: ${filters?.segment_id ? 'Filtré' : 'Tous les segments'}
- Ville: ${filters?.ville_id ? 'Filtré' : 'Toutes les villes'}

## INSTRUCTIONS D'ANALYSE
Analyse ces indicateurs et fournis:

1. **DIAGNOSTIC** (2-3 phrases)
   - État de santé global du pipeline commercial
   - Points critiques nécessitant une action immédiate

2. **INDICATEURS CLÉS** (format JSON pour graphiques)
   Retourne un objet JSON avec la structure suivante pour afficher des graphiques:
   \`\`\`json
   {
     "healthScore": <0-100>,
     "kpis": [
       {"name": "Taux de conversion", "value": <number>, "target": <number>, "unit": "%", "status": "good|warning|critical"},
       {"name": "Taux de contact", "value": <number>, "target": <number>, "unit": "%", "status": "good|warning|critical"},
       ...
     ],
     "trends": [
       {"metric": "Inscriptions", "current": <number>, "previous": <number>, "change": <number>, "trend": "up|down|stable"}
     ],
     "funnelData": [
       {"stage": "Prospects", "count": <number>},
       {"stage": "Contactés", "count": <number>},
       {"stage": "Intéressés", "count": <number>},
       {"stage": "RDV", "count": <number>},
       {"stage": "Inscrits", "count": <number>}
     ]
   }
   \`\`\`

3. **RECOMMANDATIONS PRIORITAIRES** (format JSON)
   \`\`\`json
   {
     "recommendations": [
       {
         "priority": "urgent|high|medium",
         "title": "Titre court",
         "description": "Description de l'action",
         "expectedImpact": "Impact attendu",
         "timeframe": "Cette semaine|Ce mois|Ce trimestre"
       }
     ]
   }
   \`\`\`

4. **ALERTES** (si applicable)
   Signale tout indicateur anormal ou situation critique.

IMPORTANT:
- Sois concis et actionnable
- Adapte tes recommandations au contexte marocain
- Concentre-toi sur les actions à fort impact
- Retourne les sections 2 et 3 en JSON valide pour permettre l'affichage de graphiques`;
}

// Helper function to call Claude API
async function callClaudeAPI(apiKey, model, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude API error');
  }

  const data = await response.json();
  return data.content[0].text;
}

// Helper function to call OpenAI API
async function callOpenAIAPI(apiKey, model, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      max_tokens: 4000,
      messages: [
        { role: 'system', content: 'Tu es un expert en analyse commerciale CRM.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Helper function to call Gemini API
async function callGeminiAPI(apiKey, model, prompt) {
  const modelName = model || 'gemini-2.0-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4000 }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export default router;
