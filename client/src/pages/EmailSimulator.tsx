import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Mail, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const EmailSimulator: React.FC = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState('student@university.edu');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessTicketId(null);
    setIsSubmitting(true);

    try {
      const res = await api.emails.inbound({
        from,
        subject: subject.trim() || '(No Subject)',
        text: body,
      });

      setSuccessTicketId(res.ticketId);
      setSubject('');
      setBody('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to simulate inbound email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-violet-400" />
            Inbound Email Simulator
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Simulate a student sending an email to the support inbox to verify automated ticket creation and AI replies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Compose Card */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            New Message
          </h3>

          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successTicketId && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-4 rounded-xl text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Email Delivered & Ticket Created!</span>
              </div>
              <p className="text-slate-400 text-xs">
                The email was successfully parsed and converted. You can view the ticket details or check the ticket queue.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => navigate(`/dashboard/tickets/${successTicketId}`)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-all cursor-pointer"
                >
                  View Ticket
                </button>
                <button
                  onClick={() => navigate('/dashboard/tickets')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                >
                  Go to Queue
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">From (Student Email)</label>
                <input
                  type="email"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:ring-violet-500/25 focus:border-violet-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 transition-all"
                  placeholder="e.g. student@college.edu"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">To (Support Inbox)</label>
                <input
                  type="text"
                  disabled
                  value="support@helpdesk.edu"
                  className="w-full h-10 px-3 bg-slate-950/60 border border-slate-800/40 text-slate-500 text-sm rounded-xl focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:ring-violet-500/25 focus:border-violet-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 transition-all"
                placeholder="e.g. Password Reset Request or [Ticket #101] Reopened Inquiry"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Message Body</label>
              <textarea
                required
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-4 bg-slate-950 border border-slate-800 focus:ring-violet-500/25 focus:border-violet-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 transition-all resize-none"
                placeholder="Compose your email text here..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Delivering...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info Card */}
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl h-fit space-y-4">
          <h4 className="font-bold text-white text-sm">Simulator Instructions</h4>
          <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
            <p>
              <strong>1. Create New Ticket:</strong> Send a message with any subject. It will automatically create a new ticket in the system.
            </p>
            <p>
              <strong>2. Threading / Replies:</strong> To reply to an existing ticket, include the ticket number in the subject line formatted like <code>[Ticket #NUMBER]</code> (e.g., <code>[Ticket #3] Wifi connection issue</code>).
            </p>
            <p>
              <strong>3. AI Inbound Processing:</strong> The backend automatically runs PII redaction and classifies the ticket. If the AI is highly confident (e.g. regarding WiFi or portal password reset queries), it will auto-reply and mark the ticket resolved.
            </p>
            <p>
              <strong>4. SMTP Integration:</strong> In addition to this simulator, the server runs a real local SMTP listener on port <code>2525</code>. You can send raw emails from any local SMTP tool or client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
