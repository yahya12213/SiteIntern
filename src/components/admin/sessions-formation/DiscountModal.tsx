import React, { useState } from 'react';
import { X, Tag, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';

interface DiscountModalProps {
  student: {
    id: string;
    student_id: string;
    student_name?: string;
    montant_total: number;
    montant_paye: number;
    discount_amount?: number;
    discount_reason?: string;
  };
  sessionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  student,
  sessionId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    discount_amount: (student.discount_amount || 0).toString(),
    discount_reason: student.discount_reason || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculer le prix original (avant remise)
  const originalPrice = parseFloat(student.montant_total?.toString() || '0') + parseFloat(student.discount_amount?.toString() || '0');

  // Calculer le nouveau prix après la remise saisie
  const newDiscountAmount = parseFloat(formData.discount_amount) || 0;
  const newTotalPrice = originalPrice - newDiscountAmount;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const discountAmount = parseFloat(formData.discount_amount);

    if (isNaN(discountAmount) || discountAmount < 0) {
      newErrors.discount_amount = 'Le montant de la remise doit être un nombre positif ou zéro';
    }

    if (discountAmount > originalPrice) {
      newErrors.discount_amount = 'La remise ne peut pas dépasser le prix original';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Mettre à jour la remise via l'API
      await apiClient.put(
        `/sessions-formation/${sessionId}/etudiants/${student.student_id}`,
        {
          discount_amount: parseFloat(formData.discount_amount),
          discount_reason: formData.discount_reason.trim() || null,
        }
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating discount:', error);
      setErrors({ submit: error.message || "Erreur lors de la mise à jour de la remise" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gérer la remise</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {student.student_name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Prix info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Prix original:</span>
              <span className="font-semibold text-gray-900">
                {originalPrice.toFixed(2)} DH
              </span>
            </div>
            {student.discount_amount && student.discount_amount > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Remise actuelle:</span>
                <span className="font-semibold text-purple-600">
                  -{student.discount_amount.toFixed(2)} DH
                </span>
              </div>
            ) : null}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Prix actuel:</span>
                <span className="text-lg font-bold text-gray-900">
                  {student.montant_total.toFixed(2)} DH
                </span>
              </div>
            </div>
          </div>

          {/* Montant de la remise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant de la remise (DH)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={originalPrice}
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                placeholder="0.00"
                className={`pl-10 ${errors.discount_amount ? 'border-red-300' : ''}`}
              />
            </div>
            {errors.discount_amount && (
              <p className="text-xs text-red-600 mt-1">{errors.discount_amount}</p>
            )}
          </div>

          {/* Raison de la remise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raison de la remise (optionnel)
            </label>
            <textarea
              value={formData.discount_reason}
              onChange={(e) => setFormData({ ...formData, discount_reason: e.target.value })}
              placeholder="Ex: Remise étudiant, Offre spéciale, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Nouveau prix aperçu */}
          {newDiscountAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">
                  Nouveau prix après remise:
                </span>
                <span className="text-xl font-bold text-green-700">
                  {newTotalPrice.toFixed(2)} DH
                </span>
              </div>
              {newDiscountAmount > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Économie de {newDiscountAmount.toFixed(2)} DH
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Application...</span>
                </div>
              ) : (
                'Appliquer'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
