// @ts-nocheck
/**
 * AnalyseIntelligenteModal - Analyse intelligente avec recommandations automatiques
 * Analyse les données prospects et propose des actions concrètes
 */
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
  ArrowRight,
  Zap,
  Clock,
  Users,
  Phone,
  Calendar,
  UserCheck,
  Activity,
  BarChart3,
  Shield,
  Flame,
  Award,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { prospectsApi } from '@/lib/api/prospects';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  open: boolean;
  onClose: () => void;
  filters?: {
    segment_id?: string;
    ville_id?: string;
  };
}

type RecommendationType = 'urgent' | 'important' | 'suggestion' | 'success';

interface Recommendation {
  type: RecommendationType;
  title: string;
  description: string;
  action: string;
  metric?: string;
  impact: 'high' | 'medium' | 'low';
}

interface HealthScore {
  score: number;
  label: string;
  color: string;
  icon: React.ReactNode;
}

// Fonction pour calculer le score de santé global
function calculateHealthScore(current: any, previous: any, ecart: any): HealthScore {
  let score = 50; // Score de base

  // Facteurs positifs
  if (current.total > previous.total) score += 10;
  if (current.avec_rdv > previous.avec_rdv) score += 15;
  if (current.inscrits_prospect > previous.inscrits_prospect) score += 20;
  if (current.taux_conversion > previous.taux_conversion) score += 15;

  // Facteurs négatifs
  if (current.non_contactes > current.total * 0.5) score -= 15;
  if (current.sans_rdv > current.avec_rdv) score -= 10;
  if (ecart?.ecart_prospect?.count > 5) score -= 10;

  // Normaliser entre 0 et 100
  score = Math.max(0, Math.min(100, score));

  if (score >= 80) {
    return { score, label: 'Excellent', color: 'text-green-600', icon: <Award className="h-6 w-6 text-green-500" /> };
  } else if (score >= 60) {
    return { score, label: 'Bon', color: 'text-blue-600', icon: <ThumbsUp className="h-6 w-6 text-blue-500" /> };
  } else if (score >= 40) {
    return { score, label: 'À améliorer', color: 'text-orange-600', icon: <AlertCircle className="h-6 w-6 text-orange-500" /> };
  } else {
    return { score, label: 'Critique', color: 'text-red-600', icon: <AlertTriangle className="h-6 w-6 text-red-500" /> };
  }
}

// Fonction pour générer les recommandations intelligentes
function generateRecommendations(current: any, previous: any, ecart: any): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Analyse des non-contactés
  const nonContactesRatio = current.total > 0 ? (current.non_contactes / current.total) * 100 : 0;
  if (nonContactesRatio > 50) {
    recommendations.push({
      type: 'urgent',
      title: 'Taux de non-contactés critique',
      description: `${nonContactesRatio.toFixed(0)}% de vos prospects n'ont pas été contactés. C'est un potentiel de conversion perdu.`,
      action: 'Planifier une campagne d\'appels intensive cette semaine',
      metric: `${current.non_contactes} prospects à contacter`,
      impact: 'high'
    });
  } else if (nonContactesRatio > 30) {
    recommendations.push({
      type: 'important',
      title: 'Non-contactés à surveiller',
      description: `${nonContactesRatio.toFixed(0)}% de prospects non contactés. Objectif recommandé: < 30%`,
      action: 'Allouer 2h/jour aux appels de prospection',
      metric: `${current.non_contactes} en attente`,
      impact: 'medium'
    });
  }

  // Analyse du taux de RDV
  const rdvRatio = current.total > 0 ? (current.avec_rdv / current.total) * 100 : 0;
  if (rdvRatio < 10 && current.total > 20) {
    recommendations.push({
      type: 'urgent',
      title: 'Taux de RDV très faible',
      description: `Seulement ${rdvRatio.toFixed(0)}% de RDV pris. La qualification des prospects doit être améliorée.`,
      action: 'Revoir le script d\'appel et les arguments commerciaux',
      metric: `Objectif: atteindre 20% de RDV`,
      impact: 'high'
    });
  }

  // Analyse de la conversion
  const conversionChange = previous.taux_conversion > 0
    ? ((current.taux_conversion - previous.taux_conversion) / previous.taux_conversion) * 100
    : 0;

  if (conversionChange < -20) {
    recommendations.push({
      type: 'urgent',
      title: 'Chute du taux de conversion',
      description: `Le taux de conversion a baissé de ${Math.abs(conversionChange).toFixed(0)}% par rapport au mois précédent.`,
      action: 'Analyser les causes: qualité des leads, concurrence, pricing?',
      metric: `Actuel: ${current.taux_conversion?.toFixed(1)}% vs ${previous.taux_conversion?.toFixed(1)}%`,
      impact: 'high'
    });
  } else if (conversionChange > 20) {
    recommendations.push({
      type: 'success',
      title: 'Excellente progression conversion',
      description: `+${conversionChange.toFixed(0)}% d'amélioration du taux de conversion!`,
      action: 'Documenter les bonnes pratiques pour les répliquer',
      metric: `${current.taux_conversion?.toFixed(1)}% de conversion`,
      impact: 'high'
    });
  }

  // Analyse des écarts
  if (ecart?.ecart_prospect?.count > 5) {
    recommendations.push({
      type: 'important',
      title: 'Écart prospect significatif',
      description: `${ecart.ecart_prospect.count} prospects marqués "inscrit" mais sans session associée.`,
      action: 'Vérifier et régulariser les inscriptions en attente',
      metric: `${ecart.ecart_prospect.count} à régulariser`,
      impact: 'medium'
    });
  }

  if (ecart?.ecart_session?.count > 5) {
    recommendations.push({
      type: 'suggestion',
      title: 'Écart session détecté',
      description: `${ecart.ecart_session.count} étudiants en session sans prospect correspondant.`,
      action: 'Vérifier la source de ces inscriptions (directes?)',
      metric: `${ecart.ecart_session.count} à vérifier`,
      impact: 'low'
    });
  }

  // Analyse des tendances positives
  if (current.inscrits_prospect > previous.inscrits_prospect * 1.2) {
    const increase = ((current.inscrits_prospect - previous.inscrits_prospect) / previous.inscrits_prospect * 100).toFixed(0);
    recommendations.push({
      type: 'success',
      title: 'Forte croissance des inscriptions',
      description: `+${increase}% d'inscriptions ce mois! L'équipe performe bien.`,
      action: 'Féliciter l\'équipe et maintenir la dynamique',
      metric: `${current.inscrits_prospect} inscrits ce mois`,
      impact: 'high'
    });
  }

  // Analyse des sessions non livrées
  const nonLivreesRatio = current.inscrits_session > 0
    ? (current.inscrits_session_non_livree / current.inscrits_session) * 100
    : 0;
  if (nonLivreesRatio > 40) {
    recommendations.push({
      type: 'important',
      title: 'Sessions non livrées élevées',
      description: `${nonLivreesRatio.toFixed(0)}% des sessions ne sont pas encore livrées.`,
      action: 'Vérifier le planning de livraison des formations',
      metric: `${current.inscrits_session_non_livree} en attente`,
      impact: 'medium'
    });
  }

  // Suggestion d'objectif si tout va bien
  if (recommendations.filter(r => r.type === 'urgent' || r.type === 'important').length === 0) {
    recommendations.push({
      type: 'suggestion',
      title: 'Objectif du mois prochain',
      description: 'Les indicateurs sont bons. Fixez un objectif ambitieux pour le mois prochain.',
      action: `Viser ${Math.ceil(current.inscrits_prospect * 1.15)} inscriptions (+15%)`,
      metric: `Actuel: ${current.inscrits_prospect}`,
      impact: 'medium'
    });
  }

  return recommendations;
}

