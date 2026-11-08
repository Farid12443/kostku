import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  danger,
  isLoading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-stone-700">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Batal
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          disabled={isLoading}
          onClick={onConfirm}
        >
          {isLoading ? 'Memproses...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
