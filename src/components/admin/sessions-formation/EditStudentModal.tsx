import React, { useState } from 'react';
import { X, User, AlertCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';

interface EditStudentModalProps {
  student: {
    id: string;
    student_id: string;
    student_name?: string;
    student_cin?: string;
    student_email?: string;
    student_phone?: string;
    profile_image_url?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  onClose,
  onSuccess,
}) => {
  // Extraire nom et prénom du student_name
  const [nom, prenom] = (student.student_name || '').split(' ');

  const [formData, setFormData] = useState({
    nom: nom || '',
    prenom: prenom || '',
    cin: student.student_cin || '',
    email: student.student_email || '',
    phone: student.student_phone || '',
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>(
    student.profile_image_url || ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est obligatoire';
    if (!formData.cin.trim()) newErrors.cin = 'Le CIN est obligatoire';
    if (!formData.phone.trim()) newErrors.phone = 'Le téléphone est obligatoire';

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
      // Créer FormData pour supporter l'upload d'image
      const updateData = new FormData();
      updateData.append('nom', formData.nom.trim());
      updateData.append('prenom', formData.prenom.trim());
      updateData.append('cin', formData.cin.trim());
      updateData.append('email', formData.email.trim());
      updateData.append('phone', formData.phone.trim());

      if (profileImage) {
        updateData.append('profile_image', profileImage);
      }

      // Mettre à jour l'étudiant
      await apiClient.put(`/students/${student.student_id}`, updateData);

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating student:', error);
      setErrors({ submit: error.message || "Erreur lors de la mise à jour de l'étudiant" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Modifier l'étudiant</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Mettez à jour les informations de l'étudiant
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

          {/* Photo de profil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo de profil
            </label>
            <div className="flex items-center gap-4">
              {profileImagePreview && (
                <img
                  src={profileImagePreview}
                  alt="Preview"
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                />
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {profileImagePreview ? 'Changer la photo' : 'Choisir une photo'}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Nom"
                className={errors.nom ? 'border-red-300' : ''}
              />
              {errors.nom && <p className="text-xs text-red-600 mt-1">{errors.nom}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Prénom"
                className={errors.prenom ? 'border-red-300' : ''}
              />
              {errors.prenom && <p className="text-xs text-red-600 mt-1">{errors.prenom}</p>}
            </div>
          </div>

          {/* CIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CIN <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.cin}
              onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
              placeholder="CIN"
              className={errors.cin ? 'border-red-300' : ''}
            />
            {errors.cin && <p className="text-xs text-red-600 mt-1">{errors.cin}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Téléphone"
              className={errors.phone ? 'border-red-300' : ''}
            />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Mise à jour...</span>
                </div>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
