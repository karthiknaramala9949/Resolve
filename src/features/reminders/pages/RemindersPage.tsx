'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  BottomSheet,
  useToast,
} from '@/design-system';
import {
  Clock,
  Plus,
  Bell,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { reminderService, caseService } from '@/services';
import { Reminder, Case } from '@/lib/db/types';

export const RemindersPage: React.FC = () => {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  // New reminder form
  const [targetCaseId, setTargetCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const loadData = async () => {
    const [allReminders, allCases] = await Promise.all([
      reminderService.listReminders(),
      caseService.listCases(),
    ]);
    setReminders(allReminders);
    setCases(allCases);
    if (allCases.length > 0 && !targetCaseId) {
      setTargetCaseId(allCases[0].id);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast('Web Notifications are not supported in this browser.', 'warning');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        toast('Local notifications enabled on this device.', 'success');
        new Notification('RESOLVE-ONE', {
          body: 'Local notifications active. Reminders will notify you on this device.',
          icon: '/favicon.svg',
        });
      } else {
        toast('Notifications permission not granted. In-app inbox will be used.', 'info');
      }
    } catch {
      toast('Could not request notification permission.', 'warning');
    }
  };

  const handleToggleDone = async (id: string) => {
    const updatedState = await reminderService.toggleReminder(id);
    toast(updatedState ? 'Reminder marked as completed.' : 'Reminder reopened.', 'info');
    loadData();
  };

  const handleDelete = async (id: string) => {
    await reminderService.deleteReminder(id);
    toast('Reminder deleted.', 'info');
    loadData();
  };

  const handleAddReminder = async () => {
    if (!title.trim() || !date) {
      toast('Please enter a reminder title and due date.', 'warning');
      return;
    }

    const newReminder: Reminder = {
      id: `REM-${Date.now().toString().slice(-4)}`,
      caseId: targetCaseId,
      title,
      date,
      done: false,
      createdAt: new Date().toISOString(),
    };

    await reminderService.saveReminder(newReminder);
    toast('Reminder scheduled.', 'success');
    setIsAddModalOpen(false);
    setTitle('');
    setDate('');
    loadData();
  };

  // Smart suggestions
  const setQuickDate = (daysAhead: number, label: string) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(d.toISOString().slice(0, 10));
    setTitle(label);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
            Reminders & follow-ups
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 mt-1 font-normal">
            Track company response dates and follow-ups saved for your convenience
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {notifPermission !== 'granted' && (
            <Button
              variant="outline"
              size="md"
              onClick={requestNotificationPermission}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Enable notifications</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New reminder</span>
          </Button>
        </div>
      </div>

      {/* Honest notice on suggested reminders */}
      <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 text-xs text-steel-grey-600 font-normal">
        <span className="font-medium text-charcoal">Notice: </span>
        Follow-up dates are suggestions for your personal convenience, not legal deadlines. They are not statutory mandates.
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <EmptyState
          illustration="reminders"
          title="No pending reminders"
          description="Schedule a follow-up date to check on company response or bank statement."
          actionLabel="Add reminder"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {reminders.map((r) => {
            const targetCase = cases.find((c) => c.id === r.caseId);

            return (
              <Card
                key={r.id}
                variant="default"
                className="p-4 flex items-center justify-between gap-4 bg-white border border-steel-grey-200 hover:border-steel-grey-300 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleToggleDone(r.id)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                      r.done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-steel-grey-300 hover:border-coral'
                    }`}
                    aria-label={r.done ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {r.done && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />}
                  </button>

                  <div>
                    <h4
                      className={`text-sm font-medium ${
                        r.done
                          ? 'line-through text-steel-grey-400'
                          : 'text-charcoal'
                      }`}
                    >
                      {r.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-steel-grey-500 font-normal">
                      {targetCase && (
                        <>
                          <span className="font-mono">{targetCase.id}</span>
                          <span>•</span>
                          <span>{targetCase.company}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>Due {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 text-steel-grey-400 hover:text-coral rounded-lg hover:bg-steel-grey-50 transition-colors"
                  aria-label="Delete reminder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Reminder Modal */}
      <BottomSheet
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule follow-up reminder"
        description="Choose a date to compare records or escalate"
      >
        <div className="space-y-4">
          {cases.length > 0 && (
            <Select
              label="Related case"
              value={targetCaseId}
              onChange={(e) => setTargetCaseId(e.target.value)}
              options={cases.map((c) => ({
                value: c.id,
                label: `${c.id} · ${c.title} (${c.company})`,
              }))}
            />
          )}

          {/* Quick Smart Suggestions */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-steel-grey-600">
              Suggestions:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQuickDate(7, 'Follow up with company care on ticket status')}
                className="inline-flex items-center justify-center font-normal px-2.5 py-1.5 rounded-lg border border-steel-grey-200 bg-steel-grey-50 text-steel-grey-700 hover:border-steel-grey-300 transition-colors leading-none"
              >
                +7 Days (Customer care turnaround)
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(3, 'Verify UPI / bank statement for refund credit')}
                className="inline-flex items-center justify-center font-normal px-2.5 py-1.5 rounded-lg border border-steel-grey-200 bg-steel-grey-50 text-steel-grey-700 hover:border-steel-grey-300 transition-colors leading-none"
              >
                +3 Days (Banking settlement)
              </button>
            </div>
          </div>

          <Input
            label="Reminder action"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Check bank statement for ₹499 credit"
          />

          <Input
            label="Due date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddReminder}>
              Set reminder
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
