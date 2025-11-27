// @ts-nocheck
/**
 * Gestion des Horaires (ScheduleManagement)
 * Gestion complète des modèles d'horaires, jours fériés, congés validés et heures supplémentaires
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
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Check,
  CalendarDays,
  Timer,
  Coffee,
} from 'lucide-react';

// Tabs
type TabType = 'modeles' | 'feries' | 'conges' | 'heures-sup';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'modeles', label: 'Modèles d\'Horaires', icon: Clock },
  { id: 'feries', label: 'Jours Fériés', icon: CalendarDays },
  { id: 'conges', label: 'Congés Validés', icon: Calendar },
  { id: 'heures-sup', label: 'Heures Supplémentaires', icon: Timer },
];

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

interface HoraireModele {
  id: string;
  nom: string;
  description: string;
  actif: boolean;
  horaires: {
    [jour: string]: {
      actif: boolean;
      heureDebut: string;
      heureFin: string;
      pauses: { nom: string; debut: string; fin: string; remuneree: boolean }[];
    };
  };
  heures_hebdo: number;
}

interface JourFerie {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  type: 'ferie' | 'collectif' | 'pont';
  recurrent: boolean;
}

interface CongeValide {
  id: string;
  employe_nom: string;
  type_conge: string;
  date_debut: string;
  date_fin: string;
  jours: number;
  statut: 'approuve';
}

interface DeclarationHeuresSup {
  id: string;
  employe_nom: string;
  periode: string;
  heures_max: number;
  type_autorisation: 'ponctuelle' | 'recurrente' | 'urgence';
  statut: 'en_attente' | 'approuve' | 'refuse';
}

export default function ScheduleManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('modeles');

  // Mock data
  const [modeles] = useState<HoraireModele[]>([
    {
      id: '1',
      nom: 'Horaire Standard',
      description: '8h-17h avec pause déjeuner',
      actif: true,
      horaires: {
        'Lundi': { actif: true, heureDebut: '08:00', heureFin: '17:00', pauses: [{ nom: 'Déjeuner', debut: '12:00', fin: '13:00', remuneree: false }] },
        'Mardi': { actif: true, heureDebut: '08:00', heureFin: '17:00', pauses: [{ nom: 'Déjeuner', debut: '12:00', fin: '13:00', remuneree: false }] },
        'Mercredi': { actif: true, heureDebut: '08:00', heureFin: '17:00', pauses: [{ nom: 'Déjeuner', debut: '12:00', fin: '13:00', remuneree: false }] },
        'Jeudi': { actif: true, heureDebut: '08:00', heureFin: '17:00', pauses: [{ nom: 'Déjeuner', debut: '12:00', fin: '13:00', remuneree: false }] },
        'Vendredi': { actif: true, heureDebut: '08:00', heureFin: '17:00', pauses: [{ nom: 'Déjeuner', debut: '12:00', fin: '13:00', remuneree: false }] },
        'Samedi': { actif: false, heureDebut: '', heureFin: '', pauses: [] },
        'Dimanche': { actif: false, heureDebut: '', heureFin: '', pauses: [] },
      },
      heures_hebdo: 40,
    },
  ]);

  const [joursFeries] = useState<JourFerie[]>([
    { id: '1', nom: 'Jour de l\'An', date_debut: '2025-01-01', date_fin: '2025-01-01', type: 'ferie', recurrent: true },
    { id: '2', nom: 'Fête du Travail', date_debut: '2025-05-01', date_fin: '2025-05-01', type: 'ferie', recurrent: true },
    { id: '3', nom: 'Fête du Trône', date_debut: '2025-07-30', date_fin: '2025-07-30', type: 'ferie', recurrent: true },
  ]);

  const [congesValides] = useState<CongeValide[]>([
    { id: '1', employe_nom: 'Ahmed Ben Ali', type_conge: 'Congé annuel', date_debut: '2025-12-20', date_fin: '2025-12-31', jours: 10, statut: 'approuve' },
    { id: '2', employe_nom: 'Fatima Zahra', type_conge: 'Congé maladie', date_debut: '2025-11-25', date_fin: '2025-11-27', jours: 3, statut: 'approuve' },
  ]);

  const [declarationsHS] = useState<DeclarationHeuresSup[]>([
    { id: '1', employe_nom: 'Mohamed Alami', periode: 'Novembre 2025', heures_max: 20, type_autorisation: 'ponctuelle', statut: 'approuve' },
    { id: '2', employe_nom: 'Sara Idrissi', periode: 'Décembre 2025', heures_max: 15, type_autorisation: 'recurrente', statut: 'en_attente' },
  ]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'modeles':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Modèles d'Horaires
              </CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau modèle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Heures/Semaine</TableHead>
                    <TableHead>Jours travaillés</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modeles.map(modele => (
                    <TableRow key={modele.id}>
                      <TableCell className="font-medium">{modele.nom}</TableCell>
                      <TableCell>{modele.description}</TableCell>
                      <TableCell>{modele.heures_hebdo}h</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {JOURS_SEMAINE.map((jour, i) => (
                            <span
                              key={jour}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                modele.horaires[jour]?.actif
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {jour[0]}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {modele.actif ? (
                          <Badge className="bg-green-100 text-green-800">Actif</Badge>
                        ) : (
                          <Badge variant="outline">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'feries':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Jours Fériés & Congés Collectifs
              </CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Date(s)</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Récurrent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {joursFeries.map(jour => (
                    <TableRow key={jour.id}>
                      <TableCell className="font-medium">{jour.nom}</TableCell>
                      <TableCell>
                        {jour.date_debut === jour.date_fin
                          ? jour.date_debut
                          : `${jour.date_debut} → ${jour.date_fin}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          jour.type === 'ferie' ? 'bg-red-50 text-red-700' :
                          jour.type === 'collectif' ? 'bg-blue-50 text-blue-700' :
                          'bg-orange-50 text-orange-700'
                        }>
                          {jour.type === 'ferie' ? 'Férié' : jour.type === 'collectif' ? 'Collectif' : 'Pont'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {jour.recurrent ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'conges':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Congés Validés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {congesValides.map(conge => (
                    <TableRow key={conge.id}>
                      <TableCell className="font-medium">{conge.employe_nom}</TableCell>
                      <TableCell>{conge.type_conge}</TableCell>
                      <TableCell>{conge.date_debut} → {conge.date_fin}</TableCell>
                      <TableCell>{conge.jours} jours</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">Approuvé</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'heures-sup':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Déclarations d'Heures Supplémentaires
              </CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle déclaration
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Heures max</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarationsHS.map(decl => (
                    <TableRow key={decl.id}>
                      <TableCell className="font-medium">{decl.employe_nom}</TableCell>
                      <TableCell>{decl.periode}</TableCell>
                      <TableCell>{decl.heures_max}h</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {decl.type_autorisation === 'ponctuelle' ? 'Ponctuelle' :
                           decl.type_autorisation === 'recurrente' ? 'Récurrente' : 'Urgence'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          decl.statut === 'approuve' ? 'bg-green-100 text-green-800' :
                          decl.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {decl.statut === 'approuve' ? 'Approuvé' :
                           decl.statut === 'en_attente' ? 'En attente' : 'Refusé'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {decl.statut === 'en_attente' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
            <Calendar className="h-8 w-8 text-blue-600" />
            Gestion des Horaires
          </h1>
          <p className="text-gray-500 mt-1">
            Modèles d'horaires, jours fériés, congés et heures supplémentaires
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
      </div>
    </AppLayout>
  );
}
