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
  BellRing,
  Sparkles,
} from 'lucide-react';
import { reminderRepository, caseRepository } from '@/lib/db/repositories';
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
      reminderRepository.getAll(),
      caseRepository.getAll(),
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
    const updatedState = await reminderRepository.toggleDone(id);
    toast(updatedState ? 'Reminder marked as completed.' : 'Reminder reopened.', 'info');
    loadData();
  };

  const handleDelete = async (id: string) => {
    await reminderRepository.delete(id);
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

    await reminderRepository.save(newReminder);
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
            Reminders & Follow-Ups
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Track company response windows and suggested follow-ups. Stored on-device.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {notifPermission !== 'granted' && (
            <Button
              variant="outline"
              size="md"
              onClick={requestNotificationPermission}
            >
              <Bell className="w-4 h-4 mr-1.5" />
              <span>Enable Notifications</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Reminder</span>
          </Button>
        </div>
      </div>

      {/* Honest notice on suggested reminders */}
      <div className="p-4 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">Notice: </span>
        Follow-up dates are suggested follow-ups for your convenience, not legal deadlines. They are not attributed to any law, regulation, or official guideline.
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <EmptyState
          title="No pending reminders"
          description="Schedule a follow-up date to check on company response or bank statement."
          actionLabel="Add Reminder"
          onAction={() => setIsAddModalOpen(true)}
          illustration="reminders"
        />
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => {
            const targetCase = cases.find((c) => c.id === r.caseId);

            return (
              <Card
                key={r.id}
                variant="default"
                className="p-4 flex items-center justify-between gap-4 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleToggleDone(r.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                      r.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-neutral-300 dark:border-neutral-700 hover:border-brand-500'
                    }`}
                    aria-label={r.done ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {r.done && <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
                  </button>

                  <div>
                    <h4
                      className={`text-base font-medium ${
                        r.done
                          ? 'line-through text-neutral-400 dark:text-neutral-600'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {r.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
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
                  className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
        title="Schedule Follow-Up Reminder"
        description="Choose a date to compare records or escalate."
      >
        <div className="space-y-4">
          {cases.length > 0 && (
            <Select
              label="Related Case"
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
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Smart Suggestions:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQuickDate(7, 'Follow up with company care on ticket status')}
                className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-surface-light-subtle dark:bg-surface-dark-subtle hover:border-brand-300"
              >
                +7 Days (Customer care turnaround)
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(3, 'Verify UPI / bank statement for refund credit')}
                className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-surface-light-subtle dark:bg-surface-dark-subtle hover:border-brand-300"
              >
                +3 Days (Banking settlement)
              </button>
            </div>
          </div>

          <Input
            label="Reminder Action"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Check bank statement for ₹499 credit"
          />

          <Input
            label="Due Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddReminder}>
              Set Reminder
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
