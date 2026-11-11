'use client';

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  unlockMasterKeyWithPassphrase,
  unlockMasterKeyWithRecoveryKey,
  setActiveMasterKey,
  getActiveMasterKey,
} from '@/lib/crypto/e2ee';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

interface UnlockVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}

export function UnlockVaultModal({ isOpen, onClose, onUnlocked }: UnlockVaultModalProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'passphrase' | 'recovery'>('passphrase');
  const [passphrase, setPassphrase] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUnlockWithPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passphrase.trim()) {
      setError('Please enter your passphrase or account password.');
      return;
    }

    if (!user?.encryptedMasterKey || !user?.masterKeySalt || !user?.masterKeyIv) {
      setError('No encrypted vault record found for this account.');
      return;
    }

    try {
      setIsSubmitting(true);
      const masterKey = await unlockMasterKeyWithPassphrase(
        passphrase.trim(),
        user.encryptedMasterKey,
        user.masterKeySalt,
        user.masterKeyIv
      );
      setActiveMasterKey(masterKey);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onUnlocked?.();
        onClose();
      }, 700);
    } catch {
      setError('Incorrect passphrase. Cryptographic integrity check failed (AES-GCM tag mismatch).');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockWithRecoveryKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!recoveryKey.trim()) {
      setError('Please enter your 24-character recovery key (e.g. RS-XXXX-...).');
      return;
    }

    if (!user?.recoveryWrappedMasterKey) {
      setError('No recovery key record found for this account.');
      return;
    }

    try {
      setIsSubmitting(true);
      const masterKey = await unlockMasterKeyWithRecoveryKey(
        recoveryKey.trim().toUpperCase(),
        user.recoveryWrappedMasterKey
      );
      setActiveMasterKey(masterKey);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onUnlocked?.();
        onClose();
      }, 700);
    } catch {
      setError('Invalid recovery key or corrupted recovery record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-steel-grey-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-charcoal">Unlock Document Vault</h3>
            <p className="text-xs text-steel-grey-600">
              Zero-knowledge E2EE requires your Master Key to decrypt documents.
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex gap-2 p-1 bg-steel-grey-100 rounded-xl mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setTab('passphrase'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === 'passphrase' ? 'bg-white text-charcoal shadow-sm' : 'text-steel-grey-600 hover:text-charcoal'
            }`}
          >
            Password / Passphrase
          </button>
          <button
            type="button"
            onClick={() => { setTab('recovery'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === 'recovery' ? 'bg-white text-charcoal shadow-sm' : 'text-steel-grey-600 hover:text-charcoal'
            }`}
          >
            Recovery Key
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Vault unlocked successfully! Decrypting documents...</span>
          </div>
        )}

        {tab === 'passphrase' ? (
          <form onSubmit={handleUnlockWithPassphrase} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Account Password or Vault Passphrase
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-3 py-2 text-sm border border-steel-grey-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
                disabled={isSubmitting || isSuccess}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-steel-grey-600 hover:bg-steel-grey-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="px-4 py-2 text-xs font-semibold text-white bg-coral hover:bg-coral/90 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Decrypting...' : 'Unlock Vault'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnlockWithRecoveryKey} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                24-Character Recovery Key
              </label>
              <input
                type="text"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                placeholder="RS-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-steel-grey-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
                disabled={isSubmitting || isSuccess}
                autoFocus
              />
              <p className="text-[11px] text-steel-grey-500 mt-1">
                The grouped recovery key generated when your account was created.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-steel-grey-600 hover:bg-steel-grey-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="px-4 py-2 text-xs font-semibold text-white bg-coral hover:bg-coral/90 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Verifying...' : 'Restore with Recovery Key'}</span>
                <KeyRound className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

