import { useQuery } from '@tanstack/react-query';
import { kosQuery } from '../api';

const YEAR = new Date().getFullYear();

export default function Footer() {
  const { data: kos } = useQuery(kosQuery);

  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-stone-600 sm:flex-row sm:justify-between">
        <p>
          &copy; {YEAR} {kos?.name ?? 'Kos'}
        </p>
        {kos && (
          <p>
            {kos.address}, {kos.city}
          </p>
        )}
      </div>
    </footer>
  );
}
