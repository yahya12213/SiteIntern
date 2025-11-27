// @ts-nocheck
/**
 * Gestion de Paie (PayrollManagement)
 * Système complet de gestion de paie conforme au Code du Travail marocain (CNSS, AMO, IGR)
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
import {
  Wallet,
  Calendar,
  Calculator,
  FileText,
  TestTube,
  Cog,
  Settings,
  Plus,
  Play,
  Download,
  Check,
  Lock,
} from 'lucide-react';

// Tabs
type TabType = 'periodes' | 'calculs' | 'bulletins' | 'tests' | 'automatisation' | 'configuration';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'periodes', label: 'Périodes de Paie', icon: Calendar },
  { id: 'calculs', label: 'Calculs de Paie', icon: Calculator },
  { id: 'bulletins', label: 'Bulletins de Paie', icon: FileText },
  { id: 'tests', label: 'Tests & Logs', icon: TestTube },
  { id: 'automatisation', label: 'Automatisation', icon: Cog },
  { id: 'configuration', label: 'Configuration', icon: Settings },
];

interface PeriodePaie {
  id: string;
  annee: number;
  mois: number;
  date_debut_pointage: string;
  date_fin_pointage: string;
  date_paie: string;
  statut: 'active' | 'validated' | 'closed';
}

interface BulletinPaie {
  id: string;
  employe_nom: string;
  periode: string;
  salaire_base: number;
  heures_sup: number;
  cnss: number;
  amo: number;
  igr: number;
  net_a_payer: number;
  statut: 'calcule' | 'valide' | 'paye';
}

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function PayrollManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('periodes');

  // Mock data
  const [periodes] = useState<PeriodePaie[]>([
    {
      id: '1',
      annee: 2025,
      mois: 11,
      date_debut_pointage: '2025-10-20',
      date_fin_pointage: '2025-11-19',
      date_paie: '2025-11-30',
      statut: 'active',
    },
    {
      id: '2',
      annee: 2025,
      mois: 10,
      date_debut_pointage: '2025-09-20',
      date_fin_pointage: '2025-10-19',
      date_paie: '2025-10-31',
      statut: 'closed',
    },
  ]);

  const [bulletins] = useState<BulletinPaie[]>([
    {
      id: '1',
      employe_nom: 'Ahmed Ben Ali',
      periode: 'Novembre 2025',
      salaire_base: 8000,
      heures_sup: 1200,
      cnss: 448.64,
      amo: 207.92,
      igr: 850,
      net_a_payer: 7694,
      statut: 'calcule',
    },
    {
      id: '2',
      employe_nom: 'Fatima Zahra',
      periode: 'Novembre 2025',
      salaire_base: 6500,
      heures_sup: 0,
      cnss: 364.52,
      amo: 168.92,
      igr: 520,
      net_a_payer: 5447,
      statut: 'calcule',
    },
  ]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'periodes':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Périodes de Paie
              </CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle période
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead>Fenêtre de pointage</TableHead>
                    <TableHead>Date de paie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodes.map(periode => (
                    <TableRow key={periode.id}>
                      <TableCell className="font-medium">
                        {MOIS[periode.mois - 1]} {periode.annee}
                      </TableCell>
                      <TableCell>
                        {periode.date_debut_pointage} → {periode.date_fin_pointage}
                      </TableCell>
                      <TableCell>{periode.date_paie}</TableCell>
                      <TableCell>
                        <Badge className={
                          periode.statut === 'active' ? 'bg-green-100 text-green-800' :
                          periode.statut === 'validated' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {periode.statut === 'active' ? 'Active' :
                           periode.statut === 'validated' ? 'Validée' : 'Clôturée'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {periode.statut === 'active' && (
                          <>
                            <Button variant="outline" size="sm" className="mr-2">
                              <Calculator className="h-4 w-4 mr-1" />
                              Calculer
                            </Button>
                            <Button variant="outline" size="sm">
                              <Lock className="h-4 w-4 mr-1" />
                              Clôturer
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

      case 'calculs':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculs de Paie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Période</Label>
                  <Select defaultValue="nov-2025">
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nov-2025">Novembre 2025</SelectItem>
                      <SelectItem value="oct-2025">Octobre 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Segment (optionnel)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les segments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les segments</SelectItem>
                      <SelectItem value="seg-1">Segment 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Calculs automatiques inclus:</h4>
                <ul className="text-sm text-blue-700 grid grid-cols-2 gap-2">
                  <li>• Collecte des pointages</li>
                  <li>• Heures normales et supplémentaires</li>
                  <li>• Cotisations CNSS (barèmes 2025)</li>
                  <li>• AMO (2,26% + 1,85% solidarité)</li>
                  <li>• IGR avec déductions familles</li>
                  <li>• Crédit congés (règle 191h Maroc)</li>
                </ul>
              </div>

              <Button className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Lancer le calcul de paie
              </Button>
            </CardContent>
          </Card>
        );

      case 'bulletins':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bulletins de Paie
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter tout
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Salaire base</TableHead>
                    <TableHead className="text-right">HS</TableHead>
                    <TableHead className="text-right">CNSS</TableHead>
                    <TableHead className="text-right">AMO</TableHead>
                    <TableHead className="text-right">IGR</TableHead>
                    <TableHead className="text-right">Net à payer</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulletins.map(bulletin => (
                    <TableRow key={bulletin.id}>
                      <TableCell className="font-medium">{bulletin.employe_nom}</TableCell>
                      <TableCell>{bulletin.periode}</TableCell>
                      <TableCell className="text-right">{formatMoney(bulletin.salaire_base)}</TableCell>
                      <TableCell className="text-right">{formatMoney(bulletin.heures_sup)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatMoney(bulletin.cnss)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatMoney(bulletin.amo)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatMoney(bulletin.igr)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatMoney(bulletin.net_a_payer)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          bulletin.statut === 'calcule' ? 'bg-yellow-100 text-yellow-800' :
                          bulletin.statut === 'valide' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {bulletin.statut === 'calcule' ? 'Calculé' :
                           bulletin.statut === 'valide' ? 'Validé' : 'Payé'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'tests':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Tests & Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Tests de calcul disponibles</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Button variant="outline" size="sm">
                      Test CNSS
                    </Button>
                    <Button variant="outline" size="sm">
                      Test AMO
                    </Button>
                    <Button variant="outline" size="sm">
                      Test IGR
                    </Button>
                    <Button variant="outline" size="sm">
                      Test Heures Sup
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Historique des calculs</h4>
                  <div className="border rounded-lg divide-y max-h-64 overflow-auto">
                    <div className="p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Calcul Novembre 2025</span>
                        <span className="text-gray-500">28/11/2025 14:32</span>
                      </div>
                      <p className="text-gray-500">15 bulletins générés - Succès</p>
                    </div>
                    <div className="p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Calcul Octobre 2025</span>
                        <span className="text-gray-500">31/10/2025 09:15</span>
                      </div>
                      <p className="text-gray-500">15 bulletins générés - Succès</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'automatisation':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Automatisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Calcul automatique mensuel</h4>
                    <p className="text-sm text-gray-500">Exécution le 25 de chaque mois à 00:00</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Actif</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Génération automatique des bulletins PDF</h4>
                    <p className="text-sm text-gray-500">Après validation de la période</p>
                  </div>
                  <Badge variant="outline">Inactif</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Notification par email aux employés</h4>
                    <p className="text-sm text-gray-500">Envoi du bulletin par email</p>
                  </div>
                  <Badge variant="outline">Inactif</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'configuration':
        return (
          <div className="space-y-6">
            {/* Lignes de paie */}
            <Card>
              <CardHeader>
                <CardTitle>Lignes de paie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Gains</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Salaire de base</li>
                      <li>• Heures supplémentaires (25%, 50%, 100%)</li>
                      <li>• Prime d'ancienneté</li>
                      <li>• Indemnités diverses</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Retenues</h4>
                    <ul className="text-sm space-y-1">
                      <li>• CNSS (4,48% salarié)</li>
                      <li>• AMO (2,26% + 1,85% solidarité)</li>
                      <li>• IGR (barème progressif)</li>
                      <li>• Avances sur salaire</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Barème IGR */}
            <Card>
              <CardHeader>
                <CardTitle>Barème IGR 2025</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tranche</TableHead>
                      <TableHead>Taux</TableHead>
                      <TableHead>Somme à déduire</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>0 - 30 000 DH</TableCell>
                      <TableCell>0%</TableCell>
                      <TableCell>0 DH</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>30 001 - 50 000 DH</TableCell>
                      <TableCell>10%</TableCell>
                      <TableCell>3 000 DH</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>50 001 - 60 000 DH</TableCell>
                      <TableCell>20%</TableCell>
                      <TableCell>8 000 DH</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>60 001 - 80 000 DH</TableCell>
                      <TableCell>30%</TableCell>
                      <TableCell>14 000 DH</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>80 001 - 180 000 DH</TableCell>
                      <TableCell>34%</TableCell>
                      <TableCell>17 200 DH</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>&gt; 180 000 DH</TableCell>
                      <TableCell>38%</TableCell>
                      <TableCell>24 400 DH</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Configuration CNSS */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration CNSS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Taux salarié</Label>
                    <Input value="4.48%" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Taux employeur</Label>
                    <Input value="8.98%" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Plafond mensuel</Label>
                    <Input value="6 000 DH" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wallet className="h-8 w-8 text-blue-600" />
            Gestion de Paie
          </h1>
          <p className="text-gray-500 mt-1">
            Système de paie conforme au Code du Travail marocain
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-2" aria-label="Tabs">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
