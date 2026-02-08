// @ts-nocheck
import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Key,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings,
  Sparkles,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface AISettings {
  ai_provider?: string;
  ai_api_key?: string;
  ai_api_key_configured?: boolean;
  ai_model?: string;
  ai_enabled?: string;
}

const providers = [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Modèle Claude d\'Anthropic - Excellent pour l\'analyse',
    models: [
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Rapide, économique)' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet (Équilibré)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Plus puissant)' },
    ],
    docUrl: 'https://console.anthropic.com/',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    description: 'Modèles GPT d\'OpenAI',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Rapide, économique)' },
      { id: 'gpt-4o', name: 'GPT-4o (Plus puissant)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
    docUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    description: 'Modèles Gemini de Google',
    models: [
      { id: 'gemini-pro', name: 'Gemini Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Rapide)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Plus puissant)' },
    ],
    docUrl: 'https://aistudio.google.com/app/apikey',
  },
];

export default function AISettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AISettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await apiClient.get<AISettings>('/ai-settings');
        setSettings(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setTestResult(null);

    try {
      await apiClient.post('/ai-settings', {
        ai_provider: settings.ai_provider,
        ai_api_key: settings.ai_api_key,
        ai_model: settings.ai_model,
        ai_enabled: settings.ai_enabled === 'true',
      });

      // Reload settings to get masked API key
      const data = await apiClient.get<AISettings>('/ai-settings');
      setSettings(data);

      setTestResult({ success: true, message: 'Configuration sauvegardée avec succès!' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await apiClient.post<{ success: boolean; message: string }>('/ai-settings/test');
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const selectedProvider = providers.find(p => p.id === settings.ai_provider);

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Configuration IA
            </h1>
            <p className="text-gray-500 mt-1">
              Configurez l'intelligence artificielle pour l'analyse des données
            </p>
          </div>
        </div>

        {/* Warning Card */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Configuration sécurisée</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Votre clé API est stockée de manière sécurisée et n'est jamais exposée côté client.
                  Seuls les administrateurs peuvent accéder à cette page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Provider Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Fournisseur IA
                </CardTitle>
                <CardDescription>
                  Choisissez le fournisseur d'IA que vous souhaitez utiliser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      onClick={() => setSettings(s => ({ ...s, ai_provider: provider.id, ai_model: '' }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        settings.ai_provider === provider.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{provider.description}</div>
                      <a
                        href={provider.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 mt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Obtenir une clé API <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* API Key & Model */}
            {settings.ai_provider && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Configuration {selectedProvider?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api_key">Clé API</Label>
                    <div className="relative">
                      <Input
                        id="api_key"
                        type="password"
                        placeholder="sk-... ou votre clé API"
                        value={settings.ai_api_key || ''}
                        onChange={(e) => setSettings(s => ({ ...s, ai_api_key: e.target.value }))}
                        className="pr-24"
                      />
                      {settings.ai_api_key_configured && (
                        <Badge
                          variant="success"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Configurée
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Laissez vide pour conserver la clé existante
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modèle</Label>
                    <Select
                      value={settings.ai_model || ''}
                      onValueChange={(value) => setSettings(s => ({ ...s, ai_model: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProvider?.models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <div>
                        <Label htmlFor="enabled" className="text-base font-medium">
                          Activer l'IA
                        </Label>
                        <p className="text-sm text-gray-500">
                          Active les fonctionnalités d'analyse IA dans l'application
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="enabled"
                      checked={settings.ai_enabled === 'true'}
                      onCheckedChange={(checked) =>
                        setSettings(s => ({ ...s, ai_enabled: checked ? 'true' : 'false' }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-red-800">Erreur</div>
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {testResult && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div>
                  <div
                    className={`font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {testResult.success ? 'Succès' : 'Échec'}
                  </div>
                  <div
                    className={`text-sm ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {testResult.message}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !settings.ai_provider || !settings.ai_api_key_configured}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Tester la connexion
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !settings.ai_provider}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
