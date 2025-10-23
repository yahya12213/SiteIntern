import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Users, MapPin, FileSpreadsheet, Calculator, ClipboardCheck, FilePlus, List } from 'lucide-react';
import { Header } from '@/components/layout/Header';

const Dashboard: React.FC = () => {
  const { user, isAdmin, isGerant, logout } = useAuth();

  const adminCards = [
    {
      title: 'Gestion des Segments',
      description: 'Créer et gérer les segments de formation',
      icon: Calculator,
      link: '/admin/segments',
      color: 'bg-blue-500',
    },
    {
      title: 'Gestion des Villes',
      description: 'Gérer les villes et leur affectation',
      icon: MapPin,
      link: '/admin/cities',
      color: 'bg-green-500',
    },
    {
      title: 'Gestion des Utilisateurs',
      description: 'Créer et gérer les comptes (admin, professeur, gérant)',
      icon: Users,
      link: '/admin/users',
      color: 'bg-purple-500',
    },
    {
      title: 'Fiches de Calcul',
      description: 'Créer des templates de fiches de calcul',
      icon: FileSpreadsheet,
      link: '/admin/calculation-sheets',
      color: 'bg-orange-500',
    },
    {
      title: 'Créer des Déclarations',
      description: 'Assigner des fiches de sessions aux professeurs',
      icon: FilePlus,
      link: '/admin/create-declaration',
      color: 'bg-teal-500',
    },
    {
      title: 'Gestion des Déclarations',
      description: 'Valider et gérer les déclarations des professeurs',
      icon: ClipboardCheck,
      link: '/admin/declarations',
      color: 'bg-indigo-500',
    },
  ];

  const professorCards = [
    {
      title: 'Mes Déclarations',
      description: 'Créer et gérer mes déclarations de sessions',
      icon: FileSpreadsheet,
      link: '/professor/declarations',
      color: 'bg-blue-500',
    },
  ];

  const gerantCards = [
    {
      title: 'Créer des Déclarations',
      description: 'Assigner des fiches de sessions aux professeurs',
      icon: FilePlus,
      link: '/gerant/create-declaration',
      color: 'bg-blue-500',
    },
    {
      title: 'Mes Déclarations Créées',
      description: 'Suivre les déclarations que j\'ai assignées',
      icon: List,
      link: '/gerant/declarations',
      color: 'bg-green-500',
    },
  ];

  const cards = isAdmin ? adminCards : isGerant ? gerantCards : professorCards;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        title="Tableau de Bord"
        subtitle={`Bienvenue, ${user?.full_name} (${isAdmin() ? 'Administrateur' : isGerant() ? 'Gérant' : 'Professeur'})`}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <Link key={index} to={card.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Statistiques Rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">0</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {isAdmin ? 'Total Fiches' : isGerant ? 'Déclarations créées' : 'Mes Fiches'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">0 MAD</p>
                  <p className="text-sm text-gray-600 mt-1">Revenus Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">0 MAD</p>
                  <p className="text-sm text-gray-600 mt-1">Charges Total</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
