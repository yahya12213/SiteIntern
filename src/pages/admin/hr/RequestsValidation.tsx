// @ts-nocheck
/**
 * Validation des Demandes RH
 * Interface de validation pour les responsables/validateurs
 * - Liste des demandes en attente avec filtres
 * - Approbation/Rejet avec commentaires
 * - Historique des décisions
 */

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckSquare,
  Search,
  Filter,
  Check,
  X,
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  ChevronRight,
  Briefcase,
  Plane,
  Edit,
  FileCheck,
} from 'lucide-react';

// Types de demandes
const REQUEST_TYPES = [
  { value: 'conge_annuel', label: 'Congé annuel', icon: Plane, color: 'blue' },
  { value: 'conge_maladie', label: 'Congé maladie', icon: Briefcase, color: 'red' },
  { value: 'conge_sans_solde', label: 'Congé sans solde', icon: Calendar, color: 'orange' },
  { value: 'correction_pointage', label: 'Correction pointage', icon: Edit, color: 'purple' },
  { value: 'demande_administrative', label: 'Demande administrative', icon: FileCheck, color: 'green' },
  { value: 'avance_salaire', label: 'Avance sur salaire', icon: Briefcase, color: 'yellow' },
];

// Données mock pour les demandes en attente
const MOCK_PENDING_REQUESTS = [
  {
    id: '1',
    employee_id: 'emp-1',
    employee_name: 'Ahmed Benali',
    employee_department: 'Commercial',
    type: 'conge_annuel',
    date_debut: '2025-12-15',
    date_fin: '2025-12-20',
    jours: 5,
    motif: 'Vacances familiales',
    date_soumission: '2025-11-25',
    statut: 'en_attente',
    etape_actuelle: 1,
    etape_totale: 2,
    validateur_actuel: 'Chef de département',
    documents: ['justificatif.pdf'],
  },
  {
    id: '2',
    employee_id: 'emp-2',
    employee_name: 'Fatima Zahra',
    employee_department: 'RH',
    type: 'correction_pointage',
    date_concernee: '2025-11-20',
    heure_arrivee: '09:15',
    heure_depart: '18:30',
    motif: 'Oubli de pointage - réunion externe',
    date_soumission: '2025-11-21',
    statut: 'en_attente',
    etape_actuelle: 1,
    etape_totale: 1,
    validateur_actuel: 'Responsable RH',
    documents: [],
  },
  {
    id: '3',
    employee_id: 'emp-3',
    employee_name: 'Karim Oujdi',
    employee_department: 'Technique',
    type: 'avance_salaire',
    montant: 3000,
    motif: 'Dépenses imprévues',
    date_soumission: '2025-11-24',
    statut: 'en_attente',
    etape_actuelle: 1,
    etape_totale: 2,
    validateur_actuel: 'Directeur',
    documents: [],
  },
  {
    id: '4',
    employee_id: 'emp-4',
    employee_name: 'Sara Alaoui',
    employee_department: 'Finance',
    type: 'conge_maladie',
    date_debut: '2025-11-26',
    date_fin: '2025-11-28',
    jours: 3,
    motif: 'Grippe',
    date_soumission: '2025-11-26',
    statut: 'en_attente',
    etape_actuelle: 1,
    etape_totale: 1,
    validateur_actuel: 'Responsable RH',
    documents: ['certificat_medical.pdf'],
  },
];

// Historique des décisions
const MOCK_HISTORY = [
  {
    id: '10',
    employee_name: 'Omar Tazi',
    type: 'conge_annuel',
    date_soumission: '2025-11-15',
    date_decision: '2025-11-16',
    decision: 'approuve',
    validateur: 'Chef de département',
    commentaire: 'Approuvé - effectif suffisant',
  },
  {
    id: '11',
    employee_name: 'Nadia Fassi',
    type: 'avance_salaire',
    date_soumission: '2025-11-10',
    date_decision: '2025-11-12',
    decision: 'rejete',
    validateur: 'Directeur',
    commentaire: 'Refusé - avance précédente non remboursée',
  },
  {
    id: '12',
    employee_name: 'Youssef Berrada',
    type: 'correction_pointage',
    date_soumission: '2025-11-18',
    date_decision: '2025-11-18',
    decision: 'approuve',
    validateur: 'Responsable RH',
    commentaire: '',
  },
];

