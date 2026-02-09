// @ts-nocheck
/**
 * IndicateursProspects - Dashboard complet des indicateurs commerciaux
 * Utilise Apache ECharts pour des graphiques performants et interactifs
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  CalendarDays,
  CalendarRange,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Download,
  Sparkles,
  ArrowLeft,
  Phone,
  UserCheck,
  Percent
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import { prospectsApi } from '@/lib/api/prospects';

type PeriodType = 'mensuel' | 'annuel';

// Couleurs pour les statuts
const STATUS_COLORS = {
  'non contacté': '#f97316',
  'contacté avec rdv': '#22c55e',
  'contacté sans rdv': '#6b7280',
  'contacté sans reponse': '#94a3b8',
  'boîte vocale': '#a855f7',
  'non intéressé': '#ef4444',
  'déjà inscrit': '#06b6d4',
  'à recontacter': '#eab308',
  'inscrit': '#3b82f6',
  'inconnu': '#d1d5db'
};

// Composant KPI Card
function KPICard({
  title,
  value,
  suffix = '',
  trend,
  trendValue,
  icon,
  color = 'blue'
}: {
  title: string;
  value: number | string;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    cyan: 'from-cyan-500 to-cyan-600'
  };

  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-r ${colorClasses[color] || colorClasses.blue} p-4`}>
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="text-3xl font-bold mt-1">
              {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
              {suffix}
            </p>
          </div>
          <div className="bg-white/20 p-3 rounded-xl">
            {icon}
          </div>
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2 text-white/90 text-sm">
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : trend === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// Composant Recommandation
function RecommendationCard({ rec }: { rec: any }) {
  const priorityConfig = {
    urgent: { color: 'bg-red-100 border-red-300 text-red-800', icon: <AlertTriangle className="h-5 w-5 text-red-500" />, badge: 'destructive' },
    high: { color: 'bg-orange-100 border-orange-300 text-orange-800', icon: <AlertTriangle className="h-5 w-5 text-orange-500" />, badge: 'warning' },
    medium: { color: 'bg-yellow-100 border-yellow-300 text-yellow-800', icon: <Lightbulb className="h-5 w-5 text-yellow-600" />, badge: 'secondary' },
    success: { color: 'bg-green-100 border-green-300 text-green-800', icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, badge: 'success' }
  };

  const config = priorityConfig[rec.priority] || priorityConfig.medium;

  return (
    <div className={`${config.color} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{rec.title}</h4>
            <Badge variant={config.badge as any} className="text-xs">
              {rec.priority.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm mb-2">{rec.description}</p>
          <div className="text-xs space-y-1 opacity-80">
            <p><strong>Contexte:</strong> {rec.context}</p>
            <p><strong>Impact attendu:</strong> {rec.expectedImpact}</p>
            <p><strong>Responsable:</strong> {rec.responsable} | <strong>Délai:</strong> {rec.timeframe}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IndicateursProspects() {
  const navigate = useNavigate();
  const [periodType, setPeriodType] = useState<PeriodType>('mensuel');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters, setFilters] = useState({ segment_id: '', ville_id: '' });

  // Calcul des dates
  const dateRanges = useMemo(() => {
    if (periodType === 'mensuel') {
      return {
        current: {
          start: format(startOfMonth(selectedDate), 'yyyy-MM-dd'),
          end: format(endOfMonth(selectedDate), 'yyyy-MM-dd'),
          label: format(selectedDate, 'MMMM yyyy', { locale: fr })
        },
        previous: {
          start: format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd'),
          end: format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd'),
          label: format(subMonths(selectedDate, 1), 'MMMM yyyy', { locale: fr })
        }
      };
    } else {
      return {
        current: {
          start: format(startOfYear(selectedDate), 'yyyy-MM-dd'),
          end: format(endOfYear(selectedDate), 'yyyy-MM-dd'),
          label: format(selectedDate, 'yyyy')
        },
        previous: {
          start: format(startOfYear(subYears(selectedDate, 1)), 'yyyy-MM-dd'),
          end: format(endOfYear(subYears(selectedDate, 1)), 'yyyy-MM-dd'),
          label: format(subYears(selectedDate, 1), 'yyyy')
        }
      };
    }
  }, [periodType, selectedDate]);

  // Fetch detailed stats
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['prospects-stats-detailed', filters, dateRanges.current],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.segment_id) params.append('segment_id', filters.segment_id);
      if (filters.ville_id) params.append('ville_id', filters.ville_id);
      params.append('date_from', dateRanges.current.start);
      params.append('date_to', dateRanges.current.end);
      const res = await apiClient.get(`/prospects/stats-detailed?${params.toString()}`);
      return res.data;
    }
  });

  // Fetch previous period for comparison
  const { data: prevStats } = useQuery({
    queryKey: ['prospects-stats-detailed-prev', filters, dateRanges.previous],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.segment_id) params.append('segment_id', filters.segment_id);
      if (filters.ville_id) params.append('ville_id', filters.ville_id);
      params.append('date_from', dateRanges.previous.start);
      params.append('date_to', dateRanges.previous.end);
      const res = await apiClient.get(`/prospects/stats-detailed?${params.toString()}`);
      return res.data;
    }
  });

  // Fetch segments and villes
  const { data: segments } = useQuery({
    queryKey: ['segments'],
    queryFn: () => apiClient.get('/referentiels/segments').then(r => r.data)
  });

  const { data: villes } = useQuery({
    queryKey: ['villes'],
    queryFn: () => apiClient.get('/referentiels/cities').then(r => r.data)
  });

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => apiClient.get('/ai-settings/status').then(r => r.data)
  });

  // AI Analysis mutation
  const aiMutation = useMutation({
    mutationFn: async () => {
      const indicators = {
        current: {
          total: stats?.total || 0,
          non_contactes: stats?.by_status?.['non contacté'] || 0,
          avec_rdv: stats?.by_status?.['contacté avec rdv'] || 0,
          sans_rdv: stats?.by_status?.['contacté sans rdv'] || 0,
          inscrits_prospect: stats?.by_status?.['inscrit'] || 0,
          inscrits_session: stats?.inscrits_session || 0,
          taux_conversion: stats?.rates?.conversion_rate_calls || 0
        },
        previous: prevStats ? {
          total: prevStats?.total || 0,
          inscrits_prospect: prevStats?.by_status?.['inscrit'] || 0
        } : null,
        ecart: null
      };
      const res = await apiClient.post('/ai-settings/analyze', { indicators, filters });
      return res.data;
    }
  });

  // ECharts options for Pie Chart (Distribution)
  const pieChartOption = useMemo(() => {
    if (!stats?.by_status) return {};

    const data = Object.entries(stats.by_status).map(([name, value]) => ({
      name,
      value,
      itemStyle: { color: STATUS_COLORS[name] || '#d1d5db' }
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        type: 'scroll'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data
      }]
    };
  }, [stats?.by_status]);

  // ECharts options for Funnel
  const funnelChartOption = useMemo(() => {
    if (!stats?.funnel) return {};

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}'
      },
      series: [{
        type: 'funnel',
        left: '10%',
        width: '80%',
        sort: 'none',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}\n{c}',
          fontSize: 12
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        },
        emphasis: {
          label: {
            fontSize: 14
          }
        },
        data: stats.funnel.map(item => ({
          name: item.stage,
          value: item.count,
          itemStyle: { color: item.color }
        }))
      }]
    };
  }, [stats?.funnel]);

  // ECharts options for Rates Bar Chart
  const ratesChartOption = useMemo(() => {
    if (!stats?.rates) return {};

    const targets = {
      contact_rate: 80,
      rdv_rate: 25,
      show_up_rate: 60,
      conversion_rate_calls: 20,
      conversion_rate_global: 5
    };

    const labels = {
      contact_rate: 'Taux Contact',
      rdv_rate: 'Taux RDV',
      show_up_rate: 'Show-up',
      conversion_rate_calls: 'Conv. Appels',
      conversion_rate_global: 'Conv. Global'
    };

    const data = Object.entries(stats.rates).map(([key, value]) => ({
      name: labels[key] || key,
      value,
      target: targets[key] || 50
    }));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const item = params[0];
          const target = data.find(d => d.name === item.name)?.target || 0;
          return `${item.name}<br/>Actuel: ${item.value}%<br/>Cible: ${target}%`;
        }
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { fontSize: 11, rotate: 15 }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [
        {
          name: 'Actuel',
          type: 'bar',
          data: data.map(d => ({
            value: d.value,
            itemStyle: {
              color: d.value >= d.target ? '#22c55e' : d.value >= d.target * 0.7 ? '#f59e0b' : '#ef4444'
            }
          })),
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
            fontSize: 11
          }
        },
        {
          name: 'Cible',
          type: 'line',
          data: data.map(d => d.target),
          lineStyle: { type: 'dashed', color: '#94a3b8' },
          symbol: 'circle',
          symbolSize: 8
        }
      ]
    };
  }, [stats?.rates]);

  // Navigation handlers
  const handlePreviousPeriod = () => {
    setSelectedDate(periodType === 'mensuel' ? subMonths(selectedDate, 1) : subYears(selectedDate, 1));
  };

  const handleNextPeriod = () => {
    setSelectedDate(periodType === 'mensuel' ? subMonths(selectedDate, -1) : subYears(selectedDate, -1));
  };

  // Calculate trends
  const getTrend = (current: number, previous: number) => {
    if (!previous) return { trend: 'stable' as const, value: '-' };
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'stable' as const,
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs ${dateRanges.previous.label}`
    };
  };

  const totalTrend = getTrend(stats?.total || 0, prevStats?.total || 0);
  const inscritsTrend = getTrend(stats?.by_status?.['inscrit'] || 0, prevStats?.by_status?.['inscrit'] || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-orange-500" />
              Dashboard Indicateurs Commerciaux
            </h1>
            <p className="text-gray-500">Analyse complète de la performance commerciale</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
          {/* Period Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              variant={periodType === 'mensuel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriodType('mensuel')}
              className={periodType === 'mensuel' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Mensuel
            </Button>
            <Button
              variant={periodType === 'annuel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriodType('annuel')}
              className={periodType === 'annuel' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <CalendarRange className="h-4 w-4 mr-2" />
              Annuel
            </Button>
          </div>

          {/* Period Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousPeriod}>←</Button>
            <div className="min-w-[180px] text-center">
              <p className="font-bold text-gray-900 capitalize">{dateRanges.current.label}</p>
              <p className="text-xs text-gray-500">vs {dateRanges.previous.label}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextPeriod}>→</Button>
          </div>

          {/* Filters */}
          <Select value={filters.segment_id || 'all'} onValueChange={v => setFilters({ ...filters, segment_id: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les segments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les segments</SelectItem>
              {segments?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.ville_id || 'all'} onValueChange={v => setFilters({ ...filters, ville_id: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {villes?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des indicateurs...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard
              title="Total Prospects"
              value={stats?.total || 0}
              icon={<Users className="h-6 w-6 text-white" />}
              color="blue"
              trend={totalTrend.trend}
              trendValue={totalTrend.value}
            />
            <KPICard
              title="Taux de Contact"
              value={stats?.rates?.contact_rate || 0}
              suffix="%"
              icon={<Phone className="h-6 w-6 text-white" />}
              color="purple"
            />
            <KPICard
              title="Taux de RDV"
              value={stats?.rates?.rdv_rate || 0}
              suffix="%"
              icon={<Calendar className="h-6 w-6 text-white" />}
              color="green"
            />
            <KPICard
              title="Taux Show-up"
              value={stats?.rates?.show_up_rate || 0}
              suffix="%"
              icon={<Target className="h-6 w-6 text-white" />}
              color="orange"
            />
            <KPICard
              title="Inscrits"
              value={stats?.by_status?.['inscrit'] || 0}
              icon={<UserCheck className="h-6 w-6 text-white" />}
              color="cyan"
              trend={inscritsTrend.trend}
              trendValue={inscritsTrend.value}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  Distribution par Statut
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={pieChartOption} style={{ height: 350 }} />
              </CardContent>
            </Card>

            {/* Funnel Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Pipeline Commercial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={funnelChartOption} style={{ height: 350 }} />
              </CardContent>
            </Card>
          </div>

          {/* Rates Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Performance vs Objectifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={ratesChartOption} style={{ height: 300 }} />
            </CardContent>
          </Card>

          {/* Recommendations Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-orange-500" />
                  Recommandations
                  {aiStatus?.configured && aiStatus?.enabled && (
                    <Badge variant="secondary" className="ml-2">
                      <Sparkles className="h-3 w-3 mr-1" />
                      IA Disponible
                    </Badge>
                  )}
                </CardTitle>
                {aiStatus?.configured && aiStatus?.enabled && (
                  <Button
                    size="sm"
                    onClick={() => aiMutation.mutate()}
                    disabled={aiMutation.isPending}
                  >
                    {aiMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyse IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyse IA
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Global Assessment */}
              {stats?.globalAssessment && (
                <div className={`mb-6 p-4 rounded-lg border-2 ${
                  stats.globalAssessment.status === 'critique' ? 'bg-red-50 border-red-300' :
                  stats.globalAssessment.status === 'attention' ? 'bg-yellow-50 border-yellow-300' :
                  stats.globalAssessment.status === 'excellent' ? 'bg-green-50 border-green-300' :
                  'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={
                      stats.globalAssessment.status === 'critique' ? 'destructive' :
                      stats.globalAssessment.status === 'attention' ? 'warning' :
                      stats.globalAssessment.status === 'excellent' ? 'success' :
                      'default'
                    }>
                      {stats.globalAssessment.status.toUpperCase()}
                    </Badge>
                    <span className="font-semibold">Synthèse Globale</span>
                  </div>
                  <p className="text-sm mb-2">{stats.globalAssessment.summary}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Priorité #1:</strong> {stats.globalAssessment.topPriority}
                    </div>
                    <div>
                      <strong>Projection:</strong> {stats.globalAssessment.projection}
                    </div>
                    <div>
                      <strong>Risque:</strong> {stats.globalAssessment.risk}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Analysis Result */}
              {aiMutation.isSuccess && aiMutation.data?.analysis && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span className="font-semibold text-purple-800">Analyse IA ({aiMutation.data.provider})</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {aiMutation.data.analysis}
                  </div>
                </div>
              )}

              {/* Recommendations List */}
              <div className="space-y-4">
                {stats?.recommendations?.map((rec, index) => (
                  <RecommendationCard key={index} rec={rec} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
