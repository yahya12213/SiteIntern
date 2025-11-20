import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Target, Plus } from 'lucide-react';

const Prospects: React.FC = () => {
  return (
    <AppLayout
      title="Gestion des Prospects"
      subtitle="Suivi et conversion des leads"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Pipeline de vente</h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
            Nouveau prospect
          </button>
        </div>

        {/* Development Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Target className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-orange-900 mb-2">Module en développement</h3>
              <p className="text-orange-800">
                La gestion des prospects sera bientôt disponible. Vous pourrez gérer votre pipeline de vente et suivre vos opportunités.
              </p>
              <div className="mt-4">
                <h4 className="font-medium text-orange-900 mb-2">Fonctionnalités prévues:</h4>
                <ul className="list-disc list-inside space-y-1 text-orange-800">
                  <li>Pipeline de vente avec étapes personnalisables</li>
                  <li>Qualification des leads</li>
                  <li>Suivi des opportunités</li>
                  <li>Conversion prospect → client</li>
                  <li>Rappels et tâches associées</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Prospects;
