import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, ArrowLeft, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImportCitiesModal from '@/components/admin/ImportCitiesModal';
import { useSegments, useCreateSegment, useUpdateSegment, useDeleteSegment } from '@/hooks/useSegments';
import type { Segment } from '@/hooks/useSegments';

export default function Segments() {
  const { data: segments = [], isLoading, error } = useSegments();
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();
  const deleteSegment = useDeleteSegment();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateSegment.mutateAsync({
          id: editingId,
          name: formData.name,
          color: formData.color,
        });
      } else {
        await createSegment.mutateAsync({
          name: formData.name,
          color: formData.color,
        });
      }
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du segment');
    }
  };

  const handleEdit = (segment: Segment) => {
    setFormData({
      name: segment.name,
      color: segment.color,
    });
    setEditingId(segment.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce segment ?')) {
      try {
        await deleteSegment.mutateAsync(id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du segment');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', color: '#3b82f6' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleOpenImport = (segment: Segment) => {
    setSelectedSegment({ id: segment.id, name: segment.name });
    setImportModalOpen(true);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Erreur lors du chargement des segments: {(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Gestion des Segments</h1>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Segment
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'Modifier' : 'Nouveau'} Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nom du segment</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Formation Informatique"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Couleur</label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createSegment.isPending || updateSegment.isPending}>
                    {(createSegment.isPending || updateSegment.isPending) ? 'Enregistrement...' : (editingId ? 'Modifier' : 'Créer')}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Chargement des segments...</p>
          </div>
        )}

        {/* List */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment: Segment) => (
              <Card key={segment.id} style={{ borderLeft: `4px solid ${segment.color}` }}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{segment.name}</span>
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: segment.color }}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleOpenImport(segment)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Importer des villes
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(segment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(segment.id)}
                        disabled={deleteSegment.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && segments.length === 0 && !showForm && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun segment créé pour le moment</p>
          </div>
        )}
      </div>

      {/* Modal d'import */}
      {importModalOpen && selectedSegment && (
        <ImportCitiesModal
          segmentId={selectedSegment.id}
          segmentName={selectedSegment.name}
          onClose={() => {
            setImportModalOpen(false);
            setSelectedSegment(null);
          }}
        />
      )}
    </div>
  );
}
