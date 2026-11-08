import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home, FileQuestion } from 'lucide-react';
import { Button } from '@/design-system';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-light-ground dark:bg-surface-dark-ground flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
            Page Not Found (404)
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The page you requested does not exist or has been removed from this version of RESOLVE-ONE.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="primary">
              <Home className="w-4 h-4 mr-1.5" />
              <span>Go to Home</span>
            </Button>
          </Link>
          <Link to="/app/overview">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Open My Cases</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

