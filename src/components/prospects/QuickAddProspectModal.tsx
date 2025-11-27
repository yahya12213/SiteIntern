// @ts-nocheck
/**
 * Modal d'ajout rapide de prospect
 * Avec validation du téléphone international
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Phone, UserPlus, AlertCircle } from 'lucide-react';
import { useCreateProspect, useCountryCodes } from '@/hooks/useProspects';
import { useSegments } from '@/hooks/useSegments';
import { useCitiesBySegment } from '@/hooks/useCities';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuickAddProspectModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddProspectModal({ open, onClose }: QuickAddProspectModalProps) {
  const [segmentId, setSegmentId] = useState<string>('');
  const [villeId, setVilleId] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [nom, setNom] = useState<string>('');
  const [prenom, setPrenom] = useState<string>('');
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const [phoneError, setPhoneError] = useState<string>('');

  const { data: segments, isLoading: segmentsLoading } = useSegments();
  const { data: cities, isLoading: citiesLoading } = useCitiesBySegment(segmentId);
  const { data: countryCodes } = useCountryCodes();
  const createProspectMutation = useCreateProspect();

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSegmentId('');
      setVilleId('');
      setPhoneInput('');
      setNom('');
      setPrenom('');
      setPhoneValid(null);
      setPhoneError('');
    }
  }, [open]);

  // Validation téléphone en temps réel
  useEffect(() => {
    if (!phoneInput || phoneInput.length < 8) {
      setPhoneValid(null);
      setPhoneError('');
      return;
    }

    // Simple validation côté client (validation serveur sera faite à la soumission)
    const cleaned = phoneInput.replace(/[\s\-\(\)\.]/g, '');

    if (!/^[\+0-9]+$/.test(cleaned)) {
      setPhoneValid(false);
      setPhoneError('Le numéro contient des caractères invalides');
      return;
    }

    if (cleaned.length < 8 || cleaned.length > 15) {
      setPhoneValid(false);
      setPhoneError('Le numéro doit contenir entre 8 et 15 chiffres');
      return;
    }

    setPhoneValid(true);
    setPhoneError('');
  }, [phoneInput]);

  const handleSubmit = () => {
    // Validation
    if (!segmentId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un segment',
      });
      return;
    }

    if (!phoneInput || phoneValid === false) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez saisir un numéro de téléphone valide',
      });
      return;
    }

    // Préparer les données
    const prospectData = {
      segment_id: segmentId,
      ville_id: villeId || null, // Si vide, l'auto-assignment choisira la ville
      phone: phoneInput, // Backend attend "phone", pas "phone_international"
      nom: nom || null,
      prenom: prenom || null,
    };

    createProspectMutation.mutate(prospectData, {
      onSuccess: (data) => {
        // Le backend peut renvoyer un prospect réinjecté au lieu d'un nouveau
        const message = data.message || 'Prospect créé avec succès';

        toast({
          title: 'Succès',
          description: message,
        });
        onClose();
      },
      onError: (error: any) => {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error.message || "Impossible de créer le prospect",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter un prospect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Segment */}
          <div className="space-y-2">
            <Label htmlFor="segment">Segment *</Label>
            <Select value={segmentId} onValueChange={setSegmentId} disabled={segmentsLoading}>
              <SelectTrigger id="segment">
                <SelectValue placeholder="Sélectionnez un segment" />
              </SelectTrigger>
              <SelectContent>
                {segments?.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ville */}
          <div className="space-y-2">
            <Label htmlFor="ville">
              Ville
              <span className="text-sm text-gray-500 ml-2">(optionnel - auto-assignation)</span>
            </Label>
            <Select
              value={villeId}
              onValueChange={setVilleId}
              disabled={!segmentId || citiesLoading}
            >
              <SelectTrigger id="ville">
                <SelectValue placeholder="Sélectionnez une ville (ou laissez vide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sans ville (auto-assignation)</SelectItem>
                {cities?.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!villeId && segmentId && (
              <p className="text-xs text-blue-600">
                Le système assignera automatiquement le prospect à l'assistante avec le moins de charge
              </p>
            )}
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone international *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+212612345678 ou 0612345678"
                className={`pl-10 ${
                  phoneValid === true
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : phoneValid === false
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : ''
                }`}
              />
            </div>
            {phoneError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {phoneError}
              </p>
            )}
            {phoneValid && (
              <p className="text-sm text-green-600">Numéro valide</p>
            )}
            <p className="text-xs text-gray-500">
              Formats acceptés: +XXX... (international), 0XXX... (local Maroc)
            </p>
          </div>

          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom">
              Nom
              <span className="text-sm text-gray-500 ml-2">(optionnel)</span>
            </Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom du prospect"
            />
          </div>

          {/* Prénom */}
          <div className="space-y-2">
            <Label htmlFor="prenom">
              Prénom
              <span className="text-sm text-gray-500 ml-2">(optionnel)</span>
            </Label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Prénom du prospect"
            />
          </div>

          {/* Info pays supportés */}
          {countryCodes && countryCodes.length > 0 && (
            <Alert>
              <AlertDescription className="text-xs">
                {countryCodes.length} pays supportés pour la validation internationale
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createProspectMutation.isPending || !segmentId || phoneValid === false}
          >
            {createProspectMutation.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
