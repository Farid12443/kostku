import { useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';

interface ReasonDialogProps {
  title: string;
  isLoading?: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

export default function ReasonDialog({ title, isLoading, onSubmit, onClose }: ReasonDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim()) onSubmit(reason.trim());
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="label" htmlFor="reason">
          Alasan (wajib)
        </label>
        <textarea id="reason" className="input" rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-danger" disabled={isLoading || !reason.trim()}>
            {isLoading ? 'Memproses...' : 'Tolak'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
