// @ts-nocheck
/**
 * Boucles de Validation (ValidationWorkflows)
 * Système de création et gestion des circuits d'approbation automatiques pour les demandes RH
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
  GitBranch,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  Users,
  UserCheck,
} from 'lucide-react';

// Types de déclencheurs supportés
const TRIGGER_TYPES = [
  { value: 'demande_conge', label: 'Demande de congé' },
  { value: 'demande_administrative', label: 'Demande administrative' },
  { value: 'correction_pointage', label: 'Correction de pointage' },
  { value: 'note_frais', label: 'Note de frais' },
  { value: 'demande_formation', label: 'Demande de formation' },
  { value: 'recrutement', label: 'Processus de recrutement' },
];

interface ValidationStep {
  id: string;
  ordre: number;
  validateur_type: 'user' | 'role';
  validateur_id: string;
  validateur_nom: string;
  condition?: string;
}

interface ValidationWorkflow {
  id: string;
  nom: string;
  description: string;
  declencheur: string;
  segment_id?: string;
  actif: boolean;
  etapes: ValidationStep[];
  created_at: string;
}

export default function ValidationWorkflows() {
  const [workflows, setWorkflows] = useState<ValidationWorkflow[]>([
    {
      id: '1',
      nom: 'Approbation Congés Standard',
      description: 'Circuit standard pour les demandes de congés',
      declencheur: 'demande_conge',
      actif: true,
      etapes: [
        { id: '1', ordre: 1, validateur_type: 'role', validateur_id: 'manager', validateur_nom: 'Manager direct' },
        { id: '2', ordre: 2, validateur_type: 'role', validateur_id: 'rh', validateur_nom: 'Responsable RH' },
      ],
      created_at: '2025-01-15',
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ValidationWorkflow | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    declencheur: '',
    segment_id: '',
  });

  const handleCreate = () => {
    setFormData({ nom: '', description: '', declencheur: '', segment_id: '' });
    setEditingWorkflow(null);
    setShowCreateModal(true);
  };

  const handleEdit = (workflow: ValidationWorkflow) => {
    setFormData({
      nom: workflow.nom,
      description: workflow.description,
      declencheur: workflow.declencheur,
      segment_id: workflow.segment_id || '',
    });
    setEditingWorkflow(workflow);
    setShowCreateModal(true);
  };

  const handleToggleActive = (id: string) => {
    setWorkflows(prev =>
      prev.map(w => w.id === id ? { ...w, actif: !w.actif } : w)
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette boucle de validation ?')) {
      setWorkflows(prev => prev.filter(w => w.id !== id));
    }
  };

  const handleSave = () => {
    if (!formData.nom || !formData.declencheur) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (editingWorkflow) {
      setWorkflows(prev =>
        prev.map(w => w.id === editingWorkflow.id ? { ...w, ...formData } : w)
      );
    } else {
      const newWorkflow: ValidationWorkflow = {
        id: Date.now().toString(),
        ...formData,
        actif: false,
        etapes: [],
        created_at: new Date().toISOString().split('T')[0],
      };
      setWorkflows(prev => [...prev, newWorkflow]);
    }

    setShowCreateModal(false);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-blue-600" />
              Boucles de Validation
            </h1>
            <p className="text-gray-500 mt-1">
              Gérez les circuits d'approbation automatiques pour les demandes RH
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle boucle
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflows.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {workflows.filter(w => w.actif).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Inactives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">
                {workflows.filter(w => !w.actif).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Types de déclencheurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {new Set(workflows.map(w => w.declencheur)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des boucles de validation</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Déclencheur</TableHead>
                  <TableHead>Étapes</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucune boucle de validation configurée
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows.map(workflow => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{workflow.nom}</div>
                          <div className="text-sm text-gray-500">{workflow.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TRIGGER_TYPES.find(t => t.value === workflow.declencheur)?.label || workflow.declencheur}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{workflow.etapes.length} étape(s)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {workflow.actif ? (
                          <Badge className="bg-green-100 text-green-800">Actif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell>{workflow.created_at}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(workflow.id)}
                            title={workflow.actif ? 'Désactiver' : 'Activer'}
                          >
                            {workflow.actif ? (
                              <Pause className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Play className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(workflow)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(workflow.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWorkflow ? 'Modifier la boucle' : 'Nouvelle boucle de validation'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.nom}
                  onChange={e => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Approbation Congés Standard"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la boucle de validation"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Type de déclencheur *</Label>
                <Select
                  value={formData.declencheur}
                  onValueChange={v => setFormData({ ...formData, declencheur: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un déclencheur" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Segment (optionnel)</Label>
                <Select
                  value={formData.segment_id}
                  onValueChange={v => setFormData({ ...formData, segment_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les segments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les segments</SelectItem>
                    <SelectItem value="segment-1">Segment 1</SelectItem>
                    <SelectItem value="segment-2">Segment 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingWorkflow ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
