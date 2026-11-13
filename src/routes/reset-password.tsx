import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [
    { title: 'Vaihda salasana – Elovio' }, { name: 'description', content: 'Vaihda Elovio-tilisi salasana turvallisesti.' },
    { property: 'og:title', content: 'Vaihda salasana – Elovio' }, { property: 'og:description', content: 'Elovio-tilin salasanan vaihtaminen.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setMessage('Avaa sähköpostiisi lähetetty salasanan vaihtolinkki.'); return; }
      const { error } = await supabase.auth.updateUser({ password });
      setMessage(error ? error.message : 'Salasana vaihdettu. Voit palata sovellukseen.');
    } finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6">
    <h1 className="text-2xl font-bold text-foreground">Vaihda salasana</h1>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label>Uusi salasana<input className="mt-2 w-full rounded-md border border-input bg-card p-3" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)}/></label>
      <label>Vahvista salasana<input className="mt-2 w-full rounded-md border border-input bg-card p-3" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)}/></label>
      <Button disabled={busy || password.length < 8 || password !== confirm}>{busy ? 'Tallennetaan…' : 'Vaihda salasana'}</Button>
    </form>
    {message && <p role="status">{message}</p>}
    <Button asChild variant="outline"><a href="/">Takaisin Elovioon</a></Button>
  </main>;
}