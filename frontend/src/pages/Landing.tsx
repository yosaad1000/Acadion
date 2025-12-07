import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingHero } from '../components/landing/LandingHero';
import { LandingFeatures } from '../components/landing/LandingFeatures';
import { LandingRoleSelection } from '../components/landing/LandingRoleSelection';
import { LandingFooter } from '../components/landing/LandingFooter';

// Placeholder for Organization Data - eventually this will come from context or props
const ORG_CONFIG = {
  name: "Your Organization Name",
  tagline: "Empowering Education Excellence",
  description: "Welcome to our digital campus. Access your classes, track attendance, and manage your academic journey with ease.",
  primaryColor: "blue", // This could drive theme colors later
  logoText: "Org"
};

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'teacher' | 'student') => {
    // Store the selected role for the login/signup process
    localStorage.setItem('selected_user_type', role);
    navigate('/login', { state: { userType: role } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 safe-area-padding transition-colors">
      <LandingHeader
        orgName={ORG_CONFIG.name}
        logoText={ORG_CONFIG.logoText}
        tagline={ORG_CONFIG.tagline}
      />

      <main className="container-responsive py-8 sm:py-12">
        <LandingHero
          orgName={ORG_CONFIG.name}
          description={ORG_CONFIG.description}
        />

        <LandingFeatures />

        <LandingRoleSelection onRoleSelect={handleRoleSelection} />

        <LandingFooter />
      </main>
    </div>
  );
};

export default Landing;