// @ts-nocheck
/**
 * Portail Employé RH (EmployeePortal)
 * Interface employé pour le pointage, les demandes et la consultation des données personnelles
 */

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Clock,
  Calendar,
  FileText,
  Plus,
  LogIn,
  LogOut,
  Download,
  Upload,
  Search,
  Filter,
} from 'lucide-react';

// Tabs
type TabType = 'pointage' | 'demandes';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'pointage', label: 'Mon Pointage', icon: Clock },
  { id: 'demandes', label: 'Mes Demandes', icon: FileText },
];

const TYPES_DEMANDES = [
  { value: 'conge_annuel', label: 'Congé annuel' },
  { value: 'conge_sans_solde', label: 'Congé sans solde' },
  { value: 'conge_maladie', label: 'Congé maladie' },
  { value: 'correction_pointage', label: 'Correction de pointage' },
  { value: 'demande_administrative', label: 'Demande administrative' },
  { value: 'demande_formation', label: 'Demande de formation' },
];

interface Pointage {
  id: string;
  date: string;
  entree: string;
  sortie: string;
  heures_travaillees: number;
  retard: number;
  statut: 'present' | 'absent' | 'conge' | 'ferie';
}

interface DemandeRH {
  id: string;
  type: string;
  date_soumission: string;
  date_debut?: string;
  date_fin?: string;
  description: string;
  statut: 'en_attente' | 'approuve' | 'refuse';
  commentaire_valideur?: string;
}

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function EmployeePortal() {
  const [activeTab, setActiveTab] = useState<TabType>('pointage');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('11');
  const [showNewDemandeModal, setShowNewDemandeModal] = useState(false);

  // Mock data
  const [pointages] = useState<Pointage[]>([
    { id: '1', date: '2025-11-28', entree: '08:15', sortie: '17:30', heures_travaillees: 8.25, retard: 15, statut: 'present' },
    { id: '2', date: '2025-11-27', entree: '08:00', sortie: '17:00', heures_travaillees: 8, retard: 0, statut: 'present' },
    { id: '3', date: '2025-11-26', entree: '08:05', sortie: '17:15', heures_travaillees: 8.17, retard: 5, statut: 'present' },
    { id: '4', date: '2025-11-25', entree: '-', sortie: '-', heures_travaillees: 0, retard: 0, statut: 'conge' },
    { id: '5', date: '2025-11-24', entree: '-', sortie: '-', heures_travaillees: 0, retard: 0, statut: 'ferie' },
  ]);

  const [demandes] = useState<DemandeRH[]>([
    {
      id: '1',
      type: 'conge_annuel',
      date_soumission: '2025-11-20',
      date_debut: '2025-12-20',
      date_fin: '2025-12-31',
      description: 'Congé de fin d\'année',
      statut: 'en_attente',
    },
    {
      id: '2',
      type: 'correction_pointage',
      date_soumission: '2025-11-15',
      description: 'Correction sortie du 14/11 - Oubli de pointage',
      statut: 'approuve',
      commentaire_valideur: 'Corrigé à 17:30',
    },
  ]);

  const [newDemande, setNewDemande] = useState({
    type: '',
    date_debut: '',
    date_fin: '',
    description: '',
  });

  const totalHeures = pointages
    .filter(p => p.statut === 'present')
    .reduce((acc, p) => acc + p.heures_travaillees, 0);

  const totalRetards = pointages
    .filter(p => p.statut === 'present')
    .reduce((acc, p) => acc + p.retard, 0);

  const handleSubmitDemande = () => {
    if (!newDemande.type || !newDemande.description) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    // TODO: API call
    setShowNewDemandeModal(false);
    setNewDemande({ type: '', date_debut: '', date_fin: '', description: '' });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pointage':
        return (
          <div className="space-y-6">
            {/* Actions rapides */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-green-800">Pointer mon entrée</h3>
                      <p className="text-sm text-green-600">Enregistrer votre arrivée</p>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrée
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-orange-800">Pointer ma sortie</h3>
                      <p className="text-sm text-orange-600">Enregistrer votre départ</p>
                    </div>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sortie
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Heures ce mois
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalHeures.toFixed(1)}h</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Jours travaillés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {pointages.filter(p => p.statut === 'present').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total retards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{totalRetards} min</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Congés pris
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {pointages.filter(p => p.statut === 'conge').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtres */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historique des pointages
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOIS.map((mois, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {mois}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entrée</TableHead>
                      <TableHead>Sortie</TableHead>
                      <TableHead>Heures</TableHead>
                      <TableHead>Retard</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointages.map(pointage => (
                      <TableRow key={pointage.id}>
                        <TableCell className="font-medium">{pointage.date}</TableCell>
                        <TableCell>{pointage.entree}</TableCell>
                        <TableCell>{pointage.sortie}</TableCell>
                        <TableCell>
                          {pointage.heures_travaillees > 0 ? `${pointage.heures_travaillees}h` : '-'}
                        </TableCell>
                        <TableCell>
                          {pointage.retard > 0 ? (
                            <span className="text-orange-600">{pointage.retard} min</span>
                          ) : (
                            <span className="text-green-600">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            pointage.statut === 'present' ? 'bg-green-100 text-green-800' :
                            pointage.statut === 'conge' ? 'bg-blue-100 text-blue-800' :
                            pointage.statut === 'ferie' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {pointage.statut === 'present' ? 'Présent' :
                             pointage.statut === 'conge' ? 'Congé' :
                             pointage.statut === 'ferie' ? 'Férié' : 'Absent'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case 'demandes':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mes Demandes RH
              </CardTitle>
              <Button onClick={() => setShowNewDemandeModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date soumission</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Aucune demande
                      </TableCell>
                    </TableRow>
                  ) : (
                    demandes.map(demande => (
                      <TableRow key={demande.id}>
                        <TableCell className="font-medium">
                          {TYPES_DEMANDES.find(t => t.value === demande.type)?.label || demande.type}
                        </TableCell>
                        <TableCell>{demande.date_soumission}</TableCell>
                        <TableCell>
                          {demande.date_debut && demande.date_fin
                            ? `${demande.date_debut} → ${demande.date_fin}`
                            : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{demande.description}</TableCell>
                        <TableCell>
                          <Badge className={
                            demande.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                            demande.statut === 'approuve' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {demande.statut === 'en_attente' ? 'En attente' :
                             demande.statut === 'approuve' ? 'Approuvé' : 'Refusé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {demande.commentaire_valideur || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-600" />
            Portail Employé RH
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez votre pointage et vos demandes RH
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4" aria-label="Tabs">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Modal nouvelle demande */}
        <Dialog open={showNewDemandeModal} onOpenChange={setShowNewDemandeModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle demande RH</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type de demande *</Label>
                <Select
                  value={newDemande.type}
                  onValueChange={v => setNewDemande({ ...newDemande, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_DEMANDES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {['conge_annuel', 'conge_sans_solde', 'conge_maladie'].includes(newDemande.type) && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date début</Label>
                    <Input
                      type="date"
                      value={newDemande.date_debut}
                      onChange={e => setNewDemande({ ...newDemande, date_debut: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date fin</Label>
                    <Input
                      type="date"
                      value={newDemande.date_fin}
                      onChange={e => setNewDemande({ ...newDemande, date_fin: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={newDemande.description}
                  onChange={e => setNewDemande({ ...newDemande, description: e.target.value })}
                  placeholder="Décrivez votre demande..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDemandeModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitDemande}>
                Soumettre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