export default function RequestsValidation() {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
  const [decisionComment, setDecisionComment] = useState('');

  // Filtrer les demandes
  const filteredRequests = MOCK_PENDING_REQUESTS.filter(request => {
    const matchesSearch =
      request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employee_department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || request.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Obtenir les infos du type de demande
  const getRequestTypeInfo = (type: string) => {
    return REQUEST_TYPES.find(t => t.value === type) || REQUEST_TYPES[0];
  };

  // Formater la date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Ouvrir le modal de détail
  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  // Ouvrir le modal de décision
  const handleDecision = (request: any, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setDecisionType(type);
    setDecisionComment('');
    setShowDecisionModal(true);
  };

  // Soumettre la décision
  const submitDecision = () => {
    console.log('Décision:', {
      request_id: selectedRequest?.id,
      decision: decisionType,
      commentaire: decisionComment,
    });
    // TODO: API call
    setShowDecisionModal(false);
  };

  // Rendu d'une carte de demande
  const renderRequestCard = (request: any) => {
    const typeInfo = getRequestTypeInfo(request.type);
    const TypeIcon = typeInfo.icon;

    return (
      <Card key={request.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-${typeInfo.color}-100`}>
                <TypeIcon className={`h-5 w-5 text-${typeInfo.color}-600`} />
              </div>
              <div>
                <h4 className="font-medium">{request.employee_name}</h4>
                <p className="text-sm text-gray-500">{request.employee_department}</p>
                <Badge variant="outline" className="mt-1">
                  {typeInfo.label}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Soumis le {formatDate(request.date_soumission)}
              </p>
              <div className="flex items-center gap-1 mt-1 text-sm text-orange-600">
                <Clock className="h-4 w-4" />
                Étape {request.etape_actuelle}/{request.etape_totale}
              </div>
            </div>
          </div>

          {/* Détails selon le type */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            {request.type === 'conge_annuel' || request.type === 'conge_maladie' || request.type === 'conge_sans_solde' ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Du:</span>
                  <p className="font-medium">{formatDate(request.date_debut)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Au:</span>
                  <p className="font-medium">{formatDate(request.date_fin)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Durée:</span>
                  <p className="font-medium">{request.jours} jour(s)</p>
                </div>
              </div>
            ) : request.type === 'correction_pointage' ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">{formatDate(request.date_concernee)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Arrivée:</span>
                  <p className="font-medium">{request.heure_arrivee}</p>
                </div>
                <div>
                  <span className="text-gray-500">Départ:</span>
                  <p className="font-medium">{request.heure_depart}</p>
                </div>
              </div>
            ) : request.type === 'avance_salaire' ? (
              <div className="text-sm">
                <span className="text-gray-500">Montant demandé:</span>
                <p className="font-medium text-lg">{request.montant?.toLocaleString('fr-FR')} MAD</p>
              </div>
            ) : null}

            {request.motif && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500">Motif:</span>
                <p className="italic">{request.motif}</p>
              </div>
            )}
          </div>

          {/* Documents joints */}
          {request.documents && request.documents.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              {request.documents.length} document(s) joint(s)
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(request)}>
              <Eye className="h-4 w-4 mr-1" />
              Détails
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => handleDecision(request, 'reject')}
              >
                <X className="h-4 w-4 mr-1" />
                Rejeter
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleDecision(request, 'approve')}
              >
                <Check className="h-4 w-4 mr-1" />
                Approuver
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="h-6 w-6" />
              Validation des Demandes
            </h1>
            <p className="text-gray-600">
              Gérez et validez les demandes RH de vos collaborateurs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {MOCK_PENDING_REQUESTS.length} en attente
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente ({MOCK_PENDING_REQUESTS.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Tab: Demandes en attente */}
          <TabsContent value="pending" className="space-y-4">
            {/* Filtres */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Rechercher par employé ou département..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Type de demande" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {REQUEST_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Liste des demandes */}
            {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">Aucune demande en attente</h3>
                  <p className="text-gray-500">
                    Toutes les demandes ont été traitées
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>

          {/* Tab: Historique */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des décisions</CardTitle>
                <CardDescription>
                  Vos décisions de validation récentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_HISTORY.map((item) => {
                    const typeInfo = getRequestTypeInfo(item.type);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {item.decision === 'approuve' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">{item.employee_name}</p>
                            <p className="text-sm text-gray-500">
                              {typeInfo.label} • Décidé le {formatDate(item.date_decision)}
                            </p>
                            {item.commentaire && (
                              <p className="text-sm italic text-gray-600 mt-1">
                                "{item.commentaire}"
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={item.decision === 'approuve' ? 'default' : 'destructive'}>
                          {item.decision === 'approuve' ? 'Approuvé' : 'Rejeté'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal Détails */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails de la demande</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Employé</Label>
                    <p className="font-medium">{selectedRequest.employee_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Département</Label>
                    <p className="font-medium">{selectedRequest.employee_department}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Type de demande</Label>
                    <p className="font-medium">{getRequestTypeInfo(selectedRequest.type).label}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Date de soumission</Label>
                    <p className="font-medium">{formatDate(selectedRequest.date_soumission)}</p>
                  </div>
                </div>

                {/* Circuit de validation */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500">Circuit de validation</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {Array.from({ length: selectedRequest.etape_totale }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${i + 1 < selectedRequest.etape_actuelle
                            ? 'bg-green-500 text-white'
                            : i + 1 === selectedRequest.etape_actuelle
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200'}
                        `}>
                          {i + 1 < selectedRequest.etape_actuelle ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            i + 1
                          )}
                        </div>
                        {i < selectedRequest.etape_totale - 1 && (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Validateur actuel: <span className="font-medium">{selectedRequest.validateur_actuel}</span>
                  </p>
                </div>

                <div>
                  <Label className="text-gray-500">Motif</Label>
                  <p className="p-3 bg-gray-50 rounded-lg">{selectedRequest.motif}</p>
                </div>

                {selectedRequest.documents?.length > 0 && (
                  <div>
                    <Label className="text-gray-500">Documents joints</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRequest.documents.map((doc: string, i: number) => (
                        <Badge key={i} variant="outline" className="cursor-pointer hover:bg-gray-100">
                          <FileText className="h-4 w-4 mr-1" />
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Fermer
              </Button>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => {
                  setShowDetailModal(false);
                  handleDecision(selectedRequest, 'reject');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Rejeter
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setShowDetailModal(false);
                  handleDecision(selectedRequest, 'approve');
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Approuver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Décision */}
        <Dialog open={showDecisionModal} onOpenChange={setShowDecisionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {decisionType === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.employee_name} - {getRequestTypeInfo(selectedRequest?.type || '').label}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border-2 border-dashed
                ${decisionType === 'approve' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}
              ">
                <div className="flex items-center gap-2">
                  {decisionType === 'approve' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={decisionType === 'approve' ? 'text-green-700' : 'text-red-700'}>
                    {decisionType === 'approve'
                      ? 'Vous allez approuver cette demande'
                      : 'Vous allez rejeter cette demande'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">
                  Commentaire {decisionType === 'reject' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="comment"
                  placeholder={
                    decisionType === 'approve'
                      ? 'Commentaire optionnel...'
                      : 'Veuillez indiquer le motif du rejet...'
                  }
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDecisionModal(false)}>
                Annuler
              </Button>
              <Button
                className={decisionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                onClick={submitDecision}
                disabled={decisionType === 'reject' && !decisionComment.trim()}
              >
                {decisionType === 'approve' ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Confirmer l'approbation
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Confirmer le rejet
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
