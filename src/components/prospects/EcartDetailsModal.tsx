// @ts-nocheck
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Info } from 'lucide-react';
import type { EcartDetailsResponse } from '@/lib/api/prospects';

interface Props {
  open: boolean;
  onClose: () => void;
  data: EcartDetailsResponse | null;
  isLoading: boolean;
}

export function EcartDetailsModal({ open, onClose, data, isLoading }: Props) {
  const isPositive = data?.type === 'positive';
  const isNegative = data?.type === 'negative';
  const isZero = data?.type === 'zero';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Détails de l'Écart
            {isPositive && <TrendingUp className="h-5 w-5 text-green-600" />}
            {isNegative && <TrendingDown className="h-5 w-5 text-red-600" />}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Chargement des détails...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Écart Total</p>
                  <p className={`text-3xl font-bold ${
                    isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {data.ecart > 0 ? '+' : ''}{data.ecart}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 font-medium">Nombre de Personnes</p>
                  <p className="text-3xl font-bold text-gray-900">{data.count}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-300">
                {isPositive && (
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      Ces étudiants sont inscrits dans des sessions de formation mais <strong>n'ont pas</strong> de prospect correspondant dans le système.
                      Cela peut indiquer des inscriptions directes ou des anciens étudiants.
                    </p>
                  </div>
                )}
                {isNegative && (
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      Ces prospects sont marqués comme "inscrit" mais <strong>ne sont pas</strong> inscrits dans des sessions de formation actives.
                      Vérifiez s'ils ont annulé ou si l'inscription n'a pas été finalisée.
                    </p>
                  </div>
                )}
                {isZero && (
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      Aucun écart détecté. Le nombre de prospects "inscrit" correspond exactement au nombre d'étudiants en session.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            {data.students.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucun écart détecté</p>
                <p className="text-sm text-gray-500 mt-1">
                  Le nombre de prospects inscrits correspond exactement au nombre d'étudiants en session.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[450px]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prénom
                        </th>
                        {isPositive && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CIN
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Téléphone
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sessions
                            </th>
                          </>
                        )}
                        {isNegative && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Téléphone
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ville
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Segment
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date Injection
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.students.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.nom || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {student.prenom || '-'}
                          </td>
                          {isPositive && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {student.cin || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                                {student.phone || student.whatsapp || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {student.sessions && student.sessions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {student.sessions.map((session, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                        title={`Inscrit le ${new Date(session.enrolled_at).toLocaleDateString('fr-FR')}`}
                                      >
                                        {session.session_name} ({session.ville_name})
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </>
                          )}
                          {isNegative && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                                {student.phone_international || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {student.ville_name || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {student.segment_name || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {student.date_injection
                                  ? new Date(student.date_injection).toLocaleDateString('fr-FR')
                                  : '-'}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Info */}
            {data.students.length > 0 && (
              <div className="text-xs text-gray-500 text-center pt-2 pb-1">
                {data.count} {data.count > 1 ? 'personnes trouvées' : 'personne trouvée'} dans l'écart
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
