// @ts-nocheck
/**
 * IndicateursModal - Affiche les indicateurs des prospects avec filtre mensuel/annuel
 */
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  Users,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CalendarDays,
  CalendarRange,
  Percent
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { prospectsApi } from '@/lib/api/prospects';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  open: boolean;
  onClose: () => void;
  filters?: {
    segment_id?: string;
    ville_id?: string;
  };
}

type PeriodType = 'mensuel' | 'annuel';

interface IndicatorCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
  isPercentage?: boolean;
}

function IndicatorCard({ title, currentValue, previousValue, icon, color, suffix = '', isPercentage = false }: IndicatorCardProps) {
  const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  };

  return (
    <Card className={`${colorClasses[color] || colorClasses.gray} border-2`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{title}</span>
          <div className="p-2 rounded-full bg-white/60">
            {icon}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold">
              {isPercentage ? currentValue.toFixed(1) : currentValue}
              {suffix}
            </p>
            <p className="text-xs opacity-70">
              Période précédente: {isPercentage ? previousValue.toFixed(1) : previousValue}{suffix}
            </p>
          </div>
          {!isNeutral && (
            <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function IndicateursModal({ open, onClose, filters = {} }: Props) {
  const [periodType, setPeriodType] = useState<PeriodType>('mensuel');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculer les plages de dates
  const dateRanges = useMemo(() => {
    if (periodType === 'mensuel') {
      const currentStart = startOfMonth(selectedDate);
      const currentEnd = endOfMonth(selectedDate);
      const previousStart = startOfMonth(subMonths(selectedDate, 1));
      const previousEnd = endOfMonth(subMonths(selectedDate, 1));

      return {
        current: {
          start: format(currentStart, 'yyyy-MM-dd'),
          end: format(currentEnd, 'yyyy-MM-dd'),
          label: format(selectedDate, 'MMMM yyyy', { locale: fr })
        },
        previous: {
          start: format(previousStart, 'yyyy-MM-dd'),
          end: format(previousEnd, 'yyyy-MM-dd'),
          label: format(subMonths(selectedDate, 1), 'MMMM yyyy', { locale: fr })
        }
      };
    } else {
      const currentStart = startOfYear(selectedDate);
      const currentEnd = endOfYear(selectedDate);
      const previousStart = startOfYear(subYears(selectedDate, 1));
      const previousEnd = endOfYear(subYears(selectedDate, 1));

      return {
        current: {
          start: format(currentStart, 'yyyy-MM-dd'),
          end: format(currentEnd, 'yyyy-MM-dd'),
          label: format(selectedDate, 'yyyy')
        },
        previous: {
          start: format(previousStart, 'yyyy-MM-dd'),
          end: format(previousEnd, 'yyyy-MM-dd'),
          label: format(subYears(selectedDate, 1), 'yyyy')
        }
      };
    }
  }, [periodType, selectedDate]);

  // Query pour la période actuelle
  const { data: currentStats, isLoading: currentLoading } = useQuery({
    queryKey: ['prospects-indicators-current', filters.segment_id, filters.ville_id, dateRanges.current.start, dateRanges.current.end],
    queryFn: () => prospectsApi.getAll({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: dateRanges.current.start,
      date_to: dateRanges.current.end,
      page: 1,
      limit: 1,
    }),
    enabled: open,
  });

  // Query pour la période précédente
  const { data: previousStats, isLoading: previousLoading } = useQuery({
    queryKey: ['prospects-indicators-previous', filters.segment_id, filters.ville_id, dateRanges.previous.start, dateRanges.previous.end],
    queryFn: () => prospectsApi.getAll({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: dateRanges.previous.start,
      date_to: dateRanges.previous.end,
      page: 1,
      limit: 1,
    }),
    enabled: open,
  });

  // Query pour les écarts période actuelle
  const { data: currentEcart } = useQuery({
    queryKey: ['prospects-ecart-current', filters.segment_id, filters.ville_id, dateRanges.current.start, dateRanges.current.end],
    queryFn: () => prospectsApi.getEcartDetails({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: dateRanges.current.start,
      date_to: dateRanges.current.end,
    }),
    enabled: open,
  });

  // Query pour les écarts période précédente
  const { data: previousEcart } = useQuery({
    queryKey: ['prospects-ecart-previous', filters.segment_id, filters.ville_id, dateRanges.previous.start, dateRanges.previous.end],
    queryFn: () => prospectsApi.getEcartDetails({
      segment_id: filters.segment_id,
      ville_id: filters.ville_id,
      date_from: dateRanges.previous.start,
      date_to: dateRanges.previous.end,
    }),
    enabled: open,
  });

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

  const handlePreviousPeriod = () => {
    if (periodType === 'mensuel') {
      setSelectedDate(subMonths(selectedDate, 1));
    } else {
      setSelectedDate(subYears(selectedDate, 1));
    }
  };

  const handleNextPeriod = () => {
    if (periodType === 'mensuel') {
      setSelectedDate(subMonths(selectedDate, -1));
    } else {
      setSelectedDate(subYears(selectedDate, -1));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            Indicateurs des Prospects
          </DialogTitle>
        </DialogHeader>

        {/* Sélecteur de période */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-secondary rounded-lg border border-gray-200">
          {/* Toggle Mensuel/Annuel */}
          <div className="flex items-center gap-2">
            <Button
              variant={periodType === 'mensuel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('mensuel')}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Mensuel
            </Button>
            <Button
              variant={periodType === 'annuel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('annuel')}
              className="gap-2"
            >
              <CalendarRange className="h-4 w-4" />
              Annuel
            </Button>
          </div>

          {/* Navigation période */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handlePreviousPeriod}>
              <span className="sr-only">Précédent</span>
              ←
            </Button>
            <div className="min-w-[180px] text-center">
              <p className="font-semibold text-gray-900 capitalize">{dateRanges.current.label}</p>
              <p className="text-xs text-gray-500">
                vs {dateRanges.previous.label}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextPeriod}>
              <span className="sr-only">Suivant</span>
              →
            </Button>
          </div>

          {/* Bouton Aujourd'hui */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            <Clock className="h-4 w-4 mr-2" />
            Période actuelle
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            <p className="ml-3 text-gray-600">Chargement des indicateurs...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Volume */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Volume des Prospects
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <IndicatorCard
                  title="Total Prospects"
                  currentValue={current.total}
                  previousValue={previous.total}
                  icon={<Users className="h-5 w-5" />}
                  color="blue"
                />
                <IndicatorCard
                  title="Non Contactés"
                  currentValue={current.non_contactes}
                  previousValue={previous.non_contactes}
                  icon={<Phone className="h-5 w-5" />}
                  color="orange"
                />
                <IndicatorCard
                  title="Avec RDV"
                  currentValue={current.avec_rdv}
                  previousValue={previous.avec_rdv}
                  icon={<Calendar className="h-5 w-5" />}
                  color="green"
                />
                <IndicatorCard
                  title="Sans RDV"
                  currentValue={current.sans_rdv}
                  previousValue={previous.sans_rdv}
                  icon={<Calendar className="h-5 w-5" />}
                  color="gray"
                />
              </div>
            </div>

            {/* Section 2: Conversion */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Conversion & Inscriptions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <IndicatorCard
                  title="Taux de Conversion"
                  currentValue={current.taux_conversion || 0}
                  previousValue={previous.taux_conversion || 0}
                  icon={<Percent className="h-5 w-5" />}
                  color="purple"
                  suffix="%"
                  isPercentage
                />
                <IndicatorCard
                  title="Inscrit Prospect"
                  currentValue={current.inscrits_prospect}
                  previousValue={previous.inscrits_prospect}
                  icon={<UserCheck className="h-5 w-5" />}
                  color="green"
                />
                <IndicatorCard
                  title="Inscrit Session"
                  currentValue={current.inscrits_session}
                  previousValue={previous.inscrits_session}
                  icon={<UserCheck className="h-5 w-5" />}
                  color="cyan"
                />
                <div className="space-y-2">
                  <Card className="bg-green-50 border-2 border-green-200">
                    <CardContent className="pt-3 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-700">Session Livrée</span>
                        <span className="text-xl font-bold text-green-700">{current.inscrits_session_livree || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-2 border-red-200">
                    <CardContent className="pt-3 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-700">Session Non Livrée</span>
                        <span className="text-xl font-bold text-red-700">{current.inscrits_session_non_livree || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Section 3: Écarts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Écarts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <IndicatorCard
                  title="Écart Session"
                  currentValue={currentEcart?.ecart_session?.count || 0}
                  previousValue={previousEcart?.ecart_session?.count || 0}
                  icon={<UserCheck className="h-5 w-5" />}
                  color="green"
                />
                <IndicatorCard
                  title="Écart Prospect"
                  currentValue={currentEcart?.ecart_prospect?.count || 0}
                  previousValue={previousEcart?.ecart_prospect?.count || 0}
                  icon={<UserX className="h-5 w-5" />}
                  color="orange"
                />
              </div>
            </div>

            {/* Légende */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Évolution positive</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Évolution négative</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Stable</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