// Composant pour afficher une recommandation
function RecommendationCard({ rec }: { rec: Recommendation }) {
  const typeStyles = {
    urgent: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      badge: 'bg-red-100 text-red-700',
      badgeText: 'Urgent'
    },
    important: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
      badge: 'bg-orange-100 text-orange-700',
      badgeText: 'Important'
    },
    suggestion: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      badge: 'bg-blue-100 text-blue-700',
      badgeText: 'Suggestion'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      badge: 'bg-green-100 text-green-700',
      badgeText: 'Succès'
    }
  };

  const style = typeStyles[rec.type];

  return (
    <Card className={`${style.bg} ${style.border} border-2`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{style.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{rec.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}>
                {style.badgeText}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
            {rec.metric && (
              <p className="text-xs text-gray-500 mb-2 font-mono bg-white/50 inline-block px-2 py-1 rounded">
                📊 {rec.metric}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mt-2 p-2 bg-white/60 rounded-lg">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Action: {rec.action}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant Score de santé
function HealthScoreDisplay({ health }: { health: HealthScore }) {
  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Score de Santé Global</p>
            <div className="flex items-center gap-3">
              <span className="text-5xl font-bold">{health.score}</span>
              <span className="text-2xl text-gray-400">/100</span>
            </div>
            <p className={`text-lg font-semibold mt-1 ${health.color.replace('text-', 'text-')}`}>
              {health.label}
            </p>
          </div>
          <div className="relative">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#374151"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={health.score >= 80 ? '#22c55e' : health.score >= 60 ? '#3b82f6' : health.score >= 40 ? '#f97316' : '#ef4444'}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${health.score * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {health.icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant KPI rapide
function QuickKPI({ label, value, trend, icon, color }: { label: string; value: string | number; trend?: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`p-4 rounded-xl ${color} border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-sm">{label}</span>
        {icon}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-sm flex items-center ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function AnalyseIntelligenteModal({ open, onClose, filters = {} }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dates pour le mois actuel et précédent
  const currentMonth = new Date();
  const currentStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const currentEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const previousStart = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
  const previousEnd = format(endOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');

  // Query pour les stats actuelles
  const { data: currentStats, isLoading: currentLoading, refetch: refetchCurrent } = useQuery({
    queryKey: ['analyse-current', filters.segment_id, filters.ville_id, currentStart, currentEnd],
    queryFn: () => prospectsApi.getAll({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: currentStart,
      date_to: currentEnd,
      page: 1,
      limit: 1,
    }),
    enabled: open,
  });

  // Query pour les stats précédentes
  const { data: previousStats, isLoading: previousLoading, refetch: refetchPrevious } = useQuery({
    queryKey: ['analyse-previous', filters.segment_id, filters.ville_id, previousStart, previousEnd],
    queryFn: () => prospectsApi.getAll({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: previousStart,
      date_to: previousEnd,
      page: 1,
      limit: 1,
    }),
    enabled: open,
  });

  // Query pour les écarts
  const { data: ecartData, refetch: refetchEcart } = useQuery({
    queryKey: ['analyse-ecart', filters.segment_id, filters.ville_id, currentStart, currentEnd],
    queryFn: () => prospectsApi.getEcartDetails({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: currentStart,
      date_to: currentEnd,
    }),
    enabled: open,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchCurrent(), refetchPrevious(), refetchEcart()]);
    setIsRefreshing(false);
  };

  const isLoading = currentLoading || previousLoading;

  const current = currentStats?.stats || {
    total: 0,
    non_contactes: 0,
    avec_rdv: 0,
    sans_rdv: 0,
    inscrits_prospect: 0,
    inscrits_session: 0,
    inscrits_session_livree: 0,
    inscrits_session_non_livree: 0,
    taux_conversion: 0,
  };

  const previous = previousStats?.stats || {
    total: 0,
    non_contactes: 0,
    avec_rdv: 0,
    sans_rdv: 0,
    inscrits_prospect: 0,
    inscrits_session: 0,
    inscrits_session_livree: 0,
    inscrits_session_non_livree: 0,
    taux_conversion: 0,
  };

  // Calculer les métriques
  const healthScore = useMemo(() => calculateHealthScore(current, previous, ecartData), [current, previous, ecartData]);
  const recommendations = useMemo(() => generateRecommendations(current, previous, ecartData), [current, previous, ecartData]);

  // Calculer les tendances
  const getTrend = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  const urgentCount = recommendations.filter(r => r.type === 'urgent').length;
  const importantCount = recommendations.filter(r => r.type === 'important').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Brain className="h-6 w-6 text-purple-500" />
              Analyse Intelligente
              <Badge variant="info" className="ml-2">IA</Badge>
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Analyse automatique de vos indicateurs avec recommandations personnalisées
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Brain className="h-16 w-16 text-purple-400 animate-pulse mb-4" />
            <p className="text-gray-600">Analyse en cours...</p>
            <p className="text-sm text-gray-400">L'IA examine vos données</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score de santé + Alertes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <HealthScoreDisplay health={healthScore} />
              </div>
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-3">Résumé des alertes</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Urgentes
                      </span>
                      <span className="font-bold text-red-700">{urgentCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <span className="text-sm text-orange-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Importantes
                      </span>
                      <span className="font-bold text-orange-700">{importantCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Succès
                      </span>
                      <span className="font-bold text-green-700">
                        {recommendations.filter(r => r.type === 'success').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPIs rapides */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Indicateurs Clés - {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickKPI
                  label="Total Prospects"
                  value={current.total}
                  trend={getTrend(current.total, previous.total)}
                  icon={<Users className="h-5 w-5 text-blue-500" />}
                  color="bg-blue-50 border-blue-200"
                />
                <QuickKPI
                  label="Taux Conversion"
                  value={`${(current.taux_conversion || 0).toFixed(1)}%`}
                  trend={getTrend(current.taux_conversion, previous.taux_conversion)}
                  icon={<Target className="h-5 w-5 text-purple-500" />}
                  color="bg-purple-50 border-purple-200"
                />
                <QuickKPI
                  label="RDV Pris"
                  value={current.avec_rdv}
                  trend={getTrend(current.avec_rdv, previous.avec_rdv)}
                  icon={<Calendar className="h-5 w-5 text-green-500" />}
                  color="bg-green-50 border-green-200"
                />
                <QuickKPI
                  label="Inscriptions"
                  value={current.inscrits_prospect}
                  trend={getTrend(current.inscrits_prospect, previous.inscrits_prospect)}
                  icon={<UserCheck className="h-5 w-5 text-cyan-500" />}
                  color="bg-cyan-50 border-cyan-200"
                />
              </div>
            </div>

            {/* Recommandations */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Recommandations & Actions
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <RecommendationCard key={index} rec={rec} />
                ))}
              </div>
            </div>

            {/* Conseil du jour */}
            <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Flame className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">💡 Conseil du jour</h4>
                    <p className="text-purple-100">
                      {healthScore.score >= 70
                        ? "Vos indicateurs sont bons! Profitez de cette dynamique pour fixer des objectifs plus ambitieux et explorer de nouveaux segments."
                        : healthScore.score >= 50
                        ? "Focus sur les prospects non-contactés cette semaine. Un appel de qualité convertit mieux que 10 emails."
                        : "Situation critique détectée. Organisez une réunion d'équipe pour identifier les blocages et définir un plan d'action rapide."
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t">
              <span>Analyse générée le {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Données analysées automatiquement
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
