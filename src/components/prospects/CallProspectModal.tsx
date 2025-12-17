// @ts-nocheck
/**
 * Modal d'appel prospect avec timer automatique
 * Permet de passer un appel et d'enregistrer les résultats
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Clock, Calendar } from 'lucide-react';
import { useProspect, useStartCall, useEndCall } from '@/hooks/useProspects';
import { toast } from '@/hooks/use-toast';

interface CallProspectModalProps {
  open: boolean;
  onClose: () => void;
  prospectId: string | null;
}

// Statuts de contact disponibles
const STATUTS_CONTACT = [
  { value: 'non contacté', label: 'Non contacté' },
  { value: 'contacté avec rdv', label: 'Contacté avec RDV' },
  { value: 'contacté sans rdv', label: 'Contacté sans RDV' },
  { value: 'contacté sans réponse', label: 'Contacté sans réponse' },
  { value: 'boîte vocale', label: 'Boîte vocale' },
  { value: 'à recontacter', label: 'À recontacter' },
  { value: 'rdv planifié', label: 'RDV planifié' },
  { value: 'inscrit', label: 'Inscrit' },
];

// Statuts qui nécessitent une date de RDV
const STATUTS_AVEC_RDV = ['contacté avec rdv', 'rdv planifié'];

export function CallProspectModal({ open, onClose, prospectId }: CallProspectModalProps) {
  const [callId, setCallId] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statutContact, setStatutContact] = useState<string>('');
  const [dateRdv, setDateRdv] = useState<string>('');
  const [heureRdv, setHeureRdv] = useState<string>('');
  const [commentaire, setCommentaire] = useState<string>('');

  const { data: prospect, isLoading } = useProspect(prospectId || '');
  const startCallMutation = useStartCall();
  const endCallMutation = useEndCall();

  // Timer automatique
  useEffect(() => {
    if (!open || !prospectId) {
      // Reset quand le modal se ferme
      setCallId(null);
      setCallStartTime(null);
      setElapsedSeconds(0);
      setStatutContact('');
      setDateRdv('');
      setHeureRdv('');
      setCommentaire('');
      return;
    }

    // Démarrer l'appel automatiquement
    if (!callStartTime) {
      startCallMutation.mutate(prospectId, {
        onSuccess: (data) => {
          setCallId(data.call_id);
          setCallStartTime(new Date());
          console.log('⏱️ Appel démarré:', data.call_id, new Date().toISOString());
        },
        onError: (error: any) => {
          toast({
            variant: 'destructive',
            title: 'Erreur',
            description: error.message || "Impossible de démarrer l'appel",
          });
          onClose();
        },
      });
    }
  }, [open, prospectId, callStartTime]);

  // Mise à jour du timer toutes les secondes
  useEffect(() => {
    if (!callStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  // Formater la durée en MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!prospectId || !statutContact) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un statut de contact',
      });
      return;
    }

    if (!callId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "L'appel n'a pas été correctement démarré",
      });
      return;
    }

    // Vérifier que les champs RDV sont remplis si nécessaire
    if (STATUTS_AVEC_RDV.includes(statutContact)) {
      if (!dateRdv || !heureRdv) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Veuillez saisir la date et l\'heure du RDV',
        });
        return;
      }
    }

    // Préparer les données avec call_id obligatoire
    const endCallData = {
      call_id: callId,
      statut_contact: statutContact,
      date_rdv: STATUTS_AVEC_RDV.includes(statutContact)
        ? `${dateRdv} ${heureRdv}:00`
        : undefined,
      commentaire: commentaire || undefined,
    };

    endCallMutation.mutate(
      { id: prospectId, data: endCallData },
      {
        onSuccess: () => {
          toast({
            title: 'Appel enregistré',
            description: `Durée: ${formatDuration(elapsedSeconds)}`,
          });
          onClose();
        },
        onError: (error: any) => {
          toast({
            variant: 'destructive',
            title: 'Erreur',
            description: error.message || "Impossible d'enregistrer l'appel",
          });
        },
      }
    );
  };

  if (isLoading || !prospect) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Appel en cours - {prospect.prenom} {prospect.nom}
            </div>
            <div className="flex items-center gap-2 text-lg font-mono bg-green-100 text-green-700 px-4 py-2 rounded">
              <Clock className="h-5 w-5" />
              {formatDuration(elapsedSeconds)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informations du prospect */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Téléphone:</span>
                <p className="font-medium">{prospect.phone_international}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Ville:</span>
                <p className="font-medium">{prospect.ville_name || 'Sans ville'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Segment:</span>
                <p className="font-medium">{prospect.segment_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Assignée à:</span>
                <p className="font-medium">{prospect.assistante_name || 'Non assigné'}</p>
              </div>
            </div>
          </div>

          {/* Résultat de l'appel */}
          <div className="space-y-2">
            <Label htmlFor="statut">Statut de contact *</Label>
            <Select value={statutContact} onValueChange={setStatutContact}>
              <SelectTrigger id="statut">
                <SelectValue placeholder="Sélectionnez le statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_CONTACT.map((statut) => (
                  <SelectItem key={statut.value} value={statut.value}>
                    {statut.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date de RDV (conditionnel) */}
          {STATUTS_AVEC_RDV.includes(statutContact) && (
            <div className="space-y-4 border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <Calendar className="h-5 w-5" />
                Planifier le RDV
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateRdv">Date du RDV *</Label>
                  <Input
                    id="dateRdv"
                    type="date"
                    value={dateRdv}
                    onChange={(e) => setDateRdv(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heureRdv">Heure du RDV *</Label>
                  <Input
                    id="heureRdv"
                    type="time"
                    value={heureRdv}
                    onChange={(e) => setHeureRdv(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Commentaire */}
          <div className="space-y-2">
            <Label htmlFor="commentaire">Commentaire</Label>
            <Textarea
              id="commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Notes sur l'appel..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={endCallMutation.isPending || !statutContact || !callId}
          >
            {endCallMutation.isPending ? 'Enregistrement...' : 'Terminer l\'appel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
