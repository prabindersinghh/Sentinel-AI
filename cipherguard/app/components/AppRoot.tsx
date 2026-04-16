'use client';
import { useState } from 'react';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';

export default function AppRoot() {
  const [signedIn, setSignedIn] = useState(false);

  if (signedIn) return <Dashboard />;

  return <LandingPage onSignIn={() => setSignedIn(true)} />;
}
